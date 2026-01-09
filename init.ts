#!/usr/bin/env ts-node
/**
 * Project Initialization Script
 *
 * This script helps you set up a new project from the NestJS Foundation boilerplate.
 * It will:
 * 1. Ask for project details (name, slug, database, etc.)
 * 2. Replace boilerplate values with your project values in files
 * 3. Remove boilerplate-specific sections (marked with remove_after_init_start/end)
 * 4. Set up environment files
 * 5. Initialize git with new origin
 * 6. Install dependencies (optional)
 * 7. Run database migrations (optional)
 *
 * Usage:
 *   pnpm init:project
 *   # or
 *   ts-node init.ts
 *
 * The boilerplate works out of the box with default values.
 * Running this script is optional but recommended for new projects.
 *
 * Marker Format:
 *   Use <!-- remove_after_init_start --> and <!-- remove_after_init_end -->
 *   to mark sections that should be removed after initialization.
 *   This is similar to CRA's eject mechanism.
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as readline from 'node:readline';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string): void => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string): void => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string): void => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string): void => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg: string): void =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg: string): void => console.log(`${colors.dim}→${colors.reset} ${msg}`),
  preview: (msg: string): void => console.log(`${colors.yellow}  ${msg}${colors.reset}`),
};

interface ProjectConfig {
  projectName: string;
  projectSlug: string;
  projectSnake: string;
  projectDescription: string;
  authorName: string;
  databaseUrl: string;
  testDatabaseUrl: string;
  authSecret: string;
  appName: string;
  gitOrigin: string;
  setupDatabase: boolean;
  installDeps: boolean;
}

interface Replacement {
  from: string;
  to: string;
}

interface PatternReplacement {
  regex: RegExp;
  replace: string | ((match: string, ...args: string[]) => string);
}

interface ReplacementMap {
  exact: Replacement[];
  patterns: PatternReplacement[];
}

const FILES_TO_PROCESS = [
  'package.json',
  'README.md',
  'docker-compose.yml',
  'SETUP.md',
  'AGENTS.md',
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toSnakeCase(text: string): string {
  return text.replace(/-/g, '_');
}

function isValidGitUrl(url: string): boolean {
  // Allow git@github.com:user/repo.git or https://github.com/user/repo.git
  const gitUrlPattern = /^(git@[\w.-]+:[\w./-]+\.git|https:\/\/[\w.-]+\/[\w./-]+\.git)$/;
  return gitUrlPattern.test(url);
}

function generateSecret(): string {
  try {
    return execSync('openssl rand -base64 32', { encoding: 'utf-8' }).trim();
  } catch {
    // Fallback using Node.js crypto module (cryptographically secure)
    return randomBytes(32).toString('base64');
  }
}

async function promptUser(): Promise<ProjectConfig> {
  log.title('🚀 NestJS Foundation - Project Initialization');

  log.info('This wizard will help you set up a new project from the boilerplate.');
  log.info('The boilerplate works out of the box - this step is optional.');
  console.log();

  // Project name
  const projectName = await question(
    `${colors.cyan}Project name${colors.reset} (e.g., "My Awesome API"): `
  );
  if (!projectName.trim()) {
    log.error('Project name is required!');
    process.exit(1);
  }

  // Project slug
  const defaultSlug = slugify(projectName);
  const projectSlugInput = await question(
    `${colors.cyan}Project slug${colors.reset} (${colors.dim}${defaultSlug}${colors.reset}): `
  );
  const projectSlug = projectSlugInput.trim() || defaultSlug;
  const projectSnake = toSnakeCase(projectSlug);

  // Project description
  const projectDescription = await question(
    `${colors.cyan}Project description${colors.reset} (optional): `
  );

  // Author name
  let defaultAuthor = '';
  try {
    defaultAuthor = execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    // Ignore if git config is not available
  }
  const authorInput = await question(
    `${colors.cyan}Author name${colors.reset} ${defaultAuthor ? `(${colors.dim}${defaultAuthor}${colors.reset})` : ''}: `
  );
  const authorName = authorInput.trim() || defaultAuthor;

  // Database setup
  const setupDbInput = await question(
    `${colors.cyan}Set up local PostgreSQL database?${colors.reset} (y/N): `
  );
  const setupDatabase = setupDbInput.toLowerCase() === 'y';

  let databaseUrl: string;
  let testDatabaseUrl: string;

  if (setupDatabase) {
    log.step('Using Docker Compose for PostgreSQL...');
    databaseUrl = `postgresql://postgres:postgres@localhost:5432/${projectSnake}?sslmode=disable`;
    testDatabaseUrl = `postgresql://postgres:postgres@localhost:5433/${projectSnake}_test?sslmode=disable`;
  } else {
    databaseUrl = await question(`${colors.cyan}Database URL${colors.reset}: `);
    testDatabaseUrl = await question(`${colors.cyan}Test Database URL${colors.reset}: `);
  }

  // Auth secret
  const defaultAuthSecret = generateSecret();
  const authSecretInput = await question(
    `${colors.cyan}AUTH_SECRET${colors.reset} (${colors.dim}auto-generated${colors.reset}): `
  );
  const authSecret = authSecretInput.trim() || defaultAuthSecret;

  // App name for emails
  const appNameInput = await question(
    `${colors.cyan}App name for emails${colors.reset} (${colors.dim}${projectName}${colors.reset}): `
  );
  const appName = appNameInput.trim() || projectName;

  // Git origin
  const gitOriginInput = await question(
    `${colors.cyan}Git remote origin URL${colors.reset} (optional, e.g., git@github.com:user/repo.git): `
  );
  const gitOrigin = gitOriginInput.trim();

  // Validate git URL format if provided
  if (gitOrigin && !isValidGitUrl(gitOrigin)) {
    log.error(
      'Invalid git URL format. Expected: git@host:user/repo.git or https://host/user/repo.git'
    );
    process.exit(1);
  }

  // Install dependencies
  const installDepsInput = await question(
    `${colors.cyan}Install dependencies now?${colors.reset} (Y/n): `
  );
  const installDeps = installDepsInput.toLowerCase() !== 'n';

  console.log();

  return {
    projectName,
    projectSlug,
    projectSnake,
    projectDescription: projectDescription || projectName,
    authorName,
    databaseUrl,
    testDatabaseUrl,
    authSecret,
    appName,
    gitOrigin,
    setupDatabase,
    installDeps,
  };
}

function buildReplacementMap(config: ProjectConfig): ReplacementMap {
  return {
    exact: [
      { from: 'nestjs-foundation', to: config.projectSlug },
      { from: 'nestjs_foundation', to: config.projectSnake },
      { from: 'NestJS Foundation', to: config.projectName },
      { from: 'Production-ready NestJS boilerplate', to: config.projectDescription },
      { from: 'Novo Studio', to: config.authorName },
    ],
    patterns: [
      {
        regex: /nestjs-foundation-(postgres|app|postgres-test|app-dev)/g,
        replace: (_match: string, suffix: string) => `${config.projectSlug}-${suffix}`,
      },
      {
        regex: /nestjs_foundation_(test)/g,
        replace: (_match: string, suffix: string) => `${config.projectSnake}_${suffix}`,
      },
    ],
  };
}

function smartReplace(filePath: string, replacements: ReplacementMap, preview: boolean): boolean {
  if (!existsSync(filePath)) {
    log.warning(`File not found: ${filePath}`);
    return false;
  }

  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  let hasChanges = false;
  const changes: string[] = [];

  // Remove sections marked for removal after initialization
  const initPattern = /<!-- remove_after_init_start -->[\s\S]*?<!-- remove_after_init_end -->\n?/g;
  const initMatches = newContent.match(initPattern);
  if (initMatches && initMatches.length > 0) {
    newContent = newContent.replace(initPattern, '');
    hasChanges = true;
    changes.push(
      `Removed ${initMatches.length} boilerplate section${initMatches.length > 1 ? 's' : ''}`
    );
  }

  // Apply exact replacements
  for (const { from, to } of replacements.exact) {
    if (newContent.includes(from)) {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (newContent.match(regex) || []).length;
      newContent = newContent.replace(regex, to);
      hasChanges = true;
      changes.push(`"${from}" → "${to}" (${count} occurrence${count > 1 ? 's' : ''})`);
    }
  }

  // Apply pattern replacements
  for (const { regex, replace } of replacements.patterns) {
    const matches = newContent.match(regex);
    if (matches && matches.length > 0) {
      // TypeScript needs explicit handling for string | function
      if (typeof replace === 'string') {
        newContent = newContent.replace(regex, replace);
      } else {
        newContent = newContent.replace(regex, replace);
      }
      hasChanges = true;
      changes.push(
        `Pattern ${regex.source} (${matches.length} match${matches.length > 1 ? 'es' : ''})`
      );
    }
  }

  if (preview && hasChanges) {
    for (const change of changes) {
      log.preview(change);
    }
  }

  if (hasChanges && !preview) {
    // lgtm[js/file-system-race]
    // codeql[js/file-system-race]: Init script runs once in controlled environment
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return hasChanges;
}

async function showPreviewAndConfirm(config: ProjectConfig, rootDir: string): Promise<boolean> {
  log.title('📋 Preview of changes');

  const replacements = buildReplacementMap(config);
  let totalChanges = 0;

  for (const file of FILES_TO_PROCESS) {
    const filePath = join(rootDir, file);
    if (!existsSync(filePath)) {
      continue;
    }

    log.info(`${file}:`);
    const hasChanges = smartReplace(filePath, replacements, true);
    if (hasChanges) {
      totalChanges++;
    } else {
      log.preview('No changes');
    }
    console.log();
  }

  if (totalChanges === 0) {
    log.warning('No changes to apply!');
    return false;
  }

  const answer = await question(`${colors.cyan}Apply these changes?${colors.reset} (Y/n): `);

  return answer.toLowerCase() !== 'n';
}

function applyReplacements(config: ProjectConfig, rootDir: string): void {
  log.title('📝 Applying changes...');

  const replacements = buildReplacementMap(config);

  for (const file of FILES_TO_PROCESS) {
    const filePath = join(rootDir, file);
    if (!existsSync(filePath)) {
      continue;
    }

    log.step(`Processing ${file}...`);
    smartReplace(filePath, replacements, false);
  }

  log.success('All changes applied!');
}

function buildEnvReplacementMap(config: ProjectConfig): ReplacementMap {
  return {
    exact: [
      {
        from: 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_foundation?sslmode=disable',
        to: `DATABASE_URL=${config.databaseUrl}`,
      },
      {
        from: 'TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/nestjs_foundation_test?sslmode=disable',
        to: `TEST_DATABASE_URL=${config.testDatabaseUrl}`,
      },
      {
        from: 'AUTH_SECRET=your-secret-key-here-must-be-at-least-32-chars-long',
        to: `AUTH_SECRET=${config.authSecret}`,
      },
      {
        from: 'APP_NAME="NestJS Foundation"',
        to: `APP_NAME="${config.appName}"`,
      },
    ],
    patterns: [],
  };
}

function setupEnvironment(config: ProjectConfig, rootDir: string): void {
  log.title('🔧 Setting up environment files...');

  const envPath = join(rootDir, '.env');
  const envExamplePath = join(rootDir, '.env.example');

  if (existsSync(envPath)) {
    log.warning('.env file already exists, skipping...');
    return;
  }

  // Copy .env.example to .env
  const envContent = readFileSync(envExamplePath, 'utf-8');
  // lgtm[js/file-system-race]
  // codeql[js/file-system-race]: Init script runs once in controlled environment
  writeFileSync(envPath, envContent, 'utf-8');

  // Apply replacements using smartReplace
  const replacements = buildEnvReplacementMap(config);
  smartReplace(envPath, replacements, false);

  log.success('.env file created!');
}

function setupGit(config: ProjectConfig, rootDir: string): void {
  log.title('🔗 Setting up Git...');

  try {
    // Remove existing git history
    const gitDir = join(rootDir, '.git');
    // lgtm[js/file-system-race]
    // codeql[js/file-system-race]: Init script runs once in controlled environment
    if (existsSync(gitDir)) {
      log.warning('⚠️  This will DELETE your existing git history!');
      log.step('Removing existing git history...');
      rmSync(gitDir, { recursive: true, force: true });
    }

    // Initialize new git repository
    log.step('Initializing new git repository...');
    execSync('git init', { cwd: rootDir, stdio: 'ignore' });

    // Set git origin if provided
    if (config.gitOrigin) {
      log.step(`Setting remote origin to ${config.gitOrigin}...`);
      execSync(`git remote add origin "${config.gitOrigin}"`, {
        cwd: rootDir,
        stdio: 'ignore',
      });
    }

    // Initial commit
    log.step('Creating initial commit...');
    execSync('git add .', { cwd: rootDir, stdio: 'ignore' });
    execSync('git commit -m "chore: initialize project from nestjs-foundation"', {
      cwd: rootDir,
      stdio: 'ignore',
    });

    log.success('Git repository initialized!');

    if (config.gitOrigin) {
      log.info(`Run 'git push -u origin main' to push to remote.`);
    }
  } catch (error) {
    log.error(`Failed to set up Git: ${error}`);
  }
}

function cleanupPackageJson(rootDir: string): void {
  log.step('Removing init:project script from package.json...');

  const packageJsonPath = join(rootDir, 'package.json');
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Remove init:project script
    if (packageJson.scripts?.['init:project']) {
      // Use destructuring to avoid delete operator
      const { 'init:project': _removed, ...restScripts } = packageJson.scripts;
      packageJson.scripts = restScripts;
      // lgtm[js/file-system-race]
      // codeql[js/file-system-race]: Init script runs once in controlled environment
      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');
    }
  } catch (error) {
    log.warning(`Failed to update package.json: ${error}`);
  }
}

function cleanupBoilerplateFiles(rootDir: string): void {
  log.title('🧹 Cleaning up boilerplate files...');

  const filesToRemove = [
    'src/products',
    'e2e/products.spec.ts',
    '~REVIEW.md',
    '~ROADMAP.md',
    '~ROADMAPv2.md',
    'init.ts', // Remove this script after execution
  ];

  for (const file of filesToRemove) {
    const filePath = join(rootDir, file);
    if (existsSync(filePath)) {
      log.step(`Removing ${file}...`);
      try {
        rmSync(filePath, { recursive: true, force: true });
      } catch (error) {
        log.warning(`Failed to remove ${file}: ${error}`);
      }
    }
  }

  // Clean up package.json
  cleanupPackageJson(rootDir);

  log.success('Cleanup complete!');
}

function installDependencies(config: ProjectConfig, rootDir: string): void {
  if (!config.installDeps) {
    return;
  }

  log.title('📦 Installing dependencies...');

  try {
    log.step('Running pnpm install...');
    execSync('pnpm install', { cwd: rootDir, stdio: 'inherit' });
    log.success('Dependencies installed!');
  } catch (error) {
    log.error(`Failed to install dependencies: ${error}`);
    log.info('You can run "pnpm install" manually later.');
  }
}

async function setupDatabase(config: ProjectConfig, rootDir: string): Promise<void> {
  if (!config.setupDatabase) {
    return;
  }

  log.title('🗄️  Setting up database...');

  try {
    log.step('Starting PostgreSQL with Docker Compose...');
    execSync('docker compose up -d postgres postgres-test', { cwd: rootDir, stdio: 'inherit' });

    log.step('Waiting for PostgreSQL to be ready...');
    // Cross-platform wait using Node.js setTimeout
    await new Promise((resolve) => setTimeout(resolve, 3000));

    log.step('Running database migrations...');
    execSync('pnpm migration:run', { cwd: rootDir, stdio: 'inherit' });

    log.success('Database setup complete!');
  } catch (error) {
    log.error(`Failed to set up database: ${error}`);
    log.info('You can set up the database manually later.');
  }
}

async function main(): Promise<void> {
  const rootDir = resolve(__dirname);

  try {
    // Prompt user for configuration
    const config = await promptUser();

    // Show summary
    log.title('📋 Configuration Summary');
    console.log(`  Project Name:        ${colors.bright}${config.projectName}${colors.reset}`);
    console.log(`  Project Slug:        ${colors.bright}${config.projectSlug}${colors.reset}`);
    console.log(`  Project Snake:       ${colors.bright}${config.projectSnake}${colors.reset}`);
    console.log(
      `  Author:              ${config.authorName || `${colors.dim}Not set${colors.reset}`}`
    );
    console.log(
      `  Database:            ${config.setupDatabase ? `${colors.green}Local (Docker)${colors.reset}` : `${colors.yellow}Custom${colors.reset}`}`
    );
    console.log(
      `  Git Origin:          ${config.gitOrigin || `${colors.dim}Not set${colors.reset}`}`
    );
    console.log();

    // Show preview and ask for confirmation
    const confirmed = await showPreviewAndConfirm(config, rootDir);

    // Close readline after all prompts are done
    rl.close();

    if (!confirmed) {
      log.warning('Initialization cancelled.');
      process.exit(0);
    }

    // Apply configuration
    setupEnvironment(config, rootDir);
    applyReplacements(config, rootDir);

    // Install dependencies
    installDependencies(config, rootDir);

    // Cleanup boilerplate files BEFORE git commit
    cleanupBoilerplateFiles(rootDir);

    // Setup database
    await setupDatabase(config, rootDir);

    // Setup git (after cleanup so boilerplate files aren't in the commit)
    setupGit(config, rootDir);

    // Final message
    log.title('🎉 Project initialized successfully!');
    console.log(`Your project ${colors.bright}${config.projectName}${colors.reset} is ready!`);
    console.log();
    log.info('Next steps:');
    if (!config.installDeps) {
      console.log(`  1. ${colors.dim}pnpm install${colors.reset}`);
    }
    if (!config.setupDatabase) {
      console.log(
        `  ${config.installDeps ? '1' : '2'}. ${colors.dim}Set up your database${colors.reset}`
      );
    }
    console.log(
      `  ${config.installDeps && config.setupDatabase ? '1' : '2'}. ${colors.dim}pnpm dev${colors.reset}`
    );
    console.log();
    log.success('Happy coding! 🚀');
  } catch (error) {
    log.error(`Initialization failed: ${error}`);
    process.exit(1);
  } finally {
    // Ensure readline is closed (no need to check, close() is idempotent)
    rl.close();
  }
}

main();
