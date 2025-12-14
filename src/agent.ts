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
   * INVOKE Pattern (Synchronous) - LangChain Style
   * Receives message history and returns complete response.
   */
  async invoke(messages: Message[]): Promise<ChatResponse> {
    const finalMessages = await this.prepareContext(messages);

    if (this.isCloud) {
      return this.callOpenRouter(finalMessages);
    } else {
      return this.callOllama(finalMessages);
    }
  }

  /**
   * STREAM Pattern (Asynchronous) - LangChain Style
   * Returns a Generator that yields tokens as they are generated.
   */
  async *stream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const finalMessages = await this.prepareContext(messages);

    if (this.isCloud) {
      // Stream from OpenRouter (Fetch with ReadableStream)
      yield* this.streamOpenRouter(finalMessages);
    } else {
      // Stream from Ollama (Native from lib)
      const response = await this.ollama.chat({
        model: this.model,
        messages: finalMessages,
        stream: true, // <--- Enables streaming
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      for await (const part of response) {
        yield part.message.content;
      }
    }
  }

  // --- PRIVATE INFRASTRUCTURE METHODS ---

  /**
   * Prepares messages by injecting System Prompt, RAG, and applying PII Masking
   */
  private async prepareContext(messages: Message[]): Promise<Message[]> {
    // Clone to avoid mutating the original array
    let contextMessages = [...messages];

    // 1. Identify the last user message for RAG and PII
    const lastUserMsgIndex: number = contextMessages.findLastIndex(m => m.role === 'user');
    
    if (lastUserMsgIndex !== -1) {
      let content = contextMessages[lastUserMsgIndex]!.content;

      // PII masking
      if (this.useMaskPII) {
        content = maskPII(content);
      }

      // RAG (Knowledge Base)
      if (this.knowledgeBase) {
        const relevantDocs = await this.knowledgeBase.search(content);
        if (relevantDocs.length > 0) {
          content = `CONTEXT:\n${relevantDocs.join('\n')}\n\nQUESTION:\n${content}`;
        }
      }

      // Update the processed message
      contextMessages[lastUserMsgIndex] = { ...contextMessages[lastUserMsgIndex]!, content };
    }

    // 2. Inject System Prompt at the beginning (if not already present)
    const systemPrompt = `You are ${this.name}. ${this.description}`;
    if (contextMessages.length === 0 || contextMessages[0]!.role !== 'system') {
      contextMessages.unshift({ role: 'system', content: systemPrompt });
    } else {
      // If system message already exists, append agent description to reinforce the persona
      contextMessages[0]!.content = `${systemPrompt}\n${contextMessages[0]!.content}`;
    }

    return contextMessages;
  }

  /**
   * Executes local inference via Ollama (Chat Mode)
   */
  private async callOllama(messages: Message[]): Promise<ChatResponse> {
    try {
      const response = await this.ollama.chat({
        model: this.model,
        messages: messages, // Now we pass the structured array
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
    } catch (error) {
      throw new Error(`Ollama Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Executes cloud inference via OpenRouter (Invoke)
   */
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

  /**
   * Handles manual streaming from OpenRouter/OpenAI API
   */
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
        stream: true // SSE enabled
      })
    });

    if (!response.ok || !response.body) throw new Error(await response.text());

    // Stream reading in Bun/Node
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete remainder for next loop

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.substring(6));
            const content = json.choices[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse error lines in stream (keep-alive, etc)
          }
        }
      }
    }
  }

  private checkIsCloud(modelName: string): boolean {
    return modelName.includes('/');
  }
}