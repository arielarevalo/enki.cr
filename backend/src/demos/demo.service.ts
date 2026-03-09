import type { DemoRepository } from "./demo-repository.js";
import type { AgentProvider } from "../agents/agent-provider.js";
import type { Demo } from "./demo.types.js";

export class DemoService {
  constructor(
    private demoRepository: DemoRepository,
    private agentProvider: AgentProvider,
  ) {}

  async listDemos(): Promise<Demo[]> {
    return this.demoRepository.list();
  }

  async getDemo(demoId: string): Promise<Demo> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);
    return demo;
  }

  async createDemo(id: string, name: string, description: string): Promise<void> {
    await this.demoRepository.create({ id, name, description, activeAgent: null });
  }

  async updateDemo(demoId: string, fields: { name?: string; description?: string }): Promise<void> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);
    await this.demoRepository.update(demoId, fields);
  }

  async deleteDemo(demoId: string): Promise<void> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);
    await this.demoRepository.remove(demoId);
  }

  async assignAgent(demoId: string, agentName: string): Promise<void> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);

    const agents = await this.agentProvider.list();
    if (!agents.some((a) => a.name === agentName)) {
      throw new AgentNotFoundError(agentName);
    }

    const existingDemo = await this.demoRepository.getDemoForAgent(agentName);
    if (existingDemo && existingDemo !== demoId) {
      throw new AgentAlreadyAssignedError(agentName, existingDemo);
    }

    await this.demoRepository.assignAgent(demoId, agentName);
  }

  async unassignAgent(demoId: string, agentName: string): Promise<void> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);

    // If this agent was the active agent, clear it
    if (demo.activeAgent === agentName) {
      await this.demoRepository.setActiveAgent(demoId, null);
    }

    await this.demoRepository.unassignAgent(agentName);
  }

  async setActiveAgent(demoId: string, agentName: string): Promise<void> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);

    const assignedAgents = await this.demoRepository.getAgentNames(demoId);
    if (!assignedAgents.includes(agentName)) {
      throw new AgentNotAssignedError(agentName, demoId);
    }

    await this.demoRepository.setActiveAgent(demoId, agentName);
  }

  async getActiveAgent(demoId: string): Promise<string | null> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);
    return demo.activeAgent;
  }

  async getAgentNames(demoId: string): Promise<string[]> {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) throw new DemoNotFoundError(demoId);
    return this.demoRepository.getAgentNames(demoId);
  }
}

export class DemoNotFoundError extends Error {
  constructor(demoId: string) {
    super(`Demo not found: ${demoId}`);
    this.name = "DemoNotFoundError";
  }
}

export class AgentNotFoundError extends Error {
  constructor(agentName: string) {
    super(`Agent not found: ${agentName}`);
    this.name = "AgentNotFoundError";
  }
}

export class AgentAlreadyAssignedError extends Error {
  constructor(agentName: string, demoId: string) {
    super(`Agent ${agentName} is already assigned to demo ${demoId}`);
    this.name = "AgentAlreadyAssignedError";
  }
}

export class AgentNotAssignedError extends Error {
  constructor(agentName: string, demoId: string) {
    super(`Agent ${agentName} is not assigned to demo ${demoId}`);
    this.name = "AgentNotAssignedError";
  }
}
