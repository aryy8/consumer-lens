import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../drizzle/schema'

// Reuse a single Pool across Next.js dev hot-reloads to avoid connection leaks.
const globalForDb = globalThis as unknown as { __clPool?: Pool }

function getPool(): Pool {
  if (!globalForDb.__clPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Add it to .env.local.')
    }
    globalForDb.__clPool = new Pool({
      connectionString,
      // node-postgres does not parse `sslmode=require` from the URL, so TLS
      // must be enabled explicitly for Neon.
      ssl: { rejectUnauthorized: false },
      max: 10,
    })
  }
  return globalForDb.__clPool
}

export const db = drizzle(getPool(), { schema })
