import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Minimal .env loader for the CLI seed script (tsx does not load Next env files).
// Loads .env.local first, then .env, without overriding already-set variables.
function loadFile(file: string) {
  const p = join(process.cwd(), file)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

loadFile('.env.local')
loadFile('.env')
