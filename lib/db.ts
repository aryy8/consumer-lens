import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../drizzle/schema'

// Reuse a single Pool across Next.js dev hot-reloads to avoid connection leaks.
const globalForDb = globalThis as unknown as { __clPool?: Pool }

function getPool(): Pool {
  if (!globalForDb.__clPool) {
    let connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Add it to .env.local.')
    }
    // Upgrade sslmode=require to sslmode=verify-full to prevent pg-connection-string console warnings
    if (connectionString.includes('sslmode=require')) {
      connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full')
    }
    globalForDb.__clPool = new Pool({
      connectionString,
      // node-postgres does not parse `sslmode=require` from the URL, so TLS
      // must be enabled explicitly for Neon.
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    })
  }
  return globalForDb.__clPool
}

function createDb() {
  return drizzle(getPool(), { schema })
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!globalForDb.__clPool) {
      // triggers getPool() which validates DATABASE_URL at runtime when a query is actually executed
      getPool()
    }
    const realDb = createDb()
    const value = Reflect.get(realDb, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(realDb)
    }
    return value
  },
})

