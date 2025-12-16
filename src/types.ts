export interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
}

export interface AgentReActConfig extends AgentConfig {
  maxRetries?: number;
  enableReAct?: boolean;
}

/**
 * ReAct Pattern Types
 * Reasoning + Acting for autonomous tool usage
 */
export interface ReActThought {
  thinking: string;
  toolName?: string;
  toolInput?: unknown;
}

export interface ReActObservation {
  toolName: string;
  result: unknown;
  error?: string;
}

export interface ReActStep {
  thought: ReActThought;
  observation?: ReActObservation;
  retryCount?: number;
}

// Mock interface for the vector store (to be implemented later in the memory module)
export interface IVectorStore {
  search(query: string, limit?: number): Promise<string[]>;
}

export interface AgentOptions {
  name: string;
  model: string;
  description: string;
  config?: AgentReActConfig;
  
  // System Prompt
  systemPrompt?: string;
  
  // Cloud & Auth
  openRouterToken?: string;
  
  // Privacy
  maskPII?: boolean;
  
  // Orchestration
  tools?: any[];
  knowledgeBase?: IVectorStore;

  // ReAct Configuration
  maxRetries?: number;
  enableReAct?: boolean;
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