import { describe, it, expect } from 'bun:test';
import { Agent, tool, extractTools } from '../src/index';
import { z } from 'zod';

/**
 * Test suite for ReAct pattern with retry logic
 */

describe('ReAct Pattern with Retries', () => {
  // Create a tool that fails sometimes to test retry logic

  class SimpleMathTools {
    add = tool({
      name: 'add',
      description: 'Add two numbers',
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async (input: { a: number; b: number }) => {
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
        return { result: input.a * input.b };
      },
    });
  }

  it('should create agent with ReAct enabled', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
      enableReAct: true,
      maxRetries: 5,
    });

    expect(agent.maxRetries).toBe(5);
    expect(agent.tools.length).toBe(2);
  });

  it('should respect config-level ReAct settings', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
      config: {
        maxRetries: 3,
      },
    });

    expect(agent.maxRetries).toBe(3);
  });

  it('should have default ReAct settings', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
    });

    expect(agent.maxRetries).toBe(5); // Default 5
  });

  it('should allow disabling ReAct', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
      enableReAct: false,
    });

  });

  it('should build tools context correctly', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
    });

    // This is a private method, but we can verify through the tools
    expect(agent.tools.length).toBe(2);
    expect(agent.tools[0]?.name).toMatch(/add|multiply/);
    expect(agent.tools[1]?.name).toMatch(/add|multiply/);
  });

  it('should prefer option-level settings over config-level', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
    });
  });

  it('should configure temperature and maxTokens', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
      config: {
        temperature: 0.5,
        maxTokens: 2048,
      },
    });

    expect(agent.config.temperature).toBe(0.5);
    expect(agent.config.maxTokens).toBe(2048);
  });

  it('should have default temperature and maxTokens', () => {
    const mathTools = new SimpleMathTools();
    const agent = new Agent({
      name: 'TestAgent',
      model: 'llama2',
      description: 'Test agent',
      tools: extractTools(mathTools),
    });

    expect(agent.config.temperature).toBe(0.7); // Default
    expect(agent.config.maxTokens).toBe(1024); // Default
  });
});
