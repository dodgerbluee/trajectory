/**
 * Backend entry point
 * 
 * Startup Sequence (fail-fast on errors):
 * 1. Load environment variables
 * 2. Connect to database (with retry logic and exponential backoff)
 * 3. Run database migrations (ensures schema is up-to-date)
 * 4. Create Express application
 * 5. Start HTTP server (binds to 0.0.0.0 for Docker compatibility)
 * 6. Server only accepts requests after all initialization is complete
 * 
 * Error Handling:
 * - All connection attempts are wrapped in try/catch
 * - Database connection retries with exponential backoff (prevents noisy ECONNREFUSED errors)
 * - Concise, friendly error messages instead of full stack traces
 * - Application exits with code 1 if initialization fails
 */

import dotenv from 'dotenv';
import { createApp } from './app.js';
import { testConnection, closePool } from './db/connection.js';
import { runMigrations } from './db/migrations.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Bind to 0.0.0.0 for Docker container accessibility

async function main() {
  console.log('Trajectory Backend\n');

  try {
    // Step 1: Connect to database with retry logic
    // This handles cases where the database container isn't ready yet
    // Retries with exponential backoff prevent noisy ECONNREFUSED errors
    console.log('Connecting to database...');
    await testConnection();
    
    // Step 2: Run database migrations before starting server
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

    // Step 3: Create Express application
    // Only create the app after database is ready to ensure all routes
    // can safely use the database connection
    const app = createApp();
    
    // Step 4: Start HTTP server
    // Bind to 0.0.0.0 (not just localhost) so the server is accessible
    // from outside the container (required for Docker)
    // Server only starts listening after database connection and migrations are complete
    const server = app.listen(PORT, HOST, () => {
      console.log(`✓ Server listening on ${HOST}:${PORT}`);
      console.log(`  Health check: http://${HOST}:${PORT}/health`);
      console.log(`  API base URL: http://${HOST}:${PORT}/api`);
    });

    // Handle server errors gracefully
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`✗ Port ${PORT} is already in use`);
      } else {
        console.error('✗ Server error:', error.message || error);
      }
      process.exit(1);
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

    // Handle unhandled promise rejections (shouldn't happen with our error handling)
    process.on('unhandledRejection', (reason: any) => {
      console.error('Unhandled promise rejection:', reason?.message || reason);
      // Don't exit - let the application continue if possible
    });

    // Handle uncaught exceptions (shouldn't happen with our error handling)
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught exception:', error.message);
      shutdown('uncaughtException');
    });

  } catch (error: any) {
    // All errors during startup are caught here
    // Log concise error message instead of full stack trace
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    console.error(`\n✗ Failed to start server: ${errorMessage}`);
    
    // Only show stack trace in development mode
    if (process.env.NODE_ENV !== 'production' && error?.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

main();
