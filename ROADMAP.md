# Roadmap

Work planned for the next months, roughly in order.

## Reliability and testing

- [ ] Add a test suite for the API (Vitest): unit tests for the eligibility scoring and integration tests for the main routes
- [ ] Tests for authorization: every route rejects users who don't own the tender or company
- [ ] Test the n8n callback routes, including a wrong or missing webhook secret
- [ ] Set up GitHub Actions to run typecheck, lint and tests on every push

## Developer experience

- [ ] Seed script with made-up sample companies and tender documents, so the app can be tried without real data
- [ ] Dockerfiles for the API and the web app, so the whole stack runs with one `docker compose up`
- [ ] Validate environment variables at startup and fail with a clear message

## Product

- [ ] Export the eligibility report per company as PDF
- [ ] History of changes when a lawyer overrides an AI verdict
- [ ] Better error states when an analysis fails halfway through a phase
- [ ] Search and filters in the tenders dashboard

## Code quality

- [ ] Move remaining business logic out of the routes into services
- [ ] Centralized error handling and structured logging in the API
- [ ] Shared validation schemas between API and web
