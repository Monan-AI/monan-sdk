// src/cli/templates.ts

export const templates = {
  // 1. Configurações de Raiz
  packageJson: (name: string) => JSON.stringify({
    name: name,
    version: "0.1.0",
    module: "src/index.ts",
    type: "module",
    scripts: {
      "dev": "monan test",
      "start": "monan run"
    },
    dependencies: {
      "monan-sdk": "latest",
      "zod": "^3.22.4"
    },
    devDependencies: {
      "@types/bun": "latest"
    },
    peerDependencies: {
      "typescript": "^5.0.0"
    }
  }, null, 2),

  tsconfig: JSON.stringify({
    compilerOptions: {
      lib: ["ESNext"],
      module: "esnext",
      target: "esnext",
      moduleResolution: "bundler",
      moduleDetection: "force",
      allowImportingTsExtensions: true,
      noEmit: true,
      composite: true,
      strict: true,
      downlevelIteration: true,
      skipLibCheck: true,
      jsx: "react-jsx",
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
      allowJs: true,
      types: ["bun-types"]
    }
  }, null, 2),

  env: `# OpenRouter API Key (Optional if running local Ollama)
OPEN_ROUTER_API_KEY=sk-or-v1-...

# API Keys for specific tools
WEATHER_API_KEY=
DATABASE_URL=file:./dev.db
`,

  // 2. Arquivos de Código Fonte (src)
  
  // src/types/index.ts
  typesIndex: `export interface Context {
  userId?: string;
  requestId: string;
}
`,

  // src/tools/math.ts
  toolMath: `import { tool, extractTools } from 'monan-sdk';
import { z } from 'zod';

class CalculatorTools {
  add = tool({
    name: 'add',
    description: 'Calculates the sum of two numbers',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
    execute: async ({ a, b }) => {
      return { result: a + b };
    },
  });
}

export const mathTools = extractTools(new CalculatorTools());
`,

  // src/prompts/system.ts
  promptSystem: `export const BASE_SYSTEM_PROMPT = \`You are a helpful assistant running on the Monan Framework.
Your goal is to assist the user efficiently.
Always allow for tool usage when calculation or data retrieval is needed.\`;
`,

  // src/agents/basic.ts
  agentBasic: `import { Agent } from 'monan-sdk';
import { mathTools } from '../tools/math';
import { BASE_SYSTEM_PROMPT } from '../prompts/system';

export const basicAgent = new Agent({
  name: "HelperBot",
  model: "qwen2.5-coder:7b", // Change to your preferred local model
  description: "A general purpose assistant with math capabilities.",
  systemPrompt: BASE_SYSTEM_PROMPT,
  tools: mathTools,
  config: {
    temperature: 0.7
  }
});
`,

  // src/orchestrators/main.ts
  orchestratorMain: `import { HyperAgent } from 'monan-sdk';
import { basicAgent } from '../agents/basic';

// Example of a Manager agent that oversees others
export const mainSquad = new HyperAgent({
  name: "SquadLead",
  model: "llama3:8b", // Managers usually need smarter models
  agents: [basicAgent],
  description: "Manages user requests and delegates calculation tasks to the HelperBot."
});
`
};