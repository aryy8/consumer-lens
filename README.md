# Consumer Lens

A field inspection tool for enforcing India's **Legal Metrology (Packaged Commodities) Rules, 2011** on consumer product labels.

Inspectors capture or scan product packaging, the system extracts the text, and an AI model checks it against the full LMPC rule base (see [`LMPC_Rules_2011_Compliance.md`](./LMPC_Rules_2011_Compliance.md)) to flag violations with severity ratings.

## Features

- **Live camera & URL image capture** for label photos
- **AI-powered label analysis** via OpenRouter (manufacturer identity, MRP, generic name, etc.)
- **Role-based access** — Inspector, Supervisor, Admin
- **JWT session auth** backed by Postgres
- **Dashboard, inspections, product repository, reports** (PDF export)
- **Analytics & user management** for admins

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript 5.7**, **Tailwind CSS 4**
- **Drizzle ORM** with **Neon Postgres**
- **SWR** for client fetching, **Recharts** + **d3-geo** for visuals
- **jsPDF** for compliance reports
- **shadcn/ui** (base-ui) components

## Getting Started

### 1. Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn
- A Postgres database (Neon works well)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=verify-full
AUTH_SECRET=                # openssl rand -hex 48
OPENROUTER_API=             # OpenRouter API key for label analysis
```

### 4. Set up the database

```bash
pnpm db:generate    # generate migrations
pnpm db:migrate     # apply migrations
pnpm db:seed        # (optional) seed users
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to the database |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
app/
  (app)/           # Authenticated routes (dashboard, inspections, reports, ...)
  api/             # Route handlers (analyze, auth, inspections, scrape, users)
  login/           # Sign-in page
components/        # Shared UI (app shell, sidebar, tables, ...)
drizzle/           # Schema, migrations, seed
lib/               # auth, db, session, queries, PDF generation, ...
```

## Compliance Rule Base

The complete LMPC 2011 rule catalog the analyzer enforces against lives in [`LMPC_Rules_2011_Compliance.md`](./LMPC_Rules_2011_Compliance.md) — see it for the exact checks and severity tiers.