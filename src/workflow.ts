import { Agent } from './agent';
import { Router } from './router';
import type { Message, ChatResponse } from './types';
import { AIMessage } from './messages';

export interface WorkflowOptions {
  streamEvents?: boolean;
}

export class Workflow {
  private processes: Array<Agent | Router> = [];
  private streamEvents: boolean;

  constructor(options?: WorkflowOptions) {
    this.streamEvents = options?.streamEvents ?? false;
  }

  /**
   * Adds an Agent or Router to the workflow queue.
   * Both should return an Agent instance (Router routes to one).
   * @param process - An Agent or Router instance to add to the workflow
   * @returns The Workflow instance for method chaining
   */
  add(process: Agent | Router): Workflow {
    if (!process) {
      throw new Error('Cannot add null or undefined process to workflow');
    }
    
    this.processes.push(process);
    return this;
  }

  /**
   * Finalizes the workflow configuration.
   * Must be called after all processes have been added.
   * @returns The Workflow instance
   */
  build(): Workflow {
    if (this.processes.length === 0) {
      console.warn('[WARNING] Workflow has no processes defined');
    }
    return this;
  }

  /**
   * INVOKE Pattern - Executes all processes sequentially
   * @param messages - Initial messages to pass to the workflow
   * @param streamEvents - Override the default streamEvents setting for this invocation
   * @returns ChatResponse with final message or all process messages if streamEvents is true
   */
  async invoke(
    messages: Message[],
    streamEvents?: boolean
  ): Promise<ChatResponse & { processMessages?: ChatResponse[] }> {
    const shouldStreamEvents = streamEvents !== undefined ? streamEvents : this.streamEvents;
    const processMessages: ChatResponse[] = [];

    let currentMessages = [...messages];

    for (let i = 0; i < this.processes.length; i++) {
      const process = this.processes[i]!;
      
      try {
        // Execute the process (Agent or Router)
        const response = await process.invoke(currentMessages);

        // Store the response if streamEvents is enabled
        if (shouldStreamEvents) {
          processMessages.push(response);
        }

        // Add the agent's response to the message history for the next process
        currentMessages.push(new AIMessage(response.content));
      } catch (error) {
        throw new Error(
          `Workflow failed at process ${i + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Return final response with process messages if streamEvents is enabled
    const finalResponse: ChatResponse & { processMessages?: ChatResponse[] } = {
      content: currentMessages[currentMessages.length - 1]?.content || '',
      usage: { tokens: 0 }
    };

    if (shouldStreamEvents) {
      finalResponse.processMessages = processMessages;
    }

    return finalResponse;
  }

  /**
   * STREAM Pattern - Executes all processes sequentially with streaming
   * @param messages - Initial messages to pass to the workflow
   * @param streamEvents - Override the default streamEvents setting for this invocation
   * @returns Async generator yielding content chunks
   *
   * If streamEvents is true:
   *   - Yields chunks from each process sequentially
   *   - Each process output is fully consumed before moving to the next
   *
   * If streamEvents is false:
   *   - Only yields chunks from the final process
   */
  async *stream(
    messages: Message[],
    streamEvents?: boolean
  ): AsyncGenerator<string, void, unknown> {
    const shouldStreamEvents = streamEvents !== undefined ? streamEvents : this.streamEvents;
    let currentMessages = [...messages];
    let lastProcessContent = '';

    for (let i = 0; i < this.processes.length; i++) {
      const process = this.processes[i]!;

      try {
        let processContent = '';

        // Stream from the current process
        for await (const chunk of process.stream(currentMessages)) {
          processContent += chunk;

          // Yield chunk if streamEvents is enabled or if it's the last process
          if (shouldStreamEvents || i === this.processes.length - 1) {
            yield chunk;
          }
        }

        lastProcessContent = processContent;

        // Add the process's final response to message history for the next process
        currentMessages.push(new AIMessage(processContent));
      } catch (error) {
        throw new Error(
          `Workflow stream failed at process ${i + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Returns the list of processes in the workflow
   * @returns Array of processes
   */
  getProcesses(): Array<Agent | Router> {
    return [...this.processes];
  }

  /**
   * Returns the number of processes in the workflow
   * @returns Number of processes
   */
  processCount(): number {
    return this.processes.length;
  }

  /**
   * Clears all processes from the workflow
   * @returns The Workflow instance for method chaining
   */
  clear(): Workflow {
    this.processes = [];
    return this;
  }

  /**
   * Sets the streamEvents flag
   * @param streamEvents - Whether to stream events from all processes
   * @returns The Workflow instance for method chaining
   */
  setStreamEvents(streamEvents: boolean): Workflow {
    this.streamEvents = streamEvents;
    return this;
  }
}
