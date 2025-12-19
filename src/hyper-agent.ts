import { Agent } from './agent';
import { tool } from './tools';
import { z } from 'zod';
import type { ChatResponse, HyperAgentOptions } from './types';
import { HumanMessage } from './messages';

export class HyperAgent extends Agent {
  private subAgents: Agent[];

  constructor(options: HyperAgentOptions) {
    const { agents, systemPrompt, tools = [], ...baseOptions } = options;

    // 1. Convert sub-agents into executable tools
    const agentTools = agents.map((subAgent) => {
      // Sanitize name for tool usage (must be alphanumeric/underscores)
      const toolName = `call_${subAgent.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
      
      return tool({
        name: toolName,
        description: `Delegates a specific task to ${subAgent.name}. \nCapabilities: ${subAgent.description}`,
        inputSchema: z.object({
          task: z.string().describe(`The detailed instruction or question for ${subAgent.name}. Be specific about what you need back.`),
        }),
        execute: async ({ task }: { task: string }) => {
          // Create a clean message context for the sub-agent
          const message = new HumanMessage(task);
          
          try {
            // Invoke the sub-agent
            const response: ChatResponse = await subAgent.invoke([message]);
            return {
              agent: subAgent.name,
              output: response.content,
              usage: response.usage
            };
          } catch (error) {
            return {
              agent: subAgent.name,
              error: `Failed to execute task: ${error instanceof Error ? error.message : String(error)}`
            };
          }
        },
      });
    });

    // 2. Build the Manager System Prompt
    // If user provided a systemPrompt, prepend the team info to it.
    // If not, use a default orchestration prompt.
    const teamDescription = agents
      .map(a => `- ${a.name}: ${a.description}`)
      .join('\n');

    const orchestrationPrompt = `You are a Hyper Agent Orchestrator named ${options.name}.
Your goal is to solve complex user requests by managing a team of specialized agents.

YOUR TEAM:
${teamDescription}

PROTOCOL:
1. PLAN: Analyze the user's request and break it down into sub-tasks.
2. DELEGATE: Use the available "call_*" tools to assign these tasks to the most appropriate team member.
3. SYNTHESIZE: Once you receive results from your agents, combine them into a final, cohesive answer for the user.

Do not attempt to do the specialized work yourself if you have an agent for it. Coordinate them.`;

    const finalSystemPrompt = systemPrompt 
      ? `${orchestrationPrompt}\n\nAdditional Instructions:\n${systemPrompt}`
      : orchestrationPrompt;

    // 3. Initialize the base Agent with the new tools and prompt
    super({
      ...baseOptions,
      tools: [...tools, ...agentTools], // Combine user tools with agent-tools
      systemPrompt: finalSystemPrompt,
      // HyperAgents usually need a bit more retry capability for the loop
      maxRetries: options.maxRetries ?? 10 
    });

    this.subAgents = agents;
  }

  /**
   * Helper to get the list of managed agents
   */
  public getTeam(): Agent[] {
    return this.subAgents;
  }
}