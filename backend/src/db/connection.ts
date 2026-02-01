/**
 * Database connection pool configuration
 * Uses node-postgres (pg) for PostgreSQL connectivity
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Use app timezone for DB session (e.g. NOW(), timestamp display)
const appTimezone = process.env.TZ || 'UTC';

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Set session timezone for each new connection so NOW() and timestamps match app TZ
pool.on('connect', (client) => {
  client.query(`SET time zone '${appTimezone.replace(/'/g, "''")}'`).catch((err) => {
    console.warn('Failed to set session timezone:', err.message);
  });
});

// Error handler for pool
// Handles errors on idle database clients gracefully
// Only logs the error message (not full stack trace) to reduce noise
pool.on('error', (err: Error) => {
  console.error('Database pool error:', err.message || err);
  // Don't exit immediately - let the application handle it
  // The connection retry logic will handle reconnection attempts
});

/**
 * Test database connectivity with retry logic
 * 
 * Startup flow:
 * 1. Attempts to connect to the database with exponential backoff retries
 * 2. Logs concise, friendly error messages instead of full stack traces
 * 3. Only throws after all retries are exhausted
 * 
 * This prevents noisy ECONNREFUSED errors during container startup when
 * the database container may not be ready yet.
 */
export async function testConnection(): Promise<void> {
  const maxRetries = 10;
  const initialDelay = 1000; // Start with 1 second
  const maxDelay = 10000; // Cap at 10 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, current_database() as database');
      console.log('✓ Database connected successfully');
      console.log(`  Database: ${result.rows[0].database}`);
      console.log(`  Server time: ${result.rows[0].current_time}`);
      client.release();
      return; // Success - exit retry loop
    } catch (error: unknown) {
      const err = error as Partial<{ code: unknown; message: unknown }>;
      // Check if this is a connection error (database not ready yet)
      const isConnectionError = 
        err.code === 'ECONNREFUSED' || 
        err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' ||
        (typeof err.message === 'string' && err.message.includes('connect')) ||
        (typeof err.message === 'string' && err.message.includes('timeout'));
      
      if (isConnectionError && attempt < maxRetries) {
        // Calculate exponential backoff delay (with jitter to prevent thundering herd)
        const baseDelay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = Math.floor(baseDelay + jitter);
        
        console.log(`  Database not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }
      
      // If it's not a connection error, or we've exhausted retries, throw
      if (isConnectionError) {
        console.error(`✗ Database connection failed after ${maxRetries} attempts`);
        console.error(`  Make sure the database is running and accessible at: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'DATABASE_URL not set'}`);
      } else {
        console.error('✗ Database connection failed:', (error instanceof Error ? error.message : String(error)));
      }
      throw error;
    }
  }
}

/**
 * Gracefully close the database pool
 * Call this during application shutdown
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

/**
 * Execute a query with automatic connection management
 * This is a convenience wrapper around pool.query
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error: unknown) {
    // Log concise error message instead of full stack trace
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Query error:', errorMessage);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * Automatically handles commit/rollback
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
