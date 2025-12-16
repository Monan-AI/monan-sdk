import { Agent, tool, extractTools } from '../src/index';
import { z } from 'zod';

/**
 * Example demonstrating ReAct (Reasoning + Acting) pattern with automatic retries
 */

// Define some tools
class CalculatorTools {
  add = tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (input: { a: number; b: number }) => {
      console.log(`Executing add with inputs: ${input.a}, ${input.b}`);
      return { result: input.a + input.b };
    },
  });

  multiply = tool({
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (input: { a: number; b: number }) => {
      console.log(`Executing multiply with inputs: ${input.a}, ${input.b}`);
      return { result: input.a * input.b };
    },
  });

  divide = tool({
    name: 'divide',
    description: 'Divide two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (input: { a: number; b: number }) => {
      if (input.b === 0) {
        console.log('Error: Division by zero');
        return { error: 'Cannot divide by zero' };
      }
      console.log(`Executing divide with inputs: ${input.a}, ${input.b}`);
      return { result: input.a / input.b };
    },
  });
}

class WebSearchTools {
  search = tool({
    name: 'search',
    description: 'Search the web for information',
    inputSchema: z.object({
      query: z.string(),
    }),
    execute: async (input: { query: string }) => {
      // Simulated web search
      const results = [
        { title: 'Result 1', snippet: 'Information about ' + input.query },
        { title: 'Result 2', snippet: 'More info on ' + input.query },
      ];
      console.log(`Executing search with query: ${input.query}`);
      return { results };
    },
  });
}

// Create an agent with ReAct enabled
async function main() {
  const calcTools = new CalculatorTools();
  const searchTools = new WebSearchTools();

  const agent = new Agent({
    name: 'MathAssistant',
    //model: 'x-ai/grok-4.1-fast', // or use OpenRouter model like "openai/gpt-4"
    model: 'gemma3:1b', // or use OpenRouter model like "openai/gpt-4"
    description: 'A helpful assistant that can perform calculations and search the web',
    tools: [...extractTools(calcTools), ...extractTools(searchTools)],
    config: {
      temperature: 0.7,
      maxTokens: 1024,
      maxRetries: 5, // Will retry failed tools up to 5 times
    },
    systemPrompt: 'You are a helpful math and search assistant. Use tools when you can.',
  });

  console.log('Agent created with ReAct enabled!');
  console.log(`Max retries configured: ${agent.maxRetries}`);
  console.log(`Available tools: ${agent.tools.map(t => t.name).join(', ')}\n`);

  // Example usage
  const response = await agent.invoke([
    {
      role: 'user',
      content: 'Calculate the result of (5 + 3) * 2, then tell me about ReAct pattern',
    },
  ]);

  console.log('\n--- Agent Response ---');
  console.log(response.content);
  console.log(`\nTokens used: ${response.usage?.tokens || 'N/A'}`);
}

main().catch(console.error);
