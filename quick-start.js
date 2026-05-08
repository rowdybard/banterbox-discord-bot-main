#!/usr/bin/env node

/**
 * BanterBox Quick Start Script
 * Helps verify your setup and get started quickly
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('\n🔍 Checking environment configuration...', 'cyan');
  
  const envPath = resolve('.env');
  if (!existsSync(envPath)) {
    log('❌ .env file not found!', 'red');
    log('   Run: cp .env.example .env', 'yellow');
    log('   Then edit .env with your actual values', 'yellow');
    return false;
  }
  
  log('✅ .env file exists', 'green');
  
  const envContent = readFileSync(envPath, 'utf-8');
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
  
  const missingVars = [];
  const placeholderVars = [];
  
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=(.*)$`, 'm');
    const match = envContent.match(regex);
    
    if (!match || !match[1] || match[1].trim() === '') {
      missingVars.push(varName);
    } else if (match[1].includes('your_') || match[1].includes('change_this')) {
      placeholderVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    log(`❌ Missing required variables: ${missingVars.join(', ')}`, 'red');
    return false;
  }
  
  if (placeholderVars.length > 0) {
    log(`⚠️  Placeholder values detected: ${placeholderVars.join(', ')}`, 'yellow');
    log('   Please update these with your actual values', 'yellow');
    return false;
  }
  
  log('✅ All required environment variables are set', 'green');
  return true;
}

function checkNodeModules() {
  log('\n🔍 Checking dependencies...', 'cyan');
  
  if (!existsSync('node_modules')) {
    log('❌ node_modules not found!', 'red');
    log('   Run: npm install', 'yellow');
    return false;
  }
  
  log('✅ Dependencies installed', 'green');
  return true;
}

function checkDatabase() {
  log('\n🔍 Checking database configuration...', 'cyan');
  
  const envPath = resolve('.env');
  if (!existsSync(envPath)) {
    log('⚠️  Cannot check database (no .env file)', 'yellow');
    return false;
  }
  
  const envContent = readFileSync(envPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
  
  if (!dbUrlMatch || !dbUrlMatch[1]) {
    log('❌ DATABASE_URL not set', 'red');
    return false;
  }
  
  const dbUrl = dbUrlMatch[1].trim();
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    log('ℹ️  Using local PostgreSQL database', 'blue');
  } else {
    log('ℹ️  Using hosted database', 'blue');
  }
  
  log('✅ Database URL configured', 'green');
  log('   Remember to run: npm run db:push', 'yellow');
  return true;
}

function printNextSteps(allChecksPass) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📋 NEXT STEPS', 'cyan');
  log('='.repeat(60), 'cyan');
  
  if (!allChecksPass) {
    log('\n⚠️  Setup incomplete. Please fix the issues above first.', 'yellow');
    return;
  }
  
  log('\n1. Push database schema:', 'blue');
  log('   npm run db:push', 'yellow');
  
  log('\n2. Start development server:', 'blue');
  log('   npm run dev', 'yellow');
  
  log('\n3. Open web dashboard:', 'blue');
  log('   http://localhost:5000', 'yellow');
  
  log('\n4. In Discord, run:', 'blue');
  log('   /link', 'yellow');
  
  log('\n5. Test banter generation:', 'blue');
  log('   - Join a voice channel', 'yellow');
  log('   - Send a message containing "banterbox"', 'yellow');
  
  log('\n📖 For detailed setup instructions, see SETUP.md', 'cyan');
  log('\n✨ Happy streaming!', 'green');
}

function printHeader() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🎤 BanterBox Quick Start', 'cyan');
  log('='.repeat(60), 'cyan');
}

async function main() {
  printHeader();
  
  const checks = [
    checkNodeModules(),
    checkEnvFile(),
    checkDatabase(),
  ];
  
  const allChecksPass = checks.every(check => check);
  
  printNextSteps(allChecksPass);
  
  process.exit(allChecksPass ? 0 : 1);
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
