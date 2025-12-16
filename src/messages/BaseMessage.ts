/**
 * Base class for all message types
 * Provides common functionality and typing for chat messages
 */
export abstract class BaseMessage {
  abstract role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;

  constructor(content: string, name?: string, metadata?: Record<string, unknown>) {
    this.content = content;
    this.name = name;
    this.metadata = metadata;
  }

  /**
   * Converts the message to a plain object format
   * Used for API calls to Ollama and OpenRouter
   */
  toJSON() {
    const obj: any = {
      role: this.role,
      content: this.content,
    };

    if (this.name) {
      obj.name = this.name;
    }

    return obj;
  }

  /**
   * Gets the message content as a string
   */
  toString(): string {
    return this.content;
  }
}
