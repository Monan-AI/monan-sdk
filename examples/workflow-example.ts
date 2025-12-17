import { Agent, Workflow, HumanMessage } from '../src/index';

// Create individual agents for different tasks
const researcherAgent = new Agent({
  name: 'Researcher',
  model: 'x-ai/grok-4.1-fast',
  description: 'Researches and analyzes topics comprehensively',
  config: { temperature: 0.3, maxTokens: 500 }
});

const writerAgent = new Agent({
  name: 'Writer',
  model: 'x-ai/grok-4.1-fast',
  description: 'Writes clear and engaging content based on research',
  config: { temperature: 0.7, maxTokens: 800 }
});

const editorAgent = new Agent({
  name: 'Editor',
  model: 'x-ai/grok-4.1-fast',
  description: 'Edits and improves writing for clarity and style',
  config: { temperature: 0.4, maxTokens: 600 }
});

/**
 * Example 1: Sequential workflow without streaming events
 * Only returns the final message from the last agent
 */
async function exampleBasicWorkflow() {
  console.log('\n=== Example 1: Basic Workflow (Final Message Only) ===\n');

  const workflow = new Workflow()
    .add(researcherAgent)
    .add(writerAgent)
    .add(editorAgent)
    .build();

  const result = await workflow.invoke([
    new HumanMessage('Create content about TypeScript best practices')
  ]);

  console.log('Final Output from Editor:');
  console.log(result.content);
  console.log('\n');
}

/**
 * Example 2: Workflow with stream events enabled
 * Returns all intermediate messages from each process
 */
async function exampleStreamEventsInvoke() {
  console.log('\n=== Example 2: Workflow with Stream Events (invoke) ===\n');

  const workflow = new Workflow({ streamEvents: true })
    .add(researcherAgent)
    .add(writerAgent)
    .add(editorAgent)
    .build();

  const result = await workflow.invoke([
    new HumanMessage('Explain REST APIs')
  ]);

  console.log('=== Process Messages ===\n');
  
  if (result.processMessages) {
    result.processMessages.forEach((msg, index) => {
      const agentName = [researcherAgent.name, writerAgent.name, editorAgent.name][index];
      console.log(`--- ${agentName} Output (Step ${index + 1}) ---`);
      console.log(msg.content.substring(0, 300) + '...\n');
    });
  }

  console.log('=== Final Output ===');
  console.log(result.content.substring(0, 300) + '...\n');
}

/**
 * Example 3: Streaming workflow without events
 * Only streams the final process
 */
async function exampleStreamingWorkflow() {
  console.log('\n=== Example 3: Streaming Workflow (Final Process Only) ===\n');

  const workflow = new Workflow()
    .add(researcherAgent)
    .add(writerAgent)
    .add(editorAgent)
    .build();

  console.log('Streaming final output:\n');
  
  for await (const chunk of workflow.stream([
    new HumanMessage('What is machine learning?')
  ])) {
    process.stdout.write(chunk);
  }
  
  console.log('\n\n');
}

/**
 * Example 4: Streaming workflow with events
 * Streams output from all processes
 */
async function exampleStreamingWithEvents() {
  console.log('\n=== Example 4: Streaming Workflow (All Processes) ===\n');

  const workflow = new Workflow({ streamEvents: true })
    .add(researcherAgent)
    .add(writerAgent)
    .add(editorAgent)
    .build();

  let processIndex = 0;
  const agentNames = [researcherAgent.name, writerAgent.name, editorAgent.name];
  const chunkCounts = [0, 0, 0];

  console.log(`--- ${agentNames[0]} Output ---\n`);

  for await (const chunk of workflow.stream([
    new HumanMessage('Describe cloud computing')
  ])) {
    process.stdout.write(chunk);
  }
  
  console.log('\n\n');
}

/**
 * Example 5: Override streamEvents on specific invocation
 */
async function exampleOverrideStreamEvents() {
  console.log('\n=== Example 5: Override Stream Events ===\n');

  // Create workflow without streamEvents by default
  const workflow = new Workflow()
    .add(researcherAgent)
    .add(writerAgent)
    .build();

  // Override streamEvents for this specific call
  const result = await workflow.invoke(
    [new HumanMessage('What is artificial intelligence?')],
    true // Override: enable streamEvents for this invocation
  );

  console.log('Process Messages Retrieved:');
  if (result.processMessages) {
    console.log(`Total processes executed: ${result.processMessages.length}`);
    result.processMessages.forEach((msg, i) => {
      console.log(`\nProcess ${i + 1} response length: ${msg.content.length} characters`);
    });
  }
  console.log('\n');
}

// Run examples
async function runExamples() {
  try {
    await exampleBasicWorkflow();
    await exampleStreamEventsInvoke();
    await exampleStreamingWorkflow();
    await exampleStreamingWithEvents();
    await exampleOverrideStreamEvents();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

runExamples();
