export interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
}

// Mock interface for the vector store (to be implemented later in the memory module)
export interface IVectorStore {
  search(query: string, limit?: number): Promise<string[]>;
}

export interface AgentOptions {
  name: string;
  model: string;
  description: string;
  config?: AgentConfig;
  
  // Cloud & Auth
  openRouterToken?: string;
  
  // Privacy
  maskPII?: boolean;
  
  // Orchestration
  tools?: any[];
  knowledgeBase?: IVectorStore;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: { 
    tokens: number 
  };
}