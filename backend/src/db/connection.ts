import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const appTimezone = process.env.TZ || 'UTC';

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(dbConfig);

pool.on('connect', (client) => {
  client.query(`SET time zone '${appTimezone.replace(/'/g, "''")}'`).catch((err) => {
    console.warn('Failed to set session timezone:', err.message);
  });
});

pool.on('error', (err: Error) => {
  console.error('Database pool error:', err.message || err);
});

/**
 * Test database connectivity with retry logic and exponential backoff.
 * Prevents noisy ECONNREFUSED errors during container startup when DB isn't ready yet.
 */
export async function testConnection(): Promise<void> {
  const maxRetries = 10;
  const initialDelay = 1000;
  const maxDelay = 10000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, current_database() as database');
      console.log('✓ Database connected successfully');
      console.log(`  Database: ${result.rows[0].database}`);
      console.log(`  Server time: ${result.rows[0].current_time}`);
      client.release();
      return;
    } catch (error: unknown) {
      const err = error as Partial<{ code: unknown; message: unknown }>;
      const isConnectionError = 
        err.code === 'ECONNREFUSED' || 
        err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' ||
        (typeof err.message === 'string' && err.message.includes('connect')) ||
        (typeof err.message === 'string' && err.message.includes('timeout'));
      
      if (isConnectionError && attempt < maxRetries) {
        const baseDelay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = Math.random() * 1000;
        const delay = Math.floor(baseDelay + jitter);
        
        console.log(`  Database not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
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

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Query error:', errorMessage);
    throw error;
  }
}

// Execute multiple queries in a transaction (auto commit/rollback)
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
