import { BaseMessage } from './BaseMessage';

/**
 * Represents a system message that provides instructions to the AI
 */
export class SystemMessage extends BaseMessage {
  role: 'system' = 'system';

  constructor(content: string, name?: string, metadata?: Record<string, unknown>) {
    super(content, name, metadata);
  }
}
