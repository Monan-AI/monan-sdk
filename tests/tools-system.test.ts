import { tool, extractTools } from '../src/tools';
import { z } from 'zod';

// Define tool classes with function-based tools
class MathTools {
  add = tool({
    name: 'add',
    description: "Add two numbers together",
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

  divide = tool({
    name: 'divide',
    description: "Divide two numbers",
    inputSchema: z.object({
      dividend: z.number(),
      divisor: z.number().refine(n => n !== 0, "Divisor cannot be zero")
    }),
    execute: async (input: { dividend: number; divisor: number }) => {
      return { result: input.dividend / input.divisor };
    }
  });
}

class StringTools {
  toUppercase = tool({
    name: 'toUppercase',
    description: "Convert text to uppercase",
    inputSchema: z.object({
      text: z.string(),
      trim: z.boolean().optional()
    }),
    execute: async (input: { text: string; trim?: boolean }) => {
      let result = input.text.toUpperCase();
      if (input.trim) result = result.trim();
      return { result };
    }
  });

  reverse = tool({
    name: 'reverse',
    description: "Reverse a string",
    inputSchema: z.object({
      text: z.string()
    }),
    execute: async (input: { text: string }) => {
      return { result: input.text.split('').reverse().join('') };
    }
  });
}

async function main() {
  console.log('=== Tool System Test ===\n');

  // Extract tools from classes
  const mathTools = new MathTools();
  const stringTools = new StringTools();

  const allTools = [
    ...extractTools(mathTools),
    ...extractTools(stringTools)
  ];

  console.log('📚 Extracted Tools:');
  allTools.forEach(tool => {
    console.log(`  ✓ ${tool.name}: ${tool.description}`);
  });
  console.log('\n');

  // Test tool execution with validation
  console.log('🧪 Testing Tool Execution:\n');

  // Test 1: Valid addition
  console.log('Test 1: Add 5 + 3');
  try {
    const addTool = allTools.find(t => t.name === 'add')!;
    const result = await addTool.execute({ a: 5, b: 3 });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}\n`);
  }

  // Test 2: Valid multiplication
  console.log('Test 2: Multiply 4 × 7');
  try {
    const multiplyTool = allTools.find(t => t.name === 'multiply')!;
    const result = await multiplyTool.execute({ x: 4, y: 7 });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}\n`);
  }

  // Test 3: String uppercase with trim
  console.log('Test 3: Convert "  hello world  " to uppercase with trim');
  try {
    const upperTool = allTools.find(t => t.name === 'toUppercase')!;
    const result = await upperTool.execute({ 
      text: '  hello world  ', 
      trim: true 
    });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}\n`);
  }

  // Test 4: Invalid division (zero divisor)
  console.log('Test 4: Divide 10 / 0 (should fail validation)');
  try {
    const divideTool = allTools.find(t => t.name === 'divide')!;
    const result = await divideTool.execute({ dividend: 10, divisor: 0 });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.log(`✓ Validation caught error: ${error}\n`);
  }

  // Test 5: Reverse string
  console.log('Test 5: Reverse "Monan SDK"');
  try {
    const reverseTool = allTools.find(t => t.name === 'reverse')!;
    const result = await reverseTool.execute({ text: 'Monan SDK' });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}\n`);
  }

  // Test 6: Type validation (wrong input type)
  console.log('Test 6: Add "5" + 3 (should fail type validation)');
  try {
    const addTool = allTools.find(t => t.name === 'add')!;
    const result = await addTool.execute({ a: '5' as any, b: 3 });
    console.log(`✓ Result: ${JSON.stringify(result)}\n`);
  } catch (error) {
    console.log(`✓ Type validation caught error: ${error}\n`);
  }

  console.log('✨ Tool system test complete!');
}

main().catch(console.error);
