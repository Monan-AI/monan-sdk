/**
 * Example: ReAct Pattern with Observation Cycle Control
 * 
 * Demonstrates how maxRetries controls observation cycles:
 * - Each cycle = Think → Act (call tool) → Observe (read result)
 * - Agent decides if it needs more cycles based on observations
 * - maxRetries limits total cycles, not individual tool attempts
 */

import { Agent, HumanMessage, tool, extractTools } from '../src/index';
import { z } from 'zod';

// Define some tools
class MathTools {
  add = tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number()
    }),
    execute: async (input: { a: number; b: number }) => {
      console.log(`Executing add with inputs: ${input.a}, ${input.b}`);
      return { result: input.a + input.b };
    }
  });

  multiply = tool({
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: z.object({
      x: z.number(),
      y: z.number()
    }),
    execute: async (input: { x: number; y: number }) => {
      console.log(`Executing multiply with inputs: ${input.x}, ${input.y}`);
      return { result: input.x * input.y };
    }
  });

  divide = tool({
    name: 'divide',
    description: 'Divide two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number()
    }),
    execute: async (input: { a: number; b: number }) => {
      if (input.b === 0) {
        console.log('Error: Division by zero');
        return { error: 'Cannot divide by zero' };
      }
      console.log(`Executing divide with inputs: ${input.a}, ${input.b}`);
      return { result: input.a / input.b };
    }
  });
}

async function demonstrateReActCycles() {
  const mathTools = new MathTools();
  const tools = extractTools(mathTools);

  const agent = new Agent({
    name: 'MathAssistant',
    model: 'openai/gpt-5.1', // or local model like 'llama2'
    description: 'A helpful math assistant that can solve multi-step problems',
    openRouterToken: process.env.OPEN_ROUTER_API_KEY,
    config: {
      temperature: 0.7,
      maxTokens: 1024,
    },
    // This controls the MAXIMUM number of observation cycles in ReAct
    // With maxRetries = 3, agent can do:
    // Cycle 1: Think → Call tool 1 → Observe result
    // Cycle 2: Evaluate result → Call tool 2 → Observe result
    // Cycle 3: Evaluate result → Call tool 3 → Observe result
    // After 3 cycles, it MUST return final answer, even if incomplete
    maxRetries: 3,
    tools: tools
  });

  console.log('=== ReAct Observation Cycle Control Demo ===\n');

  // Example 1: Simple problem that needs multiple steps
  console.log('Example 1: "Calculate (5 + 3) * 2"');
  console.log('Expected cycles:');
  console.log('  Cycle 1: Think → Call add(5, 3) → Observe 8');
  console.log('  Cycle 2: Think → Call multiply(8, 2) → Observe 16');
  console.log('  Result: 16\n');

  const result1 = await agent.invoke([
    new HumanMessage('Calculate (5 + 3) * 2')
  ]);
  console.log('Agent response:', result1.content, '\n');

  // Example 2: Complex problem that might hit cycle limit
  console.log('Example 2: "Calculate ((10 + 5) * 3) / 2"');
  console.log('With maxRetries = 3, agent might hit the limit:');
  console.log('  Cycle 1: Think → Call add(10, 5) → Observe 15');
  console.log('  Cycle 2: Think → Call multiply(15, 3) → Observe 45');
  console.log('  Cycle 3: Think → Call divide(45, 2) → Observe 22.5');
  console.log('  Limit reached! Return final answer\n');

  const result2 = await agent.invoke([
    new HumanMessage('Calculate ((10 + 5) * 3) / 2')
  ]);
  console.log('Agent response:', result2.content, '\n');

  // Example 3: What happens with bad input?
  console.log('Example 3: "Calculate 10 / 0"');
  console.log('Expected:');
  console.log('  Cycle 1: Think → Call divide(10, 0) → Observe error');
  console.log('  Agent evaluates error and provides response\n');

  const result3 = await agent.invoke([
    new HumanMessage('Calculate 10 / 0')
  ]);
  console.log('Agent response:', result3.content, '\n');
}

/**
 * How maxRetries Works in ReAct
 * 
 * OLD BEHAVIOR (Tool Retries):
 * - maxRetries controlled how many times a SINGLE tool would retry if it failed
 * - Problem: Wasted cycles on retrying same tool
 * - Limited agent's ability to plan multi-step solutions
 * 
 * NEW BEHAVIOR (Observation Cycles):
 * - maxRetries controls how many COMPLETE cycles the agent can run
 * - Each cycle: Agent thinks → calls a tool → observes result
 * - Agent DECIDES what to do next based on observation
 * - Better for complex, multi-step problems
 * - Example with maxRetries = 3:
 *   1. Agent thinks it needs addition → calls add → observes result
 *   2. Agent thinks it needs multiplication → calls multiply → observes result
 *   3. Agent thinks it needs division → calls divide → observes result
 *   4. Agent reaches limit → provides final answer
 * 
 * Benefits:
 * ✓ More strategic tool usage
 * ✓ Agent can try different tools based on observations
 * ✓ Better for workflow orchestration
 * ✓ Clearer semantics of "max retries"
 */

// Uncomment to run the demo
demonstrateReActCycles().catch(console.error);
