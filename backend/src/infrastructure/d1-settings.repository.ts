import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { settings } from "../persistence/schema.js";
import type { SettingsRepository } from "./settings.repository.js";

export class D1SettingsRepository implements SettingsRepository {
  private db;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async get(key: string): Promise<string | null> {
    const row = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .get();
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  }
}
