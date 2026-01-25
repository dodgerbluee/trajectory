/**
 * Backend entry point
 */

import dotenv from 'dotenv';
import { createApp } from './app.js';
import { testConnection, closePool } from './db/connection.js';
import { runMigrations } from './db/migrations.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

async function main() {
  console.log('Trajectory Backend\n');

  try {
    // Test database connectivity
    await testConnection();
    
    // Run database migrations before starting server
    // 
    // First-run initialization:
    // - On first run against an empty database, creates the migrations table
    // - Applies all migration files from backend/migrations/ in alphabetical order
    // - Records each applied migration to prevent re-running
    // - All migrations are idempotent (safe to run multiple times)
    // - If migrations fail, the application exits with an error (fail-fast)
    //
    // Subsequent runs:
    // - Checks which migrations have been applied
    // - Only applies new migrations that haven't been run yet
    // - Ensures schema is always up-to-date
    await runMigrations();

    // Create and start Express server
    const app = createApp();
    
    const server = app.listen(PORT, () => {
      console.log(`✓ Server listening on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  API base URL: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
