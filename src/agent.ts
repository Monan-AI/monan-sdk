import { Ollama } from 'ollama';
import type { AgentOptions, AgentConfig, IVectorStore, ChatResponse, Message } from './types';
import { maskPII } from './utils';

export class Agent {
  public name: string;
  public model: string;
  public description: string;
  public config: AgentConfig;
  public tools: any[];
  public knowledgeBase?: IVectorStore;

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

    this.config = {
      temperature: options.config?.temperature ?? 0.7,
      maxTokens: options.config?.maxTokens ?? 1024,
    };

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

    const systemPrompt = `You are ${this.name}. ${this.description}`;
    if (contextMessages.length === 0 || contextMessages[0]!.role !== 'system') {
      contextMessages.unshift({ role: 'system', content: systemPrompt });
    } else {
      contextMessages[0]!.content = `${systemPrompt}\n${contextMessages[0]!.content}`;
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.openRouterToken}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://monan.dev",
        "X-Title": "Monan SDK"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as any;

    return {
      content: data.choices[0].message.content,
      usage: { tokens: data.usage?.total_tokens }
    };
  }

  private async *streamOpenRouter(messages: Message[]): AsyncGenerator<string, void, unknown> {
    if (!this.openRouterToken) throw new Error("OpenRouter Token required.");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.openRouterToken}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://monan.dev",
        "X-Title": "Monan SDK"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      })
    });

    if (!response.ok || !response.body) throw new Error(await response.text());

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
  }

  private checkIsCloud(modelName: string): boolean {
    return modelName.includes('/');
  }
}