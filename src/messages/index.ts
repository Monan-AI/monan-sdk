export { BaseMessage } from './BaseMessage';
export { HumanMessage } from './HumanMessage';
export { AIMessage } from './AIMessage';
export { ToolMessage, type ToolResult } from './ToolMessage';
export { SystemMessage } from './SystemMessage';

export type MessageType = 'system' | 'user' | 'assistant' | 'tool';
