import { z } from 'zod';

/**
 * Tool metadata and execution interface
 */
export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute: (input: unknown) => Promise<unknown>;
}

/**
 * Create a tool with metadata
 * Use this function-based approach for maximum compatibility with Bun
 * 
 * @example
 * ```typescript
 * class MathTools {
 *   add = tool({
 *     name: 'add',
 *     description: "Add two numbers",
 *     inputSchema: z.object({
 *       a: z.number(),
 *       b: z.number()
 *     }),
 *     execute: async (input: { a: number; b: number }) => {
 *       return { result: input.a + input.b };
 *     }
 *   });
 * }
 * ```
 */
export function tool<T = unknown>(config: {
  name?: string;
  description: string;
  inputSchema: z.ZodSchema<T>;
  execute: (input: T) => Promise<unknown> | unknown;
}) {
  const toolFn = async (input: unknown) => {
    try {
      // Validate input against schema
      const validatedInput = await config.inputSchema.parseAsync(input);
      // Execute the function with validated input
      return await Promise.resolve(config.execute(validatedInput as T));
    } catch (error) {
      throw new Error(`Tool validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Store metadata on the function
  (toolFn as any)._toolMetadata = {
    name: config.name || 'tool',
    description: config.description,
    inputSchema: config.inputSchema,
    execute: toolFn,
  } as ToolMetadata;

  return toolFn;
}

/**
 * Extract all tools from a class instance
 * Automatically discovers properties that are tools
 * 
 * @param toolClass - Class instance with tool properties
 * @returns Array of tool metadata
 */
export function extractTools(toolClass: any): ToolMetadata[] {
  const tools: ToolMetadata[] = [];

  for (const key of Object.getOwnPropertyNames(toolClass)) {
    const property = toolClass[key];

    // Check if it's a tool (has _toolMetadata)
    if (property && typeof property === 'function' && property._toolMetadata) {
      const metadata = property._toolMetadata as ToolMetadata;
      tools.push(metadata);
    }
  }

  return tools;
}

/**
 * Call a tool with automatic validation and error handling
 * 
 * @param tool - Tool metadata
 * @param input - Raw input (will be validated)
 * @returns Tool execution result
 */
export async function callTool(tool: ToolMetadata, input: unknown): Promise<string> {
  try {
    const result = await tool.execute(input);
    return JSON.stringify(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: errorMessage });
  }
}

/**
 * Format tools for agent context
 * Creates a readable format for the LLM to understand available tools
 * 
 * @param tools - Array of tool metadata
 * @returns Formatted string for LLM context
 */
export function formatToolsForContext(tools: ToolMetadata[]): string {
  if (tools.length === 0) return '';

  const toolDescriptions = tools
    .map(tool => {
      const schema = tool.inputSchema as any;
      const schemaStr = schema._def?.shape 
        ? JSON.stringify(schema._def.shape, null, 2)
        : 'See description';

      return `- **${tool.name}**: ${tool.description}\n  Input Schema: ${schemaStr}`;
    })
    .join('\n\n');

  return `Available Tools:\n${toolDescriptions}`;
}
