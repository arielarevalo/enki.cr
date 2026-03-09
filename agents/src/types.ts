export interface AgentState {
  stage?: string;
  progress?: number;
}

export interface InputItem {
  type: string;
  text?: string;
}

export interface AgentRequestBody {
  input?: InputItem[];
  stream?: boolean;
  text?: { format?: { type?: string } };
}
