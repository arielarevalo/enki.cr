import type {
  ApiKey,
  DataStore,
  NewApiKey,
} from "../abstractions/data-store.js";

export class D1DataStore implements DataStore {
  constructor(private db: D1Database) {}

  async findKeyByHash(hash: string): Promise<ApiKey | null> {
    const row = await this.db
      .prepare(
        "SELECT id, key_hash, key_prefix, type, created_at, revoked_at FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL",
      )
      .bind(hash)
      .first<ApiKey>();
    return row ?? null;
  }

  async findKeyById(id: string): Promise<ApiKey | null> {
    const row = await this.db
      .prepare(
        "SELECT id, key_hash, key_prefix, type, created_at, revoked_at FROM api_keys WHERE id = ?",
      )
      .bind(id)
      .first<ApiKey>();
    return row ?? null;
  }

  async createKey(key: NewApiKey): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO api_keys (id, key_hash, key_prefix, type, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        key.id,
        key.key_hash,
        key.key_prefix,
        key.type,
        new Date().toISOString(),
      )
      .run();
  }

  async listKeys(): Promise<ApiKey[]> {
    const result = await this.db
      .prepare(
        "SELECT id, key_hash, key_prefix, type, created_at, revoked_at FROM api_keys ORDER BY created_at DESC",
      )
      .all<ApiKey>();
    return result.results;
  }

  async revokeKey(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), id)
      .run();
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      )
      .bind(key, value, now)
      .run();
  }
}
