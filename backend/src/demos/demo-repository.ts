import type { Demo } from "./demo.types.js";

export interface DemoRepository {
  list(): Promise<Demo[]>;
  findById(id: string): Promise<Demo | null>;
  create(demo: Omit<Demo, "createdAt">): Promise<void>;
  update(id: string, fields: { name?: string; description?: string }): Promise<void>;
  remove(id: string): Promise<void>;
  setActiveAgent(demoId: string, agentName: string | null): Promise<void>;
  getActiveAgent(demoId: string): Promise<string | null>;
  assignAgent(demoId: string, agentName: string): Promise<void>;
  unassignAgent(agentName: string): Promise<void>;
  getAgentNames(demoId: string): Promise<string[]>;
  getDemoForAgent(agentName: string): Promise<string | null>;
}
