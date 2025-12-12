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

> **All models available on [Ollama](https://ollama.com/search) can be used in this framework. Just pay attention to the string formatting: `<model-name>:<parameter-amount>`**

**1. Create the file `agent.ts` inside the `src` folder:**

```typescript
import { Agent } from 'monan';

// Define and export your agent
export const assistant = new Agent({
  name: "SupportBot",
  model: 'qwen3-vl:30b',
  description: "A helpful assistant to answer questions."
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
# You can access [http://localhost:3000/docs](http://localhost:3000/docs) to view the complete documentation.
```

## 🔀 Workflow Orchestration (Agents & Tools)

Monan features a powerful and **Open Source** orchestration engine. You can chain agents, run tasks in parallel, and integrate custom tools easily.

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
  name: "researcher-agent",
  model: 'qwen3-vl:8b', 
  description: "Searches for information",
  tools: [new SearchTools()] 
});

const analyst = new Agent({ 
  name: "analyst-agent",
  model: 'qwen3-vl:30b',
  description: "Analyzes technical data" 
});

const writer = new Agent({ 
  name: "writer-agent",
  model: 'qwen3-vl:235b',
  description: "Writes the final report" 
});

// --- Workflow ---
// The flow: Researcher searches -> (Analyst and Writer work together) -> Final Result
export const blogFlow = new Workflow()
  .add(researcher, { task: "Search about Bun vs Node" }) // Serial
  .parallel([
    { agent: analyst, task: "Analyze the technical performance" },
    { agent: writer, task: "Draft the introduction" }
  ]) // Parallel
  .converge((results) => `Generate the final post combining: ${JSON.stringify(results)}`)
  .build();
```

To run the workflow:

```bash
monan run assistant:src.agent
```

## 🧠 Embeddings & Local Memory (SQLite)

Forget Docker for running vector databases. Monan uses `bun:sqlite`'s native optimization alongside Hugging Face models to create instant RAG.

```typescript
import { LocalEmbeddings } from 'monan/embeddings';
import { SQLiteVectorStore } from 'monan/memory';

// Initialize embeddings (Local Hugging Face)
const embedder = new LocalEmbeddings({
  model: "BAAI/bge-large-en-v1.5"
});

// Local vector store (.db file)
const memory = new SQLiteVectorStore({ 
  path: "./monan.db",
  embedder: embedder 
});

// The agent automatically uses memory for retrievals
export const knowledgableAgent = new Agent({
  name: "knowledgable-agent",
  model: "ministral-3:3b",
  description: "Memory reader",
  knowledgeBase: memory
});
```

## 📄 Simplified Parsing

Monan does the "dirty work" of reading files. Inject documents directly into the user message.

```typescript
import { HumanMessage } from 'monan/schema';

// Monan handles parsing (PDF, CSV, TXT, MD) and injects into context automatically
const message = new HumanMessage({
  content: "Summarize this contract for me.",
  files: ["./contracts/services_2025.pdf"] 
});
```

## 💻 CLI Commands

The CLI is the heart of Monan:

  * `monan init <project-name>`: Creates a new project with the boilerplate structure.
  * `monan test <file>`: Runs the agent/workflow in the terminal for debugging.
  * `monan run <file>`: Spins up the production server (with Elysia API).
  * `monan save agent`: **Indexes your agent** to be viewed in the UI (Monan Pro/Business).

## 💎 Plans & Features

Monan is Open Core. The framework is free, but we offer power tools for professionals and companies.

| Feature | **Community** | **Pro** | **Business** |
| :--- | :---: | :---: | :---: |
| Framework SDK (Open Source) | ✅ | ✅ | ✅ |
| CLI & Local Inference | ✅ | ✅ | ✅ |
| Workflow Orchestration | ✅ | ✅ | ✅ |
| **Monan UI** (Visual Interface) | ❌ | ✅ | ✅ |
| **KPIs & Metrics Dashboard** | ❌ | ❌ | ✅ |
| **Specialized Support** | ❌ | ❌ | ✅ |

  * **Community:** Everything you need to build and run.
  * **Pro:** Access to the Graphical Interface to visualize chains, debug steps, and manage embeddings.
  * **Business:** Full lifecycle management, usage statistics (tokens/second), audit logs, and priority support.

> ~~Contact us for an annual contract and enterprise implementation.~~
> *(Enterprise sales temporarily closed during Alpha period)*

## ⭐ Support the Project

We are building the future of Local AI in JavaScript/Bun. If you enjoy Monan's performance:

1.  Give this repository a **Star ⭐️ (Help us reach our goal of 100 stars\!)**.
2.  Open an **Issue** with suggestions.
3.  Comment in discussions about how you are using Monan.

-----

Built with ❤️ using [Bun](https://bun.sh).