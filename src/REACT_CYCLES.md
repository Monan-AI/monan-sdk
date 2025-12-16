# ReAct Pattern: Observation Cycles Control

## Overview

The ReAct (Reasoning + Acting) pattern in Monan now uses **observation cycles** to control agent behavior. The `maxRetries` parameter controls the maximum number of complete **think → act → observe** cycles, not individual tool attempts.

## What is an Observation Cycle?

One complete observation cycle consists of three phases:

1. **Think** - Agent analyzes the current state and decides what tool to use
2. **Act** - Agent executes the selected tool
3. **Observe** - Agent receives and processes the tool result, determines next action

```
Cycle 1: Agent thinks about problem → Calls add(5, 3) → Observes result: 8
Cycle 2: Agent thinks about next step → Calls multiply(8, 2) → Observes result: 16
Cycle 3: Agent thinks about final step → Calls divide(16, 4) → Observes result: 4
↓ (Cycle limit reached)
Agent returns final answer: 4
```

## maxRetries Parameter

`maxRetries` sets the **maximum number of observation cycles** the agent can execute:

```typescript
const agent = new Agent({
  name: 'MathAssistant',
  model: 'gpt-4o',
  description: 'Solves math problems',
  maxRetries: 3, // Agent can do max 3 observation cycles
  tools: [add, multiply, divide]
});
```

## Behavior Changes

### Old Behavior (Before)
- `maxRetries` controlled automatic retry attempts for a **single tool**
- If a tool failed, the agent would try the same tool up to `maxRetries` times
- Limited multi-step problem solving
- Tool errors would consume retries

### New Behavior (After)
- `maxRetries` controls **observation cycles** in the ReAct loop
- Each tool execution (successful or failed) counts as one cycle
- Agent decides what to do next based on each observation
- Much more flexible for complex workflows

## Examples

### Example 1: Multi-step Math Problem

```typescript
const agent = new Agent({
  model: 'gpt-4o',
  maxRetries: 3,
  tools: [add, multiply, divide]
});

await agent.invoke([
  new HumanMessage('Calculate ((10 + 5) * 3) / 2')
]);
```

**Execution Flow:**
```
Cycle 1: "I need to add 10 + 5"
        → Call add(10, 5)
        → Observe: 15

Cycle 2: "Now I need to multiply 15 * 3"
        → Call multiply(15, 3)
        → Observe: 45

Cycle 3: "Finally, I need to divide 45 / 2"
        → Call divide(45, 2)
        → Observe: 22.5

(Reached cycle limit)
→ Return final answer: 22.5
```

### Example 2: Handling Tool Errors

```typescript
await agent.invoke([
  new HumanMessage('Calculate 10 / 0')
]);
```

**Execution Flow:**
```
Cycle 1: "I need to divide 10 / 0"
        → Call divide(10, 0)
        → Observe: ERROR - "Cannot divide by zero"

(Agent evaluates error observation and responds)
→ Return: "I cannot divide by zero. Would you like me to try a different operation?"
```

### Example 3: Multi-Tool Workflow

```typescript
const agent = new Agent({
  model: 'gpt-4o',
  maxRetries: 5, // More cycles for complex workflow
  tools: [search, fetch_data, analyze, generate_report]
});

await agent.invoke([
  new HumanMessage('Find the latest stock price for AAPL and analyze the trend')
]);
```

**Possible Execution:**
```
Cycle 1: "I need to search for AAPL stock data"
        → Call search("AAPL stock")
        → Observe: Found 3 results

Cycle 2: "I need to fetch the detailed data"
        → Call fetch_data("AAPL ticker data")
        → Observe: [Historical prices, volumes, etc.]

Cycle 3: "Now I need to analyze this data"
        → Call analyze(historical_data)
        → Observe: Uptrend detected, +5% this month

Cycle 4: "I should generate a report"
        → Call generate_report(analysis_results)
        → Observe: Report generated successfully

Cycle 5: Agent provides final response with complete analysis
```

## Impact on maxRetries Values

### Low Cycle Limits (maxRetries = 1-2)
- ✓ Fast responses
- ✓ Controlled complexity
- ✗ Limited problem-solving depth
- Use for: Simple queries, quick answers

```typescript
const quickAgent = new Agent({
  model: 'llama2',
  maxRetries: 1, // Only one tool call
  tools: [lookup, format]
});
```

### Medium Cycle Limits (maxRetries = 3-5)
- ✓ Good balance of speed and capability
- ✓ Handles multi-step problems well
- ✗ Still limited for very complex workflows
- Use for: Standard multi-step tasks, most applications

```typescript
const balancedAgent = new Agent({
  model: 'gpt-4o',
  maxRetries: 3, // Typical multi-step workflow
  tools: [search, analyze, format]
});
```

### High Cycle Limits (maxRetries = 5-10)
- ✓ Can handle very complex workflows
- ✓ Flexible problem-solving
- ✗ Slower responses
- ✗ Higher token costs (if using cloud)
- Use for: Complex workflows, research tasks, orchestration

```typescript
const powerfulAgent = new Agent({
  model: 'gpt-4o',
  maxRetries: 10, // Complex multi-phase workflow
  tools: [query_db, fetch_api, analyze, transform, validate, format, store]
});
```

## When an Agent Stops

The ReAct loop stops in these cases:

1. **Agent Provides Final Answer**
   ```
   Agent output doesn't match tool calling format → Returns response
   ```

2. **Cycle Limit Reached**
   ```
   observationCycles >= maxRetries → Stops and returns current response
   ```

3. **Tool Error on Last Cycle**
   ```
   Last tool call failed → Agent still returns what it has
   ```

## Key Differences from Tool Retry Logic

| Aspect | Old Tool Retry | New Observation Cycles |
|--------|---|---|
| **What it controls** | Individual tool retries | Total ReAct cycles |
| **Counting** | Only failed attempts | All tool executions |
| **Agent flexibility** | Limited (stuck on one tool) | High (can choose different tools) |
| **Error handling** | Automatic retry | Agent decides next action |
| **Best for** | Simple, single-tool tasks | Complex, multi-step workflows |

## Debugging Observation Cycles

To debug how many cycles your agent is using, check the logs:

```typescript
// The agent logs when it reaches cycle limit:
[INFO] Reached maximum observation cycles (3). Stopping ReAct loop.
```

You can also track cycles by examining the ReAct steps in your agent's internal state.

## Best Practices

1. **Start Conservative**
   ```typescript
   // Start with low cycles and increase if needed
   maxRetries: 3 // Most use cases
   ```

2. **Monitor Response Time**
   ```typescript
   // Each cycle adds latency
   // More cycles = slower responses
   ```

3. **Match Workflow Complexity**
   ```typescript
   // Simple lookup: 1-2 cycles
   // Multi-step analysis: 3-5 cycles
   // Complex orchestration: 5-10 cycles
   ```

4. **Account for Token Usage**
   ```typescript
   // With cloud models, more cycles = more tokens
   // More tokens = higher costs
   ```

5. **Test Different Limits**
   ```typescript
   const testAgent = new Agent({
     // Try: 1, 2, 3, 5, 10
     // Find the sweet spot for your use case
     maxRetries: 3
   });
   ```

## Example: Tuning maxRetries

```typescript
import { Agent } from 'monan';

// Test configuration
const scenarios = [
  { task: "Simple calculation", expectedCycles: 1, maxRetries: 2 },
  { task: "Multi-step analysis", expectedCycles: 3, maxRetries: 4 },
  { task: "Complex workflow", expectedCycles: 5, maxRetries: 6 }
];

for (const scenario of scenarios) {
  const agent = new Agent({
    name: scenario.task,
    model: 'gpt-4o',
    maxRetries: scenario.maxRetries,
    tools: [/* your tools */]
  });

  console.log(`Testing: ${scenario.task}`);
  console.log(`  Expected cycles: ${scenario.expectedCycles}`);
  console.log(`  Configured maxRetries: ${scenario.maxRetries}`);
}
```

## Migration Guide

If you were relying on tool retry behavior before:

**Before (Tool Retry Logic):**
```typescript
// This would retry a failed tool up to 5 times
const agent = new Agent({
  maxRetries: 5,
  tools: [unreliableAPI]
});
```

**After (Observation Cycles):**
```typescript
// This allows up to 5 observation cycles
// If a tool fails, agent evaluates the error
// and decides what to do next
const agent = new Agent({
  maxRetries: 5,
  tools: [unreliableAPI, fallbackAPI, cache]
});
```

The new behavior is actually MORE robust because the agent can try fallback options instead of just retrying the same tool.
