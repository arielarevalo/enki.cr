import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  keyHash: text("key_hash").unique().notNull(),
  keyPrefix: text("key_prefix").notNull(),
  type: text("type", { enum: ["admin", "client"] }).notNull(),
  createdAt: text("created_at").notNull(),
  revokedAt: text("revoked_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const demos = sqliteTable("demos", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  activeAgent: text("active_agent"),
  createdAt: text("created_at").notNull(),
});

export const demoAgents = sqliteTable("demo_agents", {
  agentName: text("agent_name").primaryKey(),
  demoId: text("demo_id").notNull(),
});
