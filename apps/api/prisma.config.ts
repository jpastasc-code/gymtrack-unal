import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Las migraciones usan la conexión directa (DIRECT_URL, puerto 5432): el pooler de Supabase
// en modo transacción (puerto 6543) no soporta las operaciones de migración.
// `prisma generate` no necesita conexión, por eso la URL puede faltar (p. ej. en CI o en el build).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
