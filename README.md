# ConnexFL (Connex for Lawyers)

ConnexFL helps Colombian public procurement lawyers decide, faster and with a clear trail, whether a company can bid on a public tender published in SECOP II.

The lawyer uploads the tender documents (prepliego, final pliego and annexes) and the profile of each client company. The platform extracts the requirements, compares them against each company, and returns a verdict per requirement (meets / does not meet / pending) with the reasoning behind it. The lawyer reviews, confirms or corrects each verdict, and the platform keeps both the AI result and the human decision.

## Who it's for

Lawyers and small firms that prepare bids for Colombian public tenders. Today they read long documents by hand to check every requirement. The goal is to let one lawyer evaluate many more tenders per week without losing control of the decision.

## How it works

The analysis runs in 4 phases:

1. **General prepliego review:** extract and classify the tender requirements.
2. **Prepliego review per company:** compare each company against those requirements.
3. **Final pliego review:** repeat the comparison when the final version is published.
4. **Annexes:** evaluate and generate the annex documents.

Each phase adds to a cumulative eligibility score. Long-running AI work is orchestrated with n8n workflows that call back into the API through authenticated webhooks. A Haiku to Sonnet pipeline with prompt caching keeps the cost per analysis low.

## Tech stack

- **Monorepo:** Turborepo with pnpm workspaces
- **API (`apps/api`):** Node.js, TypeScript, Hono, Better Auth (email and Google OAuth)
- **Web (`apps/web`):** Next.js 15, React 19, Tailwind CSS 4
- **Database (`packages/db`):** PostgreSQL 16 with pgvector, Drizzle ORM and migrations, JSONB for analysis results
- **Workflows (`n8n/`):** n8n workflows that call the Claude API
- **Infrastructure:** Docker Compose for PostgreSQL, Redis and n8n

## Getting started

Requirements: Node.js 20+, pnpm 10 and Docker.

```bash
git clone https://github.com/ConnexAi/connexFL.git
cd connexFL
pnpm install
cp .env.example .env
```

Fill in `.env` with your own values (database password, auth secrets, n8n webhook secret and an Anthropic API key). The API reads its own `.env` file, so copy it there too:

```bash
cp .env apps/api/.env
```

Start PostgreSQL, Redis and n8n, then run the migrations:

```bash
docker compose up -d
pnpm --filter @connex/db migrate
```

Import the workflows from the `n8n/` folder into n8n (http://localhost:5678), then start the API and the web app:

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:8000

## Data and privacy

This repository contains no real documents and no real company data. Uploaded files are stored outside version control (`apps/api/uploads/` is gitignored). To try the app, use your own made-up sample documents.

## Project structure

```
apps/
  api/        Hono REST API, auth, uploads, n8n callbacks
  web/        Next.js dashboard
packages/
  db/         Drizzle schema and migrations
  types/      Shared TypeScript types
  config/     Shared config
n8n/          Workflow definitions
docs/adr/     Architecture decision records
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

MIT. See [LICENSE](LICENSE).
