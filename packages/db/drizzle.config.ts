import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// NOTA WINDOWS / DOCKER: Si `pnpm --filter @connex/db exec drizzle-kit migrate`
// corre sin error pero no aplica nada, el motivo es que drizzle.__drizzle_migrations
// está desincronizado con la DB real (la migración 0000 fue aplicada a mano sin
// registrarse). Para re-sincronizar, insertar manualmente las filas faltantes:
//
//   node -e "
//     const crypto = require('crypto'), fs = require('fs');
//     const f = 'src/migrations/<archivo>.sql';
//     console.log(crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'));
//   "
//
//   docker exec -i connex_postgres psql -U connex -d connex -c \
//     "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('<sha1>', <epoch_ms>);"
//
// El epoch_ms está en packages/db/src/migrations/meta/_journal.json (campo "when").
// Una vez sincronizado, drizzle-kit migrate vuelve a funcionar normalmente.

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
