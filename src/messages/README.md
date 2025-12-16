# Message Classes

The Monan SDK provides typed message classes for better type safety, metadata support, and semantic clarity when working with AI agent conversations.

## Overview

Instead of using plain objects with just `role` and `content`, the SDK now offers specialized message classes:

- **`BaseMessage`** - Abstract base class for all messages
- **`HumanMessage`** - Messages from users
- **`AIMessage`** - Responses from the AI assistant
- **`SystemMessage`** - System prompts and instructions
- **`ToolMessage`** - Results from tool executions

## Usage

### Basic Example

```typescript
import { Agent, HumanMessage, AIMessage, SystemMessage } from 'monan-sdk';

const agent = new Agent({
  name: 'Assistant',
  model: 'llama2',
  description: 'A helpful assistant',
});

// Create typed messages
const messages = [
  new SystemMessage('You are a helpful assistant.'),
  new HumanMessage('What is TypeScript?'),
];

const response = await agent.invoke(messages);
console.log(response.content);
```

### HumanMessage

Represents a message from a user:

```typescript
// Simple message
const msg = new HumanMessage('What is async/await?');

// Message with optional name (for multi-participant conversations)
const namedMsg = new HumanMessage(
  'What is async/await?',
  'John'
);

// Message with metadata
const metadataMsg = new HumanMessage(
  'What is async/await?',
  'John',
  {
    userId: 'user123',
    timestamp: new Date().toISOString(),
    sessionId: 'session456'
  }
);
```

### AIMessage

Represents a response from the AI assistant:

```typescript
// Simple response
const msg = new AIMessage('Async/await is...');

// Response with tool calls (for ReAct pattern)
const withTools = new AIMessage(
  'I need to search for information.',
  [
    { toolName: 'search', toolInput: { query: 'async await' } }
  ]
);
```

### SystemMessage

Provides system-level instructions:

```typescript
// Basic system prompt
const sys = new SystemMessage(
  'You are a helpful programming assistant.'
);

// With custom name
const namedSys = new SystemMessage(
  'You are a helpful programming assistant.',
  'System'
);
```

### ToolMessage

Represents the result of a tool execution:

```typescript
// Successful tool result
const result = new ToolMessage(
  'search',           // toolName
  { results: [...] }, // result
  undefined,          // error (optional)
  'Tool'              // name
);

// Tool error
const error = new ToolMessage(
  'search',
  undefined,
  'Connection timeout',
  'Tool'
);
```

## Key Features

### Automatic JSON Serialization

All message classes provide a `toJSON()` method that properly serializes them for API calls:

```typescript
const msg = new HumanMessage('Hello');
const json = msg.toJSON();
// { role: 'user', content: 'Hello' }
```

### Metadata Support

All messages support optional metadata for tracking and context:

```typescript
const msg = new HumanMessage('Question', undefined, {
  userId: 'user123',
  source: 'web',
  timestamp: Date.now()
});
```

### Type Safety

Using message classes provides:
- Better IDE autocompletion
- Compile-time type checking
- Clear semantic meaning in code
- Easier refactoring

### Tool Call Tracking (AIMessage)

The `AIMessage` class can track tool calls for the ReAct pattern:

```typescript
const msg = new AIMessage(
  'I need to use a tool',
  [
    { 
      toolName: 'calculator', 
      toolInput: { operation: 'add', a: 5, b: 3 } 
    }
  ]
);

console.log(msg.toolCalls);
// [{ toolName: 'calculator', toolInput: { operation: 'add', a: 5, b: 3 } }]
```

## Migration Guide

### From Plain Objects

**Before:**
```typescript
const messages = [
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello' }
];

await agent.invoke(messages);
```

**After:**
```typescript
const messages = [
  new SystemMessage('You are helpful'),
  new HumanMessage('Hello')
];

await agent.invoke(messages);
```

## API Compatibility

All message classes are compatible with:
- `agent.invoke(messages)`
- `agent.stream(messages)`
- Both Ollama and OpenRouter APIs
- ReAct pattern execution

The agent automatically handles:
- JSON serialization via `toJSON()`
- Role preservation
- Name and metadata passing
- API-specific formatting
