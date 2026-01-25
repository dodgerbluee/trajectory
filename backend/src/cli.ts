/**
 * CLI entry point for running migrations manually
 * Usage: node dist/cli.js migrate
 */

import dotenv from 'dotenv';
import { testConnection, closePool } from './db/connection.js';
import { runMigrations } from './db/migrations.js';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2];

  if (command === 'migrate') {
    console.log('Running database migrations...\n');
    
    try {
      await testConnection();
      await runMigrations();
      await closePool();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      await closePool();
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command || '(none)'}`);
    console.error('Usage: node dist/cli.js migrate');
    process.exit(1);
  }
}

main();
