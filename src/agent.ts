import { Ollama } from 'ollama';
import type { AgentOptions, AgentReActConfig, IVectorStore, ChatResponse, Message, ReActStep, ReActObservation } from './types';
import { maskPII } from './utils';
import type { ToolMetadata } from './tools';
import { callTool } from './tools';

export class Agent {
  public name: string;
  public model: string;
  public description: string;
  public config: AgentReActConfig;
  public tools: ToolMetadata[];
  public knowledgeBase?: IVectorStore;
  public systemPrompt?: string;
  public maxRetries: number;

  private isCloud: boolean;
  private openRouterToken?: string;
  private useMaskPII: boolean;
  private ollama: Ollama;

  constructor(options: AgentOptions) {
    this.name = options.name;
    this.model = options.model;
    this.description = options.description;
    this.tools = options.tools || [];
    this.knowledgeBase = options.knowledgeBase;
    this.systemPrompt = options.systemPrompt;

    this.config = {
      temperature: options.config?.temperature ?? 0.7,
      maxTokens: options.config?.maxTokens ?? 1024,
      maxRetries: options.config?.maxRetries ?? 5
    };

    this.maxRetries = options.maxRetries ?? this.config.maxRetries ?? 5;
    this.isCloud = this.checkIsCloud(this.model);
    this.openRouterToken = options.openRouterToken || process.env.OPEN_ROUTER_API_KEY;
    this.useMaskPII = options.maskPII ?? (this.isCloud ? true : false);
    this.ollama = new Ollama();
  }

  /**
   * INVOKE Pattern (Synchronous)
   */
  async invoke(messages: Message[]): Promise<ChatResponse> {
    const finalMessages = await this.prepareContext(messages);

    // Use ReAct pattern if enabled and tools are available
    if (this.tools.length > 0) {
      return this.invokeWithReAct(finalMessages);
    }

    if (this.isCloud) {
      return this.callOpenRouter(finalMessages);
    } else {
      return this.callOllamaWithRetry(finalMessages);
    }
  }

  /**
   * STREAM Pattern (Asynchronous)
   */
  async *stream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const finalMessages = await this.prepareContext(messages);

    if (this.isCloud) {
      yield* this.streamOpenRouter(finalMessages);
    } else {
      // Attempts to start the stream locally
      let response;
      try {
        response = await this.ollama.chat({
          model: this.model,
          messages: finalMessages,
          stream: true,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        });
      } catch (error) {
        // If it fails due to missing model, download and retry
        if (await this.handleModelMissingError(error)) {
          response = await this.ollama.chat({
            model: this.model,
            messages: finalMessages,
            stream: true,
            options: {
              temperature: this.config.temperature,
              num_predict: this.config.maxTokens,
            },
          });
        } else {
          throw error; // If it's a different error, re-throw
        }
      }

      // Consume the stream and yield each token
      if (response && Symbol.asyncIterator in response) {
        for await (const part of response) {
          if (part.message?.content) {
            yield part.message.content;
          }
        }
      }
    }
  }

  // --- REACT PATTERN METHODS ---

  /**
   * Executes the ReAct (Reasoning + Acting) pattern
   * Allows the agent to think about the problem, call tools, observe results, and iterate
   */
  private async invokeWithReAct(messages: Message[]): Promise<ChatResponse> {
    const reActMessages: Message[] = [...messages];
    const toolsContext = this.buildToolsContext();
    
    // Add tools context to system prompt
    if (reActMessages[0]?.role === 'system') {
      reActMessages[0].content += `\n\n${toolsContext}`;
    } else {
      reActMessages.unshift({
        role: 'system',
        content: `${reActMessages[0]?.content || ''}\n\n${toolsContext}`
      });
    }

    let agentResponse: ChatResponse = { content: '', usage: { tokens: 0 } };
    let reActSteps: ReActStep[] = [];
    let continueLoop = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (continueLoop && iterations < maxIterations) {
      iterations++;

      // Get agent's reasoning and action
      agentResponse = this.isCloud 
        ? await this.callOpenRouter(reActMessages)
        : await this.callOllamaWithRetry(reActMessages);

      // Parse the response for tool calls
      const toolCall = this.parseToolCall(agentResponse.content);

      if (toolCall) {
        // Execute tool with retry logic
        const observation = await this.executeToolWithRetry(toolCall.name, toolCall.input);
        
        // Add thought and observation to conversation
        reActMessages.push({
          role: 'assistant',
          content: agentResponse.content
        });

        // Add observation as user message (tool results)
        reActMessages.push({
          role: 'user',
          content: `Tool Result for ${toolCall.name}:\n${JSON.stringify(observation.observation)}`
        });

        // Track ReAct step
        reActSteps.push({
          thought: { thinking: agentResponse.content, toolName: toolCall.name, toolInput: toolCall.input },
          observation: observation.observation,
          retryCount: observation.retryCount
        });

        // If tool had errors and we haven't exhausted retries, continue loop
        if (observation.observation?.error && observation.retryCount! < this.maxRetries) {
          // Prompt agent to try a different approach
          reActMessages.push({
            role: 'system',
            content: `The tool call failed: ${observation.observation.error}. Please try again or use a different approach. Retries remaining: ${this.maxRetries - observation.retryCount!}`
          });
        } else if (observation.observation?.error) {
          // Max retries exceeded, break loop
          continueLoop = false;
        }
      } else {
        // No tool call found, agent provided final answer
        continueLoop = false;
      }
    }

    return agentResponse;
  }

  /**
   * Parses agent response to extract tool calls
   * Expected format: <tool>toolName</tool> or similar markers
   */
  private parseToolCall(content: string): { name: string; input: unknown } | null {
    // Pattern 1: <tool>toolName</tool><input>{...}</input>
    const toolMatch = content.match(/<tool>(\w+)<\/tool>/);
    const inputMatch = content.match(/<input>(.*?)<\/input>/s);

    if (toolMatch && toolMatch[1]) {
      const toolName = toolMatch[1];
      let input: unknown = {};

      if (inputMatch && inputMatch[1]) {
        try {
          input = JSON.parse(inputMatch[1]);
        } catch (e) {
          input = { raw: inputMatch[1] };
        }
      }

      return { name: toolName, input };
    }

    // Pattern 2: Tool call using markdown code blocks
    const codeBlockMatch = content.match(/```json\s*\{[\s\S]*?"tool":\s*"(\w+)"[\s\S]*?\}\s*```/);
    if (codeBlockMatch) {
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return { name: parsed.tool, input: parsed.input || {} };
        }
      } catch (e) { }
    }

    return null;
  }

  /**
   * Executes a tool with automatic retry logic
   */
  private async executeToolWithRetry(
    toolName: string, 
    input: unknown,
    retryCount: number = 0
  ): Promise<{ observation: ReActObservation; retryCount: number }> {
    const tool = this.tools.find(t => t.name === toolName);

    if (!tool) {
      return {
        observation: {
          toolName,
          result: null,
          error: `Tool '${toolName}' not found. Available tools: ${this.tools.map(t => t.name).join(', ')}`
        },
        retryCount
      };
    }

    try {
      const result = await callTool(tool, input);
      const parsed = JSON.parse(result);

      if (parsed.error) {
        if (retryCount < this.maxRetries) {
          console.log(`[RETRY] Tool '${toolName}' failed (attempt ${retryCount + 1}/${this.maxRetries}): ${parsed.error}`);
          // Retry with slight modification to input or fresh attempt
          return this.executeToolWithRetry(toolName, input, retryCount + 1);
        } else {
          return {
            observation: {
              toolName,
              result: parsed,
              error: `Tool failed after ${this.maxRetries} retries: ${parsed.error}`
            },
            retryCount
          };
        }
      }

      return {
        observation: {
          toolName,
          result: parsed
        },
        retryCount
      };
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`[RETRY] Tool '${toolName}' error (attempt ${retryCount + 1}/${this.maxRetries}):`, error);
        return this.executeToolWithRetry(toolName, input, retryCount + 1);
      } else {
        return {
          observation: {
            toolName,
            result: null,
            error: `Tool execution failed after ${this.maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`
          },
          retryCount
        };
      }
    }
  }

  /**
   * Builds context string describing available tools for the agent
   */
  private buildToolsContext(): string {
    if (this.tools.length === 0) return '';

    const toolDescriptions = this.tools
      .map(tool => {
        const schemaStr = this.getSchemaDescription(tool.inputSchema);
        return `- **${tool.name}**: ${tool.description}\n  Input: ${schemaStr}`;
      })
      .join('\n\n');

    return `You have access to the following tools. When you need to use a tool, format it as:
<tool>toolName</tool>
<input>{"param1": "value1", "param2": "value2"}</input>

Available Tools:
${toolDescriptions}

Remember to use tools when needed, observe the results, and reason about next steps.`;
  }

  /**
   * Extracts schema description from Zod schema
   */
  private getSchemaDescription(schema: any): string {
    if (!schema) return 'See tool description';
    
    try {
      // For Zod schemas, try to get shape
      if (schema._def?.shape) {
        const shape = schema._def.shape;
        const fields = Object.entries(shape)
          .map(([key, val]: [string, any]) => {
            const typeInfo = val._def?.typeName || 'unknown';
            return `${key} (${typeInfo})`;
          })
          .join(', ');
        return `{${fields}}`;
      }
    } catch (e) { }
    
    return 'See tool description';
  }

  // --- PRIVATE INFRASTRUCTURE METHODS ---

  private async prepareContext(messages: Message[]): Promise<Message[]> {
    let contextMessages = [...messages];
    const lastUserMsgIndex: number = contextMessages.findLastIndex(m => m.role === 'user');
    
    if (lastUserMsgIndex !== -1) {
      let content = contextMessages[lastUserMsgIndex]!.content;

      if (this.useMaskPII) {
        content = maskPII(content);
      }

      if (this.knowledgeBase) {
        const relevantDocs = await this.knowledgeBase.search(content);
        if (relevantDocs.length > 0) {
          content = `CONTEXT:\n${relevantDocs.join('\n')}\n\nQUESTION:\n${content}`;
        }
      }

      contextMessages[lastUserMsgIndex] = { ...contextMessages[lastUserMsgIndex]!, content };
    }

    // Build system prompt
    let systemPromptContent = this.systemPrompt || `You are ${this.name}. ${this.description}`;
    
    if (contextMessages.length === 0 || contextMessages[0]!.role !== 'system') {
      contextMessages.unshift({ role: 'system', content: systemPromptContent });
    } else {
      // If a system message already exists, prepend our system prompt to it
      contextMessages[0]!.content = `${systemPromptContent}\n${contextMessages[0]!.content}`;
    }

    return contextMessages;
  }

  /**
   * Wrapper for callOllama that implements Auto-Download logic
   */
  private async callOllamaWithRetry(messages: Message[]): Promise<ChatResponse> {
    try {
      return await this.executeOllamaChat(messages);
    } catch (error) {
      // If the error is "model not found", attempt download and retry
      const recovered = await this.handleModelMissingError(error);
      if (recovered) {
        return await this.executeOllamaChat(messages);
      }
      throw error;
    }
  }

  /**
   * Pure Ollama chat execution (without retry try/catch)
   */
  private async executeOllamaChat(messages: Message[]): Promise<ChatResponse> {
    const response = await this.ollama.chat({
      model: this.model,
      messages: messages,
      stream: false,
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
      }
    });

    return {
      content: response.message.content,
      usage: { tokens: response.eval_count }
    };
  }

  /**
   * Verifies if the error is "Model not found" and attempts to download it.
   * Returns true if download was successful, false if it wasn't this error.
   */
  private async handleModelMissingError(error: unknown): Promise<boolean> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Ollama usually returns status 404 or message containing "not found" or "try pulling"
    const isMissingModel = errorMessage.includes('not found') || errorMessage.includes('try pulling');

    if (isMissingModel) {
      console.log(`[WARNING] Local model '${this.model}' not found.`);
      console.log(`[INFO] Starting automatic download via Ollama... (This may take a while)`);
      
      try {
        // Initiate the streamed Pull to show progress in console
        const stream = await this.ollama.pull({ model: this.model, stream: true });
        
        // Progress tracking
        let totalBytes = 0;
        let downloadedBytes = 0;
        const progressBars = new Map<string, { total: number; completed: number }>();

        for await (const part of stream) {
          if (part.digest && part.total && part.completed) {
            progressBars.set(part.digest, { total: part.total, completed: part.completed });
            
            // Calculate overall progress
            totalBytes = 0;
            downloadedBytes = 0;
            
            for (const [, progress] of progressBars) {
              totalBytes += progress.total;
              downloadedBytes += progress.completed;
            }
            
            const percentage = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
            const barLength = 30;
            const filledLength = Math.round((percentage / 100) * barLength);
            const progressBar = '[' + '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength) + ']';
            
            process.stdout.write(`\r   ${progressBar} ${percentage}%`);
          }
        }
        
        console.log();
        console.log(`[SUCCESS] Model '${this.model}' downloaded successfully! Resuming execution...`);
        return true;
      } catch (pullError) {
        throw new Error(`Failed to download model '${this.model}': ${pullError instanceof Error ? pullError.message : pullError}`);
      }
    }

    return false;
  }

  // --- CLOUD METHODS ---

  private async callOpenRouter(messages: Message[]): Promise<ChatResponse> {
    if (!this.openRouterToken) throw new Error("OpenRouter Token required.");

    // Sanitize messages to ensure they're properly formatted
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: String(msg.content)
    }));

    // Build payload with only valid fields
    const payload: any = {
      model: this.model,
      messages: sanitizedMessages,
      temperature: this.config.temperature ?? 0.7,
    };

    // Only include max_tokens if it's a valid number
    if (typeof this.config.maxTokens === 'number' && this.config.maxTokens > 0) {
      payload.max_tokens = this.config.maxTokens;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.openRouterToken}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://monan.dev",
          "X-Title": "Monan SDK"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${errorText}`);
      }
      
      const data = await response.json() as any;

      return {
        content: data.choices[0].message.content,
        usage: { tokens: data.usage?.total_tokens }
      };
    } catch (error) {
      throw new Error(`Failed to call OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async *streamOpenRouter(messages: Message[]): AsyncGenerator<string, void, unknown> {
    if (!this.openRouterToken) throw new Error("OpenRouter Token required.");

    // Sanitize messages to ensure they're properly formatted
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: String(msg.content)
    }));

    // Build payload with only valid fields
    const payload: any = {
      model: this.model,
      messages: sanitizedMessages,
      temperature: this.config.temperature ?? 0.7,
      stream: true
    };

    // Only include max_tokens if it's a valid number
    if (typeof this.config.maxTokens === 'number' && this.config.maxTokens > 0) {
      payload.max_tokens = this.config.maxTokens;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.openRouterToken}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://monan.dev",
          "X-Title": "Monan SDK"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.substring(6));
              const content = json.choices[0]?.delta?.content;
              if (content) yield content;
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to stream from OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private checkIsCloud(modelName: string): boolean {
    return modelName.includes('/');
  }
}