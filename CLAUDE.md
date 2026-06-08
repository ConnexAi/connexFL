# Connex for Lawyers — CLAUDE.md

## Qué es este proyecto
Plataforma web para abogados especializados en contratación pública colombiana.
Automatiza el análisis de pliegos del SECOP II, compara licitaciones con el perfil
de las empresas clientes del abogado, y genera los documentos legales para ofertar.

## Stack
- Frontend: Next.js 15 + TypeScript strict + Tailwind v4 (apps/web)
- Backend API: Hono + TypeScript (apps/api, puerto 8000)
- Automatización IA: n8n self-hosted (workflows externos, no en este repo)
- Base de datos: PostgreSQL 16 + pgvector + Drizzle ORM (packages/db)
- Auth: Better Auth + Google OAuth
- IA: Claude API — Haiku para clasificación, Sonnet para análisis y redacción
- Hosting: Hetzner CX32 + Coolify + Docker
- Seguridad: Cloudflare delante de todo

## Estructura del monorepo
connexFL/
├── apps/
│   ├── web/          @connex/web   — Next.js frontend
│   └── api/          @connex/api   — Hono backend (puerto 8000)
├── packages/
│   ├── db/           @connex/db    — schema Drizzle + migraciones
│   ├── types/        @connex/types — tipos TypeScript compartidos
│   └── config/       @connex/config — ESLint + tsconfig base
├── n8n/              — workflows exportados como JSON
└── docs/adr/         — Architecture Decision Records

## Comandos esenciales
- `pnpm dev` — levanta web + api en paralelo
- `pnpm build` — build de todo el monorepo
- `pnpm typecheck` — verifica TypeScript en todos los packages
- `pnpm lint` — lint en todos los packages
- `pnpm --filter @connex/web dev` — solo frontend
- `pnpm --filter @connex/api dev` — solo backend
- `pnpm --filter @connex/db drizzle-kit generate` — generar migración
- `pnpm --filter @connex/db drizzle-kit migrate` — aplicar migración
- `pnpm --filter @connex/db drizzle-kit studio` — ver DB visualmente

## Convenciones de código
- TypeScript strict mode siempre activado — si tsc se queja, el código no avanza
- Sin `any` ni `@ts-ignore` sin comentario que justifique por qué
- camelCase para variables y funciones
- PascalCase para componentes React y sus archivos
- kebab-case para archivos de utilidad
- snake_case para tablas y columnas de PostgreSQL
- UPPER_SNAKE_CASE para variables de entorno
- Commits en Conventional Commits: feat:, fix:, chore:, docs:, refactor:

## Convenciones de endpoints Hono
Cada endpoint sigue este orden de middleware:
1. authMiddleware — verificar JWT
2. rateLimitMiddleware — límite por usuario/IP
3. checkTokenQuota — verificar cuota de Claude
4. zValidator — validar input con Zod
5. lógica de negocio
6. triggerWebhook a n8n de forma async (nunca bloqueante)

## Arquitectura — reglas que nunca se rompen
- El frontend (apps/web) NUNCA accede directamente a PostgreSQL
- El frontend NUNCA llama a Claude API directamente
- El frontend NUNCA llama a n8n directamente
- Solo apps/api (Hono) habla con PostgreSQL y con n8n
- n8n es el único que llama a Claude API
- Cloudflare está siempre delante — nunca exponer el VPS directamente

## Seguridad
- Todos los secretos viven en variables de entorno — nunca en el código
- El .env nunca se commitea — solo .env.example con nombres sin valores
- Row Level Security activado en todas las tablas de usuario en PostgreSQL
- Rate limiting: 100 req/min por IP, 20 req/min por usuario autenticado

## Base de datos — schema MVP
Tablas principales:
- abogados — usuarios del sistema
- empresas — empresas clientes de cada abogado (con embedding pgvector)
- pliegos — pliegos del SECOP II subidos (con embedding pgvector)
- comparaciones — resultado de comparar pliego vs empresa (score 0-100)

Cada abogado solo puede ver sus propias empresas, pliegos y comparaciones.
RLS en PostgreSQL garantiza este aislamiento a nivel de base de datos.

## Conocimiento global del sistema
El conocimiento experto de Ximena (criterios de evaluación, plantillas de anexos,
ejemplos de análisis) vive en el system prompt de Claude como prompt caching.
Va en TODAS las llamadas de TODOS los abogados — ningún abogado puede modificarlo.
Solo el admin puede actualizarlo desde un panel especial.

## Git workflow
- main → producción
- dev → staging
- feature/nombre, fix/nombre, chore/nombre → trabajo diario
- Nunca push directo a main ni a dev — siempre por Pull Request
- El developer NUNCA hace git push — solo el humano supervisor

## Lo que NO hace Claude Code en este proyecto
- Nunca hace git add, git commit ni git push — eso lo hace el humano
- Nunca corre el servidor en background ni deja procesos corriendo
- Nunca modifica .env (solo .env.example)
- Nunca instala dependencias globales
