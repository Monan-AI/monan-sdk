import { BaseMessage } from './BaseMessage';

/**
 * Represents a message from a human user
 */
export class HumanMessage extends BaseMessage {
  role: 'user' = 'user';

  constructor(content: string, name?: string, metadata?: Record<string, unknown>) {
    super(content, name, metadata);
  }
}
