import { Agent } from '../src/agent';

async function main() {
  // Create an agent instance with Ollama
  const agent = new Agent({
    name: 'Assistant',
    model: 'gemma3:1b', // Local Ollama model
    description: 'A helpful assistant powered by Ollama',
    config: {
      temperature: 0.2,
      maxTokens: 512,
    },
  });

  // Example 1: Using invoke (synchronous-like response)
  console.log('=== Using invoke() (local) ===');
  const response = await agent.invoke([
    {
      role: 'user',
      content: 'What is the capital of France?',
    },
  ]);
  console.log('Response:', response.content);
  console.log('Tokens used:', response.usage?.tokens);

  // Example 2: Using stream (token-by-token streaming)
  console.log('\n=== Agent Streaming Test ===');
  console.log('Streaming response:');
  
  for await (const token of agent.stream([
    {
      role: 'user',
      content: 'Tell me some short jokes',
    },
  ])) {
    process.stdout.write(token);
  }
  console.log('\n');
}

main().catch(console.error);
