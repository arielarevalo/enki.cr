import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { demos, demoAgents } from "../persistence/schema.js";
import type { DemoRepository } from "./demo-repository.js";
import type { Demo } from "./demo.types.js";

export class D1DemoRepository implements DemoRepository {
  private db;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async list(): Promise<Demo[]> {
    return this.db.select().from(demos).all();
  }

  async findById(id: string): Promise<Demo | null> {
    const row = await this.db.select().from(demos).where(eq(demos.id, id)).get();
    return row ?? null;
  }

  async create(demo: Omit<Demo, "createdAt">): Promise<void> {
    await this.db.insert(demos).values({
      id: demo.id,
      name: demo.name,
      description: demo.description,
      activeAgent: demo.activeAgent,
      createdAt: new Date().toISOString(),
    }).run();
  }

  async update(id: string, fields: { name?: string; description?: string }): Promise<void> {
    await this.db.update(demos).set(fields).where(eq(demos.id, id)).run();
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(demoAgents).where(eq(demoAgents.demoId, id)).run();
    await this.db.delete(demos).where(eq(demos.id, id)).run();
  }

  async setActiveAgent(demoId: string, agentName: string | null): Promise<void> {
    await this.db.update(demos).set({ activeAgent: agentName }).where(eq(demos.id, demoId)).run();
  }

  async getActiveAgent(demoId: string): Promise<string | null> {
    const row = await this.db.select({ activeAgent: demos.activeAgent }).from(demos).where(eq(demos.id, demoId)).get();
    return row?.activeAgent ?? null;
  }

  async assignAgent(demoId: string, agentName: string): Promise<void> {
    await this.db.insert(demoAgents).values({ agentName, demoId }).run();
  }

  async unassignAgent(agentName: string): Promise<void> {
    await this.db.delete(demoAgents).where(eq(demoAgents.agentName, agentName)).run();
  }

  async getAgentNames(demoId: string): Promise<string[]> {
    const rows = await this.db.select({ agentName: demoAgents.agentName }).from(demoAgents).where(eq(demoAgents.demoId, demoId)).all();
    return rows.map((r) => r.agentName);
  }

  async getDemoForAgent(agentName: string): Promise<string | null> {
    const row = await this.db.select({ demoId: demoAgents.demoId }).from(demoAgents).where(eq(demoAgents.agentName, agentName)).get();
    return row?.demoId ?? null;
  }
}
