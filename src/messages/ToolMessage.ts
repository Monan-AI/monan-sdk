import { BaseMessage } from './BaseMessage';

export interface ToolResult {
  toolName: string;
  result?: unknown;
  error?: string;
}

/**
 * Represents a message containing results from a tool execution
 */
export class ToolMessage extends BaseMessage {
  role: 'tool' = 'tool';
  toolName: string;
  result?: unknown;
  error?: string;

  constructor(
    toolName: string,
    result?: unknown,
    error?: string,
    name?: string,
    metadata?: Record<string, unknown>
  ) {
    const content = error 
      ? `Tool Error: ${error}`
      : `Tool Result: ${JSON.stringify(result)}`;
    
    super(content, name, metadata);
    this.toolName = toolName;
    this.result = result;
    this.error = error;
  }

  /**
   * Converts the message to a plain object format
   * Includes tool-specific metadata
   */
  override toJSON() {
    const obj = super.toJSON();
    obj.toolName = this.toolName;
    if (this.result !== undefined) {
      obj.result = this.result;
    }
    if (this.error) {
      obj.error = this.error;
    }
    return obj;
  }
}
