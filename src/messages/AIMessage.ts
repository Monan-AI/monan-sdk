import { BaseMessage } from './BaseMessage';

/**
 * Represents a message from the AI assistant
 */
export class AIMessage extends BaseMessage {
  role: 'assistant' = 'assistant';
  toolCalls?: Array<{
    toolName: string;
    toolInput: unknown;
  }>;

  constructor(
    content: string,
    toolCalls?: Array<{ toolName: string; toolInput: unknown }>,
    name?: string,
    metadata?: Record<string, unknown>
  ) {
    super(content, name, metadata);
    this.toolCalls = toolCalls;
  }

  /**
   * Converts the message to a plain object format
   * Includes tool calls if present
   */
  override toJSON() {
    const obj = super.toJSON();
    if (this.toolCalls && this.toolCalls.length > 0) {
      obj.toolCalls = this.toolCalls;
    }
    return obj;
  }
}
