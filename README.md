# 🔥 Monan SDK

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

> **Local Models:** All models available on [Ollama](https://ollama.com/search) can be used. Just pay attention to the string formatting: `<model-name>:<parameter-amount>`.

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
  .add(researcher, { task: "Search about Bun vs Node" })
  .add(writer, { task: "Write a summary based on research" })
  .build();
```

To run the workflow:

```bash
monan run blogFlow:src.agent
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