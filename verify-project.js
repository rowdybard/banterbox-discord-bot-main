#!/usr/bin/env node

/**
 * BanterBox Project Verification Script
 * Comprehensive checks to ensure the project is ready to run
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function check(name, condition, errorMsg = '', warningOnly = false) {
  totalChecks++;
  if (condition) {
    log(`✅ ${name}`, 'green');
    passedChecks++;
    return true;
  } else {
    if (warningOnly) {
      log(`⚠️  ${name}`, 'yellow');
      if (errorMsg) log(`   ${errorMsg}`, 'yellow');
      warnings++;
    } else {
      log(`❌ ${name}`, 'red');
      if (errorMsg) log(`   ${errorMsg}`, 'red');
      failedChecks++;
    }
    return false;
  }
}

// 1. File Structure Checks
header('📁 File Structure');

check('package.json exists', existsSync('package.json'));
check('package-lock.json exists', existsSync('package-lock.json'));
check('node_modules exists', existsSync('node_modules'), 'Run: npm install');
check('tsconfig.json exists', existsSync('tsconfig.json'));
check('.env.example exists', existsSync('.env.example'));
check('README.md exists', existsSync('README.md'));
check('SETUP.md exists', existsSync('SETUP.md'));

check('server/ directory exists', existsSync('server'));
check('client/ directory exists', existsSync('client'));
check('shared/ directory exists', existsSync('shared'));

check('server/index.ts exists', existsSync('server/index.ts'));
check('server/routes.ts exists', existsSync('server/routes.ts'));
check('server/discord.ts exists', existsSync('server/discord.ts'));
check('shared/schema.ts exists', existsSync('shared/schema.ts'));

// 2. Environment Configuration
header('🔧 Environment Configuration');

const envExists = existsSync('.env');
check('.env file exists', envExists, 'Copy .env.example to .env and configure');

if (envExists) {
  const envContent = readFileSync('.env', 'utf-8');
  
  const requiredVars = [
    'DATABASE_URL',
    'DISCORD_APPLICATION_ID',
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_PUBLIC_KEY',
    'OPENAI_API_KEY',
    'SESSION_SECRET',
  ];
  
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    const hasValue = match && match[1] && match[1].trim() !== '' && 
                     !match[1].includes('your_') && !match[1].includes('change_this');
    check(`${varName} is set`, hasValue, `Set this in .env file`);
  }
  
  // Optional but recommended
  const optionalVars = ['ELEVENLABS_API_KEY'];
  for (const varName of optionalVars) {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    const hasValue = match && match[1] && match[1].trim() !== '';
    check(`${varName} is set`, hasValue, 'Recommended for better voice quality', true);
  }
}

// 3. Dependencies Check
header('📦 Dependencies');

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

const criticalDeps = [
  'discord.js',
  '@discordjs/voice',
  'express',
  'drizzle-orm',
  'openai',
  'react',
  'vite',
];

for (const dep of criticalDeps) {
  const installed = existsSync(`node_modules/${dep}`);
  check(`${dep} installed`, installed, 'Run: npm install');
}

// 4. Build Artifacts
header('🏗️  Build Artifacts');

check('dist/ directory exists', existsSync('dist'), 'Run: npm run build', true);
if (existsSync('dist')) {
  check('dist/client exists', existsSync('dist/client'));
  check('dist/server exists', existsSync('dist/server'));
  check('dist/server/index.js exists', existsSync('dist/server/index.js'));
}

// 5. TypeScript Configuration
header('📘 TypeScript Configuration');

const tsconfigs = ['tsconfig.json', 'tsconfig.client.json', 'tsconfig.server.json'];
for (const config of tsconfigs) {
  check(`${config} exists`, existsSync(config));
}

// 6. Database Schema
header('🗄️  Database Schema');

check('shared/schema.ts exists', existsSync('shared/schema.ts'));
check('drizzle.config.ts exists', existsSync('drizzle.config.ts'));

// 7. Discord Bot Files
header('🤖 Discord Bot');

const discordFiles = [
  'server/discord.ts',
  'server/discordAuth.ts',
];

for (const file of discordFiles) {
  check(`${file} exists`, existsSync(file));
}

// 8. Marketplace Files
header('🛍️  Marketplace');

const marketplaceFiles = [
  'server/marketplace.ts',
  'server/marketplace-endpoints.ts',
  'client/src/pages/marketplace.tsx',
  'client/src/pages/voice-marketplace.tsx',
];

for (const file of marketplaceFiles) {
  check(`${file} exists`, existsSync(file));
}

// 9. Configuration Files
header('⚙️  Configuration Files');

const configFiles = [
  'vite.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'components.json',
];

for (const file of configFiles) {
  check(`${file} exists`, existsSync(file));
}

// 10. Documentation
header('📚 Documentation');

const docs = [
  'README.md',
  'SETUP.md',
  'QUICKSTART.md',
  'MARKETPLACE.md',
];

for (const doc of docs) {
  check(`${doc} exists`, existsSync(doc));
}

// Summary
header('📊 Verification Summary');

log(`\nTotal Checks: ${totalChecks}`, 'cyan');
log(`✅ Passed: ${passedChecks}`, 'green');
log(`❌ Failed: ${failedChecks}`, 'red');
log(`⚠️  Warnings: ${warnings}`, 'yellow');

const successRate = Math.round((passedChecks / totalChecks) * 100);
log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

// Final Verdict
log('\n' + '='.repeat(60), 'cyan');
if (failedChecks === 0) {
  log('🎉 PROJECT READY!', 'green');
  log('\nNext steps:', 'cyan');
  log('1. Ensure .env is configured with your credentials', 'yellow');
  log('2. Run: npm run db:push', 'yellow');
  log('3. Run: npm run dev', 'yellow');
  log('4. Visit http://localhost:5000', 'yellow');
} else if (failedChecks <= 3) {
  log('⚠️  PROJECT MOSTLY READY - Fix the issues above', 'yellow');
} else {
  log('❌ PROJECT NOT READY - Multiple issues need attention', 'red');
}
log('='.repeat(60), 'cyan');

process.exit(failedChecks > 0 ? 1 : 0);
