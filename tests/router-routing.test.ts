import { Agent } from '../src/agent';
import { Router } from '../src/router';

async function main() {
  // Create specialized agents
  const coderAgent = new Agent({
    name: 'Coder',
    model: 'gemma3:1b',
    description: 'A specialized agent for coding tasks',
    config: {
      temperature: 0.2,
      maxTokens: 1024,
    },
  });

  const chatAgent = new Agent({
    name: 'Chatbot',
    model: 'gemma3:1b',
    description: 'A general conversation agent',
    config: {
      temperature: 0.7,
      maxTokens: 512,
    },
  });

  const defaultAgent = new Agent({
    name: 'Default',
    model: 'gemma3:1b',
    description: 'The default agent',
    config: {
      temperature: 0.5,
      maxTokens: 512,
    },
  });

  // Create a router instance
  const router = new Router({
    model: 'gemma3:1b',
    default: defaultAgent,
    routes: [
      {
        intent: 'coding',
        description: 'Complex coding tasks or programming help',
        agent: coderAgent,
      },
      {
        intent: 'chat',
        description: 'General conversation and casual chat',
        agent: chatAgent,
      },
    ],
    config: {
      temperature: 0.5,
      maxTokens: 256,
    },
  });

  console.log('=== Available Routes ===');
  console.log(router.getAvailableRoutes());
  console.log('\n');

  // Test 1: Route a coding request
  console.log('=== Test 1: Routing Coding Request ===');
  const codingMessages = [
    {
      role: 'user' as const,
      content: 'How do I implement a binary search in TypeScript?',
    },
  ];

  const selectedCodingAgent = await router.route(codingMessages);
  console.log(`Selected agent: ${selectedCodingAgent.name}`);
  console.log('Invoking selected agent...\n');

  const codingResponse = await selectedCodingAgent.invoke(codingMessages);
  console.log(`Response: ${codingResponse.content}\n`);

  // Test 2: Route a chat request
  console.log('\n=== Test 2: Routing Chat Request ===');
  const chatMessages = [
    {
      role: 'user' as const,
      content: 'Tell me a funny joke',
    },
  ];

  const selectedChatAgent = await router.route(chatMessages);
  console.log(`Selected agent: ${selectedChatAgent.name}`);
  console.log('Invoking selected agent...\n');

  const chatResponse = await selectedChatAgent.invoke(chatMessages);
  console.log(`Response: ${chatResponse.content}\n`);

  // Test 3: Using router.invoke() directly
  console.log('\n=== Test 3: Using Router.invoke() Directly ===');
  const routerResponse = await router.invoke([
    {
      role: 'user' as const,
      content: 'What is the meaning of life?',
    },
  ]);
  console.log(`Router Response: ${routerResponse.content}\n`);

  // Test 4: Using router.stream() for streaming responses
  console.log('\n=== Test 4: Using Router.stream() for Streaming ===');
  console.log('Streaming response:');
  for await (const token of router.stream([
    {
      role: 'user' as const,
      content: 'Give me a short poem about programming',
    },
  ])) {
    process.stdout.write(token);
  }
  console.log('\n');
}

main().catch(console.error);
