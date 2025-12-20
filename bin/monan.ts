import { Command } from 'commander';
import { Elysia } from 'elysia';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import { mkdir } from 'node:fs/promises';
import { loadAgent } from '../src/cli/loader';
import { templates } from '../src/cli/templates';
import { join } from 'node:path';

import packageJson from '../package.json';

const program = new Command();

program
  .name('monan')
  .description('The Ultimate SDK for Native AI Agents on Bun')
  .version(packageJson.version);

program
  .command('init <project-name>')
  .description('Create a new Monan project with enterprise structure')
  .action(async (projectName) => {
    const spinner = ora(`Scaffolding project in ./${projectName}...`).start();
    const root = join(process.cwd(), projectName);

    try {
      // 1. Create folder structure
      const dirs = [
        root,
        join(root, 'src'),
        join(root, 'src/agents'),
        join(root, 'src/tools'),
        join(root, 'src/prompts'),
        join(root, 'src/orchestrators'),
        join(root, 'src/types'),
      ];

      for (const dir of dirs) {
        await mkdir(dir, { recursive: true });
      }

      // 2. Create Root Files
      await Bun.write(join(root, 'package.json'), templates.packageJson(projectName));
      await Bun.write(join(root, 'tsconfig.json'), templates.tsconfig);
      await Bun.write(join(root, '.env'), templates.env);
      
      // Create basic .gitignore
      await Bun.write(join(root, '.gitignore'), `# dependencies (bun install)
node_modules

# output
out
dist
*.tgz

# code coverage
coverage
*.lcov

# logs
logs
_.log
report.[0-9]_.[0-9]_.[0-9]_.[0-9]_.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# caches
.eslintcache
.cache
*.tsbuildinfo

# IntelliJ based IDEs
.idea

# Finder (MacOS) folder config
.DS_Store`);

      // 3. Create source code files (SRC)
      await Bun.write(join(root, 'src/types/index.ts'), templates.typesIndex);
      await Bun.write(join(root, 'src/tools/math.ts'), templates.toolMath);
      await Bun.write(join(root, 'src/prompts/system.ts'), templates.promptSystem);
      await Bun.write(join(root, 'src/agents/basic.ts'), templates.agentBasic);
      await Bun.write(join(root, 'src/orchestrators/main.ts'), templates.orchestratorMain);

      spinner.succeed(chalk.green(`Project ${projectName} created successfully!`));

      // 4. Final Instructions
      console.log(`\n${chalk.bold('Next steps:')}`);
      console.log(`  ${chalk.cyan(`cd ${projectName}`)}`);
      console.log(`  ${chalk.cyan('bun install')}        ${chalk.dim('(Installs dependencies)')}`);
      console.log(`  ${chalk.cyan('monan test basicAgent:src/agents/basic')}  ${chalk.dim('(Test single agent)')}`);
      console.log(`  ${chalk.cyan('monan test mainSquad:src/orchestrators/main')}   ${chalk.dim('(Test hyper agent)')}`);
      console.log();

    } catch (error) {
      spinner.fail(chalk.red('Failed to create project.'));
      console.error(error);
      process.exit(1);
    }
  });