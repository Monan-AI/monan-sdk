import path from 'path';
import { existsSync } from 'fs';
import { Agent } from '../agent';
import { HyperAgent } from '../hyper-agent';
import { Workflow } from '../workflow';
import chalk from 'chalk';

export async function loadAgent(pointer: string) {
  // 1. Parse of the format "variable:path/file"
  const [varName, filePath] = pointer.split(':');

  if (!varName || !filePath) {
    console.error(chalk.red('Invalid format. Use: variableName:path/to/file'));
    process.exit(1);
  }

  // 2. Solve absolute path
  // Bun natively accepts .ts imports; no compilation is required.
  const absolutePath = path.resolve(process.cwd(), filePath);
  
  if (!existsSync(absolutePath) && !existsSync(absolutePath + '.ts')) {
    console.error(chalk.red(`❌ File not found: ${absolutePath}`));
    process.exit(1);
  }

  try {
    // 3. Native Dynamic Import from Bun
    const module = await import(absolutePath);

    // 4. Extract the instance
    const agentInstance = module[varName];

    if (!agentInstance) {
      console.error(chalk.red(`Export "${varName}" not found in ${filePath}`));
      process.exit(1);
    }

    // Basic validation to see if it is a valid Agent for your framework
    const isValid = agentInstance instanceof Agent || 
                    agentInstance instanceof HyperAgent || 
                    (typeof Workflow !== 'undefined' && agentInstance instanceof Workflow);

    if (!isValid) {
      console.error(chalk.red(`"${varName}" is not an instance of Agent, HyperAgent or Workflow.`));
      process.exit(1);
    }

    return agentInstance;

  } catch (error) {
    console.error(chalk.red('Error loading agent:'));
    console.error(error);
    process.exit(1);
  }
}