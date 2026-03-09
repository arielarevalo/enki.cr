export interface Demo {
  id: string;
  name: string;
  description: string;
  activeAgent: string | null;
  createdAt: string;
}

export interface DemoAgent {
  agentName: string;
  demoId: string;
}
