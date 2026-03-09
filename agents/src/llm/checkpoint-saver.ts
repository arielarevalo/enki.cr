import type { RunnableConfig } from "@langchain/core/runnables";
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointTuple,
  type CheckpointListOptions,
  type ChannelVersions,
  type PendingWrite,
} from "@langchain/langgraph-checkpoint";
import type { CheckpointMetadata } from "@langchain/langgraph-checkpoint";

type SqlTagFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => unknown[];

/**
 * Bridges LangGraph checkpointing with the Cloudflare Agent SDK's `this.sql`.
 * Stores checkpoint data in DO-backed SQLite via the tagged template SQL API.
 */
export class AgentSqlCheckpointSaver extends BaseCheckpointSaver {
  private readonly sql: SqlTagFn;

  constructor(sql: SqlTagFn) {
    super();
    this.sql = sql;
  }

  async setup(): Promise<void> {
    this.sql`
      CREATE TABLE IF NOT EXISTS lg_checkpoints (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        parent_checkpoint_id TEXT,
        type TEXT,
        checkpoint TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS lg_writes (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        channel TEXT NOT NULL,
        type TEXT,
        value TEXT NOT NULL,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
      )
    `;
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs =
      (config.configurable?.checkpoint_ns as string) ?? "";
    const checkpointId = config.configurable?.checkpoint_id as
      | string
      | undefined;

    let rows: Record<string, unknown>[];

    if (checkpointId) {
      rows = this.sql`
        SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM lg_checkpoints
        WHERE thread_id = ${threadId}
          AND checkpoint_ns = ${checkpointNs}
          AND checkpoint_id = ${checkpointId}
      ` as Record<string, unknown>[];
    } else {
      rows = this.sql`
        SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM lg_checkpoints
        WHERE thread_id = ${threadId}
          AND checkpoint_ns = ${checkpointNs}
        ORDER BY checkpoint_id DESC
        LIMIT 1
      ` as Record<string, unknown>[];
    }

    if (!rows || rows.length === 0) return undefined;

    const row = rows[0];
    const cpId = row.checkpoint_id as string;

    const writeRows = this.sql`
      SELECT task_id, channel, value
      FROM lg_writes
      WHERE thread_id = ${threadId}
        AND checkpoint_ns = ${checkpointNs}
        AND checkpoint_id = ${cpId}
      ORDER BY task_id, idx
    ` as Record<string, unknown>[];

    const pendingWrites: [string, string, unknown][] = (writeRows ?? []).map(
      (w) => [
        w.task_id as string,
        w.channel as string,
        JSON.parse(w.value as string),
      ],
    );

    const checkpoint = JSON.parse(row.checkpoint as string) as Checkpoint;
    const metadata = JSON.parse(
      row.metadata as string,
    ) as CheckpointMetadata;

    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: cpId,
        },
      },
      checkpoint,
      metadata,
      parentConfig: row.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: threadId,
              checkpoint_ns: checkpointNs,
              checkpoint_id: row.parent_checkpoint_id as string,
            },
          }
        : undefined,
      pendingWrites,
    };
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs =
      (config.configurable?.checkpoint_ns as string) ?? "";
    const limit = options?.limit ?? 100;

    const rows = (
      options?.before?.configurable?.checkpoint_id
        ? this.sql`
        SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM lg_checkpoints
        WHERE thread_id = ${threadId}
          AND checkpoint_ns = ${checkpointNs}
          AND checkpoint_id < ${options.before.configurable.checkpoint_id}
        ORDER BY checkpoint_id DESC
        LIMIT ${limit}
      `
        : this.sql`
        SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM lg_checkpoints
        WHERE thread_id = ${threadId}
          AND checkpoint_ns = ${checkpointNs}
        ORDER BY checkpoint_id DESC
        LIMIT ${limit}
      `
    ) as Record<string, unknown>[];

    for (const row of rows ?? []) {
      yield {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: row.checkpoint_id as string,
          },
        },
        checkpoint: JSON.parse(row.checkpoint as string) as Checkpoint,
        metadata: JSON.parse(
          row.metadata as string,
        ) as CheckpointMetadata,
        parentConfig: row.parent_checkpoint_id
          ? {
              configurable: {
                thread_id: threadId,
                checkpoint_ns: checkpointNs,
                checkpoint_id: row.parent_checkpoint_id as string,
              },
            }
          : undefined,
      };
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs =
      (config.configurable?.checkpoint_ns as string) ?? "";
    const parentCheckpointId =
      (config.configurable?.checkpoint_id as string) ?? null;

    this.sql`
      INSERT OR REPLACE INTO lg_checkpoints
        (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata)
      VALUES (
        ${threadId},
        ${checkpointNs},
        ${checkpoint.id},
        ${parentCheckpointId},
        ${"json"},
        ${JSON.stringify(checkpoint)},
        ${JSON.stringify(metadata)}
      )
    `;

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs =
      (config.configurable?.checkpoint_ns as string) ?? "";
    const checkpointId = config.configurable?.checkpoint_id as string;

    for (let idx = 0; idx < writes.length; idx++) {
      const [channel, value] = writes[idx];
      this.sql`
        INSERT OR REPLACE INTO lg_writes
          (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, value)
        VALUES (
          ${threadId},
          ${checkpointNs},
          ${checkpointId},
          ${taskId},
          ${idx},
          ${channel},
          ${"json"},
          ${JSON.stringify(value)}
        )
      `;
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    this.sql`DELETE FROM lg_checkpoints WHERE thread_id = ${threadId}`;
    this.sql`DELETE FROM lg_writes WHERE thread_id = ${threadId}`;
  }
}
