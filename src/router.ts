import { z } from 'zod';
import { Agent } from './agent';
import type { Message, ChatResponse } from './types';

export interface Route {
  intent: string;
  description: string;
  agent: Agent;
}

export interface RouterConfig {
  model: string;
  default: Agent;
  routes: Route[];
  config?: {
    temperature?: number;
    maxTokens?: number;
  };
  openRouterToken?: string;
  maskPII?: boolean;
}

export class Router {
  public name: string = 'Router';
  public model: string;
  public description: string = 'An intelligent router that directs requests to the appropriate agent';
  
  private default: Agent;
  private routes: Route[];
  private routerAgent: Agent;
  private validationSchema: z.ZodSchema;
  private validIntents: string[];

  constructor(config: RouterConfig) {
    this.model = config.model;
    this.default = config.default;
    this.routes = config.routes;

    // Extract valid intent names
    this.validIntents = this.routes.map(route => route.intent);
    if (this.validIntents.length === 0) {
      throw new Error('Router must have at least one route defined');
    }

    // Create a Zod schema that validates against the valid intents
    this.validationSchema = z.object({
      intent: z.string().refine(
        (intent) => this.validIntents.includes(intent),
        {
          message: `Intent must be one of: ${this.validIntents.join(', ')}`,
        }
      ),
    });

    // Initialize the router agent that makes routing decisions
    this.routerAgent = new Agent({
      name: 'InternalRouter',
      model: config.model,
      description: 'Routes requests to appropriate agents',
      config: config.config,
      openRouterToken: config.openRouterToken,
      maskPII: config.maskPII,
    });
  }

  /**
   * Routes a message to the appropriate agent based on intent.
   * Uses the router agent to determine which agent should handle the request.
   * Returns the Agent object that will handle the request.
   * If validation fails or an error occurs, returns the default agent.
   * 
   * @param messages - The messages to send to the router for decision making.
   * @returns The Agent object for handling the request.
   */
  async route(messages: Message[]): Promise<Agent> {
    try {
      // Create a prompt for the router to select the best agent
      const routesList = this.routes
        .map(route => `- ${route.intent}: ${route.description}`)
        .join('\n');

      const validIntentsStr = this.validIntents.join(', ');

      const routerPrompt: Message[] = [
        ...messages,
        {
          role: 'system',
          content: `You are a router that decides which agent should handle a request based on the user's intent.

Available routes and their intents:
${routesList}

You MUST respond with ONLY one of these exact intent names: ${validIntentsStr}
Respond with nothing else, no explanation, no punctuation. Just the intent name.`,
        }
      ];

      // Get the router's decision
      const routerResponse = await this.routerAgent.invoke(routerPrompt);
      const selectedIntent = routerResponse.content.trim();

      // Validate the response using Zod
      const validationResult = this.validationSchema.safeParse({
        intent: selectedIntent,
      });

      if (!validationResult.success) {
        // Validation failed - log the error and use default agent
        const errors = validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        console.warn(`[WARNING] Router response validation failed: "${selectedIntent}" is not a valid intent. Valid options: ${validIntentsStr}. Error: ${errors}. Using default agent.`);
        return this.default;
      }

      // Find the route that matches the validated intent
      const validatedIntent = (validationResult.data as { intent: string }).intent;
      const selectedRoute = this.routes.find(route => route.intent === validatedIntent);

      if (selectedRoute) {
        return selectedRoute.agent;
      } else {
        // This should not happen if validation passed, but fallback just in case
        console.warn(`[WARNING] Route for intent "${selectedIntent}" not found. Using default agent.`);
        return this.default;
      }
    } catch (error) {
      // If router fails, return default agent
      console.error(`[ERROR] Router failed: ${error instanceof Error ? error.message : String(error)}. Using default agent.`);
      return this.default;
    }
  }

  /**
   * INVOKE Pattern - Routes and invokes the selected agent.
   * @param messages - The messages to send.
   * @returns The response from the selected agent.
   */
  async invoke(messages: Message[]): Promise<ChatResponse> {
    const selectedAgent = await this.route(messages);
    return selectedAgent.invoke(messages);
  }

  /**
   * STREAM Pattern - Routes and streams from the selected agent.
   * @param messages - The messages to send.
   * @returns Async generator yielding response tokens.
   */
  async *stream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const selectedAgent = await this.route(messages);
    yield* selectedAgent.stream(messages);
  }

  /**
   * Lists all available routes.
   * @returns An array of available routes with their metadata.
   */
  getAvailableRoutes(): Array<{ intent: string; description: string; agent: string }> {
    return this.routes.map(route => ({
      intent: route.intent,
      description: route.description,
      agent: route.agent.name,
    }));
  }
}
