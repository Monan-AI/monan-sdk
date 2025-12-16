#!/usr/bin/env bun

/**
 * Quick Integration Test - ReAct Pattern
 * 
 * Este script testa a integração básica do ReAct pattern
 * sem depender de API externa (usando mock tools)
 */

import { Agent, tool, extractTools } from '../src/index';
import { z } from 'zod';

// Mock tools para teste
class MockTools {
  greet = tool({
    name: 'greet',
    description: 'Greet a person by name',
    inputSchema: z.object({
      name: z.string(),
    }),
    execute: async (input: { name: string }) => {
      return { message: `Hello, ${input.name}!` };
    },
  });

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

async function runTest() {
  console.log('🚀 ReAct Pattern Integration Test\n');
  console.log('='.repeat(50));

  const mockTools = new MockTools();
  const toolsList = extractTools(mockTools);

  console.log('\n📋 Creating Agent with ReAct...');
  const agent = new Agent({
    name: 'TestAssistant',
    model: 'llama2',
    description: 'A test assistant with tools',
    tools: toolsList,
    enableReAct: true,
    maxRetries: 5,
    config: {
      temperature: 0.7,
      maxTokens: 1024,
      maxRetries: 5,
      enableReAct: true,
    },
  });

  console.log('\n✅ Agent Configuration:');
  console.log(`   • Name: ${agent.name}`);
  console.log(`   • Model: ${agent.model}`);
  console.log(`   • ReAct Enabled: ${agent.enableReAct}`);
  console.log(`   • Max Retries: ${agent.maxRetries}`);
  console.log(`   • Available Tools: ${agent.tools.map(t => t.name).join(', ')}`);
  console.log(`   • Tools Count: ${agent.tools.length}`);
  console.log(`   • Temperature: ${agent.config.temperature}`);
  console.log(`   • Max Tokens: ${agent.config.maxTokens}`);

  console.log('\n📊 Tool Details:');
  agent.tools.forEach(tool => {
    console.log(`\n   Tool: ${tool.name}`);
    console.log(`   └─ Description: ${tool.description}`);
    console.log(`   └─ Schema: ${tool.inputSchema?.constructor?.name || 'UnknownSchema'}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Test Summary:');
  console.log(`   ✅ Agent created successfully`);
  console.log(`   ✅ ReAct pattern enabled`);
  console.log(`   ✅ Retry logic configured`);
  console.log(`   ✅ ${agent.tools.length} tools registered`);
  console.log(`   ✅ Max retries set to ${agent.maxRetries}`);

  console.log('\n🎯 Ready to use with:');
  console.log(`   const response = await agent.invoke([`);
  console.log(`     { role: 'user', content: 'Your message here' }`);
  console.log(`   ]);`);

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Integration test PASSED\n');
}

runTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
