<div align="center">
  <img src="images/Monan typograph transparent.svg" alt="Monan SDK" width="400"/>

  <div align="center">
  <h3>Your framework for creating secure agents.</h3>
</div>
  
  <a href="LICENSE" target="_blank"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
  <a href="https://bun.sh" target="_blank"><img src="https://img.shields.io/badge/built%20with-Bun-black" alt="Built with Bun"></a>
  <a href="https://www.typescriptlang.org/" target="_blank"><img src="https://img.shields.io/badge/language-TypeScript-3178c6" alt="TypeScript"></a>
  <a href="https://github.com/Monan-AI/monan-sdk" target="_blank"><img src="https://img.shields.io/badge/status-Alpha-yellow" alt="Status"></a>
</div>

> *Monan is currently in active development (Alpha). Some features may change. We welcome community collaboration via PRs, Issues, and feedback to help us reach version 1.0.*

> **The Ultimate SDK for Native AI Agents on Bun.**
> Build, orchestrate, and scale local agents with bare-metal performance, embedded vectors, and complex workflows.

**Monan** is a framework designed to eliminate the latency and complexity of AI orchestration. Unlike Python-based solutions, Monan leverages [Bun's](https://bun.sh) native architecture to offer local inference, SQLite vector storage, and workflow orchestration in a single, cohesive tool.

## 🚀 Installation

```bash
bun add monan
```

To use the CLI (required to run and test):

```bash
bun add -g monan
```

## ⚡ Quick Start

In Monan, you define your agent in code, but execution (Chat or API) is managed by the CLI. This ensures optimization and standardization.

> **⚠️ Local Models:** All models available on [Ollama](https://ollama.com/search) can be used. Just pay attention to the string formatting: `<model-name>:<parameter-amount>`. **Important:** When using local models, you must run `ollama serve` in a separate terminal before executing your agent.

> **Cloud Models:** We support [OpenRouter](https://openrouter.ai/) for access to OpenAI, Anthropic, and others.

**1. Create the file `agent.ts` inside the `src` folder:**

```typescript
import { Agent } from 'monan';

// Define and export your agent
export const assistant = new Agent({
  name: "SupportBot",
  model: 'qwen3-vl:30b', // Default local model
  description: "A helpful assistant to answer questions.",
  // Optional: Pre-define default behaviors
  config: {
    temperature: 0.2,
    maxTokens: 1000
  }
});
```

**2. Run in Terminal (Interactive Mode):**
Simulates a chat for quick testing.

```bash
monan test assistant:src.agent
```

**3. Run as API (Production Mode):**
Automatically spins up an optimized Elysia server.

```bash
monan run assistant:src.agent --port 3000
# Endpoint available at: http://localhost:3000
# Docs: http://localhost:3000/docs
```

## ☁️ OpenRouter & Privacy (PII Masking)

Not everyone has a GPU rig. Monan integrates natively with **OpenRouter**, allowing you to use external providers (OpenAI, Anthropic, Gemini) easily.

**Security First:** When using external providers, Monan enables **PII Masking** by default (`maskPII: true`). This automatically redacts sensitive data (emails, phone numbers, API keys) *before* sending the context to the cloud.

```typescript
import { Agent } from 'monan';

const cloudAgent = new Agent({
  name: "CloudAssistant",
  // Use OpenRouter model naming
  model: "openai/gpt-5.2-pro",
  // Token can also be set via OPEN_ROUTER_API_KEY env var
  openRouterToken: "<your-api-token>", 
  // Privacy Settings
  maskPII: true, // Default is true for external calls. Set to false to disable.
  description: "Uses GPT-5.2 but masks sensitive user data."
});
```

## 🎯 Custom System Prompts

Define custom system prompts to guide your agent's behavior and personality. If no `systemPrompt` is provided, Monan automatically generates one based on the agent's name and description.

```typescript
import { Agent } from 'monan';

const specialistAgent = new Agent({
  name: "DataAnalyst",
  model: "qwen3-vl:30b",
  description: "Analyzes complex datasets",
  // Custom system prompt for precise behavior
  systemPrompt: `You are a senior data analyst with 10 years of experience.
Your role is to:
1. Analyze data patterns and anomalies
2. Provide actionable insights
3. Present findings with statistical confidence levels
4. Suggest improvements based on data trends

Always be precise, use data-driven reasoning, and provide sources for your claims.`,
  config: {
    temperature: 0.2,
    maxTokens: 2048
  }
});
```

**System Prompt Priority:**
- If `systemPrompt` is provided, it will be used as the primary system instruction
- If not provided, Monan automatically generates: `"You are {name}. {description}"`
- If additional system messages are in the message history, the system prompt is prepended to them

## 🔧 Advanced Usage: LoRA & Adapters

Small local models often struggle with specific instructions. To use **LoRA/QLoRA adapters** locally, you must create a custom model in Ollama first. This ensures maximum performance by merging the adapter weights at the engine level.

**Step 1: Create a `Modelfile`**
Create a file named `Modelfile` in your project root:

```dockerfile
FROM gemma3:4b
# Path to your GGUF adapter
ADAPTER ./adapters/finance-v1.gguf
# Optional: Set default parameters for this specific LoRA
PARAMETER temperature 0.2
```

**Step 2: Build the Custom Model**
Run this command in your terminal:

```bash
ollama create finance-expert -f Modelfile
```

**Step 3: Use the Model in Monan**
Now, simply refer to your new custom model by name.

```typescript
const specializedAgent = new Agent({
  name: "FinanceExpert",
  model: "finance-expert", // <--- The name you created in Step 2
  description: "A specialized agent for financial analysis using a custom LoRA."
});
```

## 🚦 Model Routing

For complex systems, you shouldn't use a heavy model for everything. The **Router** allows you to dynamically direct requests to the most appropriate agent based on intent or complexity.

```typescript
import { Router, Agent } from 'monan';

const fastAgent = new Agent({ model: "gemma3:4b" }); // Fast, cheap
const smartAgent = new Agent({ model: "openai/gpt-5.2-pro" }); // Smart, expensive 

// The Router acts as the entry point
export const mainRouter = new Router({
  // You can use a fine-tuned router model created via Modelfile (see above)
  model: "router-custom-v2", 
  default: fastAgent, // Default to the cheap model
  routes: [
    { 
      intent: "coding_complex", 
      description: "Complex coding tasks or architecture planning",
      agent: smartAgent 
    },
    { 
      intent: "casual_chat", 
      description: "General conversation and greetings",
      agent: fastAgent 
    }
  ]
});

// Run the router just like an agent
// monan run mainRouter:src.router
```

## 🔀 Workflow Orchestration

Monan features a powerful and **Open Source** orchestration engine. You can chain agents, run tasks in parallel, and integrate custom tools.

```typescript
import { Agent, Workflow } from 'monan';
import { tool } from 'monan/tools';

// --- Tools ---
class SearchTools {
  @tool({ name: "web_search", description: "Search the web." })
  async search(query: string) { return `Results for: ${query}`; }
}

// --- Agents ---
const researcher = new Agent({ 
  name: "researcher", 
  model: 'qwen3-vl:8b', 
  tools: [new SearchTools()] 
});

const writer = new Agent({ name: "writer", model: 'qwen3-vl:30b' });

// --- Workflow ---
export const blogFlow = new Workflow()
  .add(researcher)
  .add(writer)
  .build();
```

To run the workflow:

```bash
monan run blogFlow:src.agent
```

## 🛠️ Advanced Tool System

Monan provides a **type-safe, self-documenting tool system** with automatic validation using Zod. Tools are defined as properties and automatically integrated into agent context.

### Quick Start: Creating Your First Tool

The simplest way to create a tool is as a property in a class:

```typescript
import { tool, extractTools } from 'monan';
import { z } from 'zod';

class WeatherTools {
  getTemperature = tool({
    description: "Get current temperature for a city",
    inputSchema: z.object({
      city: z.string()
    }),
    execute: async (input: { city: string }) => {
      // Your implementation here
      return { temperature: 22, unit: "°C", city: input.city };
    }
  });
}

// That's it! Create an instance and extract tools
const weatherTools = new WeatherTools();
const tools = extractTools(weatherTools);
```

### Using Tools with Agents

Once extracted, tools integrate seamlessly with agents:

```typescript
import { Agent } from 'monan';

const weatherAgent = new Agent({
  name: "WeatherBot",
  model: "qwen3-vl:30b",
  description: "Provides weather information and forecasts",
  tools: tools // Automatically makes tools available to the agent
});
```

The agent now has access to all your tools and will intelligently decide when to use them based on user queries.

### Creating Tools with Type Safety

```typescript
import { tool, extractTools } from 'monan';
import { z } from 'zod';

class CalculatorTools {
  add = tool({
    name: 'add',
    description: "Add two numbers and return the result",
    inputSchema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    }),
    execute: async (input: { a: number; b: number }) => {
      return { result: input.a + input.b };
    }
  });

  multiply = tool({
    name: 'multiply',
    description: "Multiply two numbers",
    inputSchema: z.object({
      x: z.number(),
      y: z.number()
    }),
    execute: async (input: { x: number; y: number }) => {
      return { result: input.x * input.y };
    }
  });
}

// Extract all tools from the class
const calculatorTools = new CalculatorTools();
const tools = extractTools(calculatorTools);

// Use with an Agent
const mathAgent = new Agent({
  name: "MathExpert",
  model: "qwen3-vl:30b",
  description: "An agent specialized in mathematical calculations",
  tools: tools
});
```

### Tool Features

✅ **Type-Safe Inputs**: Automatic Zod validation ensures correct input types  
✅ **Self-Documenting**: Descriptions and schemas automatically visible to LLM  
✅ **Error Handling**: Graceful failure with descriptive validation messages  
✅ **Performance**: Optimized for Bun runtime with zero overhead  
✅ **Composable**: Multiple tool classes per agent for clean organization  
✅ **Async Support**: All tools support async/await for API calls and I/O

### Tool Input Validation

All tool inputs are automatically validated against their Zod schemas before execution. Invalid inputs never reach your code:

```typescript
class DataTools {
  fetchUser = tool({
    name: 'fetchUser',
    description: "Fetch user data by ID",
    inputSchema: z.object({
      userId: z.string().uuid("Must be a valid UUID"),
      includeMetadata: z.boolean().optional()
    }),
    execute: async (input: { userId: string; includeMetadata?: boolean }) => {
      // Input is GUARANTEED to be valid here
      // userId is a valid UUID, includeMetadata is boolean or undefined
      return { id: input.userId, name: "John Doe" };
    }
  });
}
```

**Validation Example:**
```typescript
// ✅ Valid call - works perfectly
await userTool.execute({ userId: "550e8400-e29b-41d4-a716-446655440000" });

// ❌ Invalid call - validation error with helpful message
// Error: Tool validation failed: userId must be a valid UUID
await userTool.execute({ userId: "invalid-id" });
```

### Real-World Example: API Integration

Here's a practical example integrating with external APIs:

```typescript
import { tool, extractTools } from 'monan';
import { z } from 'zod';

class ApiTools {
  searchRepositories = tool({
    name: 'searchRepositories',
    description: "Search GitHub repositories by keyword",
    inputSchema: z.object({
      query: z.string().min(1, "Search query required"),
      limit: z.number().int().min(1).max(100).default(10)
    }),
    execute: async (input: { query: string; limit: number }) => {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(input.query)}&per_page=${input.limit}`
      );
      const data = await response.json();
      return {
        total: data.total_count,
        repositories: data.items.map(r => ({
          name: r.name,
          url: r.html_url,
          stars: r.stargazers_count,
          description: r.description
        }))
      };
    }
  });

  getWeather = tool({
    description: "Get weather forecast for a location",
    inputSchema: z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      days: z.number().int().min(1).max(7).default(1)
    }),
    execute: async (input: { lat: number; lon: number; days: number }) => {
      // Call your weather API
      return { temperature: 22, forecast: "Sunny" };
    }
  });
}

const apiTools = new ApiTools();
const tools = extractTools(apiTools);

const assistantAgent = new Agent({
  name: "Assistant",
  model: "qwen3-vl:30b",
  tools: tools
});
```

### Advanced: Custom Validation Rules

Add custom validation logic beyond basic type checking:

```typescript
import { tool } from 'monan';
import { z } from 'zod';

class AdvancedTools {
  transfer = tool({
    description: "Transfer funds between accounts",
    inputSchema: z.object({
      fromAccount: z.string(),
      toAccount: z.string(),
      amount: z.number()
        .positive("Amount must be positive")
        .max(10000, "Cannot transfer more than 10,000")
    }).refine(
      (data) => data.fromAccount !== data.toAccount,
      { message: "Cannot transfer to the same account" }
    ),
    execute: async (input) => {
      // This only runs if all validations pass
      return { success: true, transactionId: "TXN-001" };
    }
  });
}
```

### Using Multiple Tool Classes

Organize tools by domain and combine them in a single agent:

```typescript
import { tool, extractTools } from 'monan';

class DatabaseTools {
  query = tool({
    description: "Execute database query",
    inputSchema: z.object({ sql: z.string() }),
    execute: async (input) => ({ rows: [] })
  });
}

class FileTools {
  readFile = tool({
    description: "Read file contents",
    inputSchema: z.object({ path: z.string() }),
    execute: async (input) => ({ content: "" })
  });
}

class NetworkTools {
  fetchUrl = tool({
    description: "Fetch URL contents",
    inputSchema: z.object({ url: z.string().url() }),
    execute: async (input) => ({ html: "" })
  });
}

// Combine all tools
const allTools = [
  ...extractTools(new DatabaseTools()),
  ...extractTools(new FileTools()),
  ...extractTools(new NetworkTools())
];

const omniscientAgent = new Agent({
  name: "OmniscientAssistant",
  model: "qwen3-vl:30b",
  tools: allTools
});
```

### Best Practices

**1. Clear Descriptions**
```typescript
// ❌ Bad - Vague description
const badTool = tool({
  description: "Do something",
  inputSchema: z.object({ x: z.string() }),
  execute: async (input) => ({})
});

// ✅ Good - Clear, specific description
const goodTool = tool({
  description: "Convert email address to lowercase and validate format",
  inputSchema: z.object({ 
    email: z.string().email("Valid email required") 
  }),
  execute: async (input) => ({ normalized: input.email.toLowerCase() })
});
```

**2. Descriptive Field Names in Schemas**
```typescript
// ✅ Good - LLM understands context
inputSchema: z.object({
  sourceAccountId: z.string().describe("Account ID of sender"),
  destinationAccountId: z.string().describe("Account ID of recipient"),
  amountUSD: z.number().describe("Amount in US dollars")
})
```

**3. Proper Error Handling**
```typescript
fetchData = tool({
  description: "Fetch data from external API",
  inputSchema: z.object({ url: z.string().url() }),
  execute: async (input) => {
    try {
      const response = await fetch(input.url, { timeout: 5000 });
      if (!response.ok) {
        return { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return { data: await response.json() };
    } catch (error) {
      return { error: `Failed to fetch: ${error.message}` };
    }
  }
})
```

**4. Keep Tools Focused**
```typescript
// ❌ Bad - Too many responsibilities
extractData = tool({
  description: "Extract, transform, validate, and persist data",
  // ...
});

// ✅ Good - Single responsibility
const tools = [
  tool({ description: "Extract data from source", /* ... */ }),
  tool({ description: "Transform extracted data", /* ... */ }),
  tool({ description: "Validate data structure", /* ... */ }),
  tool({ description: "Persist data to storage", /* ... */ })
];
```

## 🧠 Embeddings & Local Memory

Monan uses `bun:sqlite`'s native optimization alongside Hugging Face models to create instant RAG.

```typescript
import { LocalEmbeddings } from 'monan/embeddings';
import { SQLiteVectorStore } from 'monan/memory';

const embedder = new LocalEmbeddings({ model: "BAAI/bge-large-en-v1.5" });

const memory = new SQLiteVectorStore({ 
  path: "./monan.db", 
  embedder 
});

export const memoryAgent = new Agent({
  name: "RecallBot",
  knowledgeBase: memory
});
```

## 💻 CLI Commands

The CLI is the heart of Monan:

  * `monan init <project-name>`: Creates a new project with the boilerplate structure.
  * `monan test <agent-var-name>:<file>`: Runs the agent/workflow in the terminal for debugging.
  * `monan run <agent-var-name>:<file>`: Spins up the production server (Elysia API).
  * `monan save <agent-var-name>:<file>`: **Indexes your agent** for the UI.

## 💎 Plans

We believe powerful tools should be accessible. **The UI is now included in the Community Plan.**

| Feature | **Community** (Free) | **Enterprise** |
| :--- | :---: | :---: |
| Framework SDK (Open Source) | ✅ | ✅ |
| CLI & Local Inference | ✅ | ✅ |
| **Monan UI** (Visual Interface) | ✅ | ✅ |
| OpenRouter Integration | ✅ | ✅ |
| Workflow Orchestration | ✅ | ✅ |
| **KPIs & Metrics Dashboard** | ❌ | ✅ |
| **Audit Logs (Compliance)** | ❌ | ✅ |
| **SSO & RBAC** | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ |

> **Community Plan:** Includes everything you need to build, deploy, and visualize your agents locally.
> **Enterprise Plan:** Designed for companies requiring governance, detailed metrics, and SLA support.

## ⭐ Support the Project

We are building the future of Local AI in JavaScript/Bun. If you enjoy Monan's performance:

1.  Give this repository a **Star ⭐️ (Help us reach our goal of 100 stars\!)**.
2.  Open an **Issue** with suggestions.
3.  Comment in discussions about how you are using Monan.

-----

Built with ❤️ using [Bun](https://bun.sh).