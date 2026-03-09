import { describe, it, expect, beforeEach } from "vitest";
import { AgentSqlCheckpointSaver } from "../../../src/llm/checkpoint-saver.js";
import type { Checkpoint } from "@langchain/langgraph-checkpoint";
import type { CheckpointMetadata } from "@langchain/langgraph-checkpoint";

function makeCheckpoint(id: string, ts: string): Checkpoint {
  return {
    v: 4,
    id,
    ts,
    channel_values: {},
    channel_versions: {},
    versions_seen: {},
  };
}

function makeMetadata(step: number): CheckpointMetadata {
  return { source: "loop", step, parents: {} };
}

/**
 * In-memory SQL mock that simulates the Agent SDK's this.sql tagged template API.
 */
function createMockSql() {
  const checkpoints = new Map<string, Record<string, unknown>>();
  const writes = new Map<string, Record<string, unknown>>();

  function extractValues(
    strings: TemplateStringsArray,
    values: unknown[],
  ): { sql: string; params: unknown[] } {
    let sql = "";
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) sql += "?";
    }
    return { sql: sql.trim(), params: values };
  }

  return function sql(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): unknown[] {
    const { sql: query, params } = extractValues(strings, values);

    if (query.includes("CREATE TABLE")) {
      return [];
    }

    if (query.includes("DELETE FROM lg_checkpoints")) {
      const threadId = params[0] as string;
      for (const key of [...checkpoints.keys()]) {
        if (key.startsWith(`${threadId}:`)) checkpoints.delete(key);
      }
      return [];
    }

    if (query.includes("DELETE FROM lg_writes")) {
      const threadId = params[0] as string;
      for (const key of [...writes.keys()]) {
        if (key.startsWith(`${threadId}:`)) writes.delete(key);
      }
      return [];
    }

    if (query.includes("INSERT OR REPLACE INTO lg_checkpoints")) {
      const key = `${params[0]}:${params[1]}:${params[2]}`;
      checkpoints.set(key, {
        thread_id: params[0],
        checkpoint_ns: params[1],
        checkpoint_id: params[2],
        parent_checkpoint_id: params[3],
        type: params[4],
        checkpoint: params[5],
        metadata: params[6],
      });
      return [];
    }

    if (query.includes("INSERT OR REPLACE INTO lg_writes")) {
      const key = `${params[0]}:${params[1]}:${params[2]}:${params[3]}:${params[4]}`;
      writes.set(key, {
        thread_id: params[0],
        checkpoint_ns: params[1],
        checkpoint_id: params[2],
        task_id: params[3],
        idx: params[4],
        channel: params[5],
        type: params[6],
        value: params[7],
      });
      return [];
    }

    if (
      query.includes("FROM lg_checkpoints") &&
      query.includes("checkpoint_id = ?") &&
      !query.includes("ORDER BY")
    ) {
      const threadId = params[0] as string;
      const ns = params[1] as string;
      const cpId = params[2] as string;
      const key = `${threadId}:${ns}:${cpId}`;
      const row = checkpoints.get(key);
      return row ? [row] : [];
    }

    if (
      query.includes("FROM lg_checkpoints") &&
      query.includes("ORDER BY")
    ) {
      const threadId = params[0] as string;
      const ns = params[1] as string;
      const results: Record<string, unknown>[] = [];
      for (const [key, val] of checkpoints) {
        if (key.startsWith(`${threadId}:${ns}:`)) {
          results.push(val);
        }
      }
      results.sort((a, b) =>
        (b.checkpoint_id as string).localeCompare(a.checkpoint_id as string),
      );
      // LIMIT may be a literal (getTuple uses LIMIT 1) or a param (list uses LIMIT ${limit})
      const limitMatch = query.match(/LIMIT\s+(\d+)/);
      const limitFromParam = params.length > 2 ? (params[params.length - 1] as number) : undefined;
      const limit = limitFromParam ?? (limitMatch ? parseInt(limitMatch[1]) : 100);
      return results.slice(0, limit);
    }

    if (query.includes("FROM lg_writes")) {
      const threadId = params[0] as string;
      const ns = params[1] as string;
      const cpId = params[2] as string;
      const results: Record<string, unknown>[] = [];
      for (const [key, val] of writes) {
        if (key.startsWith(`${threadId}:${ns}:${cpId}:`)) {
          results.push(val);
        }
      }
      return results;
    }

    return [];
  };
}

describe("AgentSqlCheckpointSaver", () => {
  let saver: AgentSqlCheckpointSaver;

  beforeEach(async () => {
    const sql = createMockSql();
    saver = new AgentSqlCheckpointSaver(sql);
    await saver.setup();
  });

  it("setup creates tables without error", async () => {
    expect(saver).toBeDefined();
  });

  it("put stores and getTuple retrieves a checkpoint", async () => {
    const config = {
      configurable: {
        thread_id: "thread-1",
        checkpoint_ns: "",
        checkpoint_id: undefined as string | undefined,
      },
    };

    const checkpoint = makeCheckpoint("cp-001", "2024-01-01T00:00:00Z");

    const returnedConfig = await saver.put(
      config,
      checkpoint,
      makeMetadata(1),
      {},
    );

    expect(returnedConfig.configurable?.checkpoint_id).toBe("cp-001");

    const tuple = await saver.getTuple({
      configurable: {
        thread_id: "thread-1",
        checkpoint_ns: "",
        checkpoint_id: "cp-001",
      },
    });

    expect(tuple).toBeDefined();
    expect(tuple?.checkpoint.id).toBe("cp-001");
  });

  it("getTuple returns undefined for non-existent checkpoint", async () => {
    const tuple = await saver.getTuple({
      configurable: {
        thread_id: "nonexistent",
        checkpoint_ns: "",
        checkpoint_id: "cp-999",
      },
    });
    expect(tuple).toBeUndefined();
  });

  it("getTuple returns latest checkpoint when no checkpoint_id specified", async () => {
    const config = {
      configurable: { thread_id: "t1", checkpoint_ns: "" },
    };

    await saver.put(
      config,
      makeCheckpoint("cp-001", "2024-01-01T00:00:00Z"),
      makeMetadata(1),
      {},
    );
    await saver.put(
      { configurable: { ...config.configurable, checkpoint_id: "cp-001" } },
      makeCheckpoint("cp-002", "2024-01-01T00:01:00Z"),
      makeMetadata(2),
      {},
    );

    const tuple = await saver.getTuple(config);
    expect(tuple?.checkpoint.id).toBe("cp-002");
  });

  it("putWrites stores and retrieves pending writes", async () => {
    const config = {
      configurable: {
        thread_id: "t1",
        checkpoint_ns: "",
        checkpoint_id: "cp-001",
      },
    };

    await saver.put(
      { configurable: { thread_id: "t1", checkpoint_ns: "" } },
      makeCheckpoint("cp-001", "2024-01-01T00:00:00Z"),
      makeMetadata(1),
      {},
    );

    await saver.putWrites(
      config,
      [
        ["messages", { content: "hello" }],
        ["stage", "research"],
      ],
      "task-1",
    );

    const tuple = await saver.getTuple(config);
    expect(tuple?.pendingWrites).toHaveLength(2);
    expect(tuple?.pendingWrites?.[0]).toEqual([
      "task-1",
      "messages",
      { content: "hello" },
    ]);
  });

  it("list yields checkpoints in reverse order", async () => {
    const config = {
      configurable: { thread_id: "t1", checkpoint_ns: "" },
    };

    for (let i = 1; i <= 3; i++) {
      await saver.put(
        {
          configurable: {
            ...config.configurable,
            checkpoint_id: i > 1 ? `cp-00${i - 1}` : undefined,
          },
        },
        makeCheckpoint(`cp-00${i}`, `2024-01-0${i}T00:00:00Z`),
        makeMetadata(i),
        {},
      );
    }

    const results = [];
    for await (const tuple of saver.list(config)) {
      results.push(tuple);
    }
    expect(results).toHaveLength(3);
    expect(results[0].checkpoint.id).toBe("cp-003");
    expect(results[2].checkpoint.id).toBe("cp-001");
  });

  it("deleteThread removes all checkpoints and writes", async () => {
    await saver.put(
      { configurable: { thread_id: "t1", checkpoint_ns: "" } },
      makeCheckpoint("cp-001", "2024-01-01T00:00:00Z"),
      makeMetadata(1),
      {},
    );

    await saver.deleteThread("t1");

    const tuple = await saver.getTuple({
      configurable: { thread_id: "t1", checkpoint_ns: "" },
    });
    expect(tuple).toBeUndefined();
  });
});
