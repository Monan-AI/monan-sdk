import { Agent, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '../src/index';

/**
 * Example: Using message classes with Agent
 * 
 * This example demonstrates the improved message handling with typed message classes:
 * - HumanMessage: For user inputs
 * - AIMessage: For assistant responses
 * - SystemMessage: For system instructions
 * - ToolMessage: For tool execution results
 */

async function exampleWithMessageClasses() {
  const agent = new Agent({
    name: 'Assistant',
    model: 'llama2',
    description: 'A helpful assistant',
    config: {
      temperature: 0.7,
      maxTokens: 1024,
    }
  });

  // Create typed messages instead of plain objects
  const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage('You are a helpful assistant that answers questions about programming.'),
    new HumanMessage('What is TypeScript?'),
  ];

  // Call invoke - now with full type support and metadata
  const response = await agent.invoke(messages);
  console.log('Response:', response.content);

  // Add the assistant response
  messages.push(new AIMessage(response.content));

  // Simulate a follow-up with tool result
  const followUp = new HumanMessage('Can you show me an example?');
  messages.push(followUp);

  const response2 = await agent.invoke(messages);
  console.log('Follow-up response:', response2.content);

  // Example with metadata
  const messageWithMetadata = new HumanMessage(
    'Explain generics in TypeScript',
    undefined,
    {
      userId: 'user123',
      sessionId: 'session456',
      timestamp: new Date().toISOString()
    }
  );

  const response3 = await agent.invoke([messageWithMetadata]);
  console.log('Response with metadata:', response3.content);

  // Stream example
  console.log('\nStreaming response:');
  for await (const chunk of agent.stream([new HumanMessage('What is async/await?')])) {
    process.stdout.write(chunk);
  }
  console.log('\n');
}

// Run the example
exampleWithMessageClasses().catch(console.error);
