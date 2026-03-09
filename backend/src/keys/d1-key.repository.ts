import { drizzle } from "drizzle-orm/d1";
import { eq, isNull, desc } from "drizzle-orm";
import { apiKeys } from "../persistence/schema.js";
import type { KeyRepository } from "./key-repository.js";
import type { ApiKey, NewApiKey } from "./key.types.js";

export class D1KeyRepository implements KeyRepository {
  private db;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    const row = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash))
      .get();
    if (!row || row.revokedAt !== null) return null;
    return row;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const row = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .get();
    return row ?? null;
  }

  async create(key: NewApiKey): Promise<void> {
    await this.db
      .insert(apiKeys)
      .values({
        id: key.id,
        keyHash: key.keyHash,
        keyPrefix: key.keyPrefix,
        type: key.type,
        createdAt: new Date().toISOString(),
      })
      .run();
  }

  async list(): Promise<ApiKey[]> {
    return this.db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt))
      .all();
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, id))
      .run();
  }
}
