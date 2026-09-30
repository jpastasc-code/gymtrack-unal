# GymTrack UNAL

App web para el gimnasio de la Universidad Nacional.

Monorepo con [pnpm workspaces](https://pnpm.io/workspaces):

| Carpeta    | Qué es                                   | Stack                              |
| ---------- | ---------------------------------------- | ---------------------------------- |
| `apps/api` | Backend REST, documentado con Swagger    | NestJS + TypeScript                |
| `apps/web` | Frontend                                 | React + Vite + TypeScript          |

Base de datos y autenticación en **Supabase** (PostgreSQL + Supabase Auth), con **Prisma** como ORM.
El modelo de datos está documentado en [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md).

**Antes de contribuir, lee la [wiki del equipo](docs/wiki/Home.md):** Definition of Done, convenciones de ramas, commits y PRs, decisiones técnicas y proceso de sprint.

## Requisitos

- **Node.js 24.9 o superior** (la versión está en `.nvmrc`; con nvm: `nvm use`).
  Jest necesita Node ≥ 24.9 para cargar los paquetes ESM de NestJS 12.
- **pnpm 12.6** (se descarga solo gracias al campo `packageManager`; también puedes usar `corepack enable`).

## Primeros pasos

```bash
pnpm install                                # también genera el cliente de Prisma
cp apps/api/.env.example apps/api/.env      # y completa la contraseña de la BD
cp apps/web/.env.example apps/web/.env

pnpm dev:api   # API en http://localhost:3000/api  (Swagger en /api/docs)
pnpm dev:web   # Frontend en http://localhost:5173
```

## Scripts (desde la raíz)

| Script              | Qué hace                                         |
| ------------------- | ------------------------------------------------ |
| `pnpm lint`         | oxlint en el API y ESLint en el frontend         |
| `pnpm typecheck`    | Verificación de tipos con `tsc` en ambos proyectos |
| `pnpm test`         | Pruebas unitarias del API (Jest) y del frontend (Vitest) |
| `pnpm test:e2e`     | Pruebas end-to-end del API (Jest + Supertest)    |
| `pnpm build`        | Build de producción de ambos proyectos           |

### Base de datos (desde `apps/api`, o con `pnpm --filter api <script>`)

| Script                | Qué hace |
| --------------------- | -------- |
| `pnpm db:generate`    | Regenera el cliente de Prisma (se corre solo al instalar). |
| `pnpm db:migrate:dev` | Crea una migración nueva a partir de los cambios en `schema.prisma` (**no usar contra Supabase compartido**; ver abajo). |
| `pnpm db:migrate`     | Aplica las migraciones pendientes (`prisma migrate deploy`). |
| `pnpm db:status`      | Muestra qué migraciones están aplicadas. |
| `pnpm db:seed`        | Carga los datos de prueba (idempotente). |
| `pnpm db:studio`      | Abre Prisma Studio para ver y editar datos. |

## Endpoints del API

| Método | Ruta              | Descripción                            |
| ------ | ----------------- | -------------------------------------- |
| GET    | `/api`            | "Hola mundo" del API                   |
| GET    | `/api/health`     | Salud del API y de la BD; 503 si la BD no responde (lo usa Render) |
| GET    | `/api/docs`       | Documentación Swagger UI               |
| GET    | `/api/docs-json`  | Especificación OpenAPI en JSON         |

## Variables de entorno

Nunca subas archivos `.env` al repositorio; usa los `.env.example` como plantilla.

### API (`apps/api/.env`)

| Variable       | Obligatoria | Por defecto | Descripción |
| -------------- | ----------- | ----------- | ----------- |
| `PORT`         | No          | `3000`      | Puerto HTTP. En Render lo asigna la plataforma. |
| `CORS_ORIGINS` | En producción | *(vacío = cualquier origen)* | Orígenes permitidos separados por coma, p. ej. `https://gymtrack-unal.vercel.app,http://localhost:5173`. |
| `DATABASE_URL` | Sí          | —           | Conexión de Supabase por el pooler en **modo transacción** (puerto 6543, con `?pgbouncer=true`). La usa el API. |
| `DIRECT_URL`   | Para migrar y sembrar | — | Conexión de Supabase por el pooler en **modo sesión** (puerto 5432). La usan `prisma migrate` y el seed. |
| `SUPABASE_URL` | Para el seed | — | `https://ubijemneujcpxdzwoufk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Para el seed | — | Clave secreta de Supabase (Project Settings → API Keys). **Solo backend, nunca en el frontend ni en el repo.** |
| `SEED_PASSWORD` | Para el seed | — | Contraseña de los usuarios de prueba (mín. 10 caracteres). |

### Frontend (`apps/web/.env`)

| Variable       | Obligatoria | Ejemplo                       | Descripción |
| -------------- | ----------- | ----------------------------- | ----------- |
| `VITE_API_URL` | Sí          | `http://localhost:3000/api`   | URL base del API, sin barra final. |
| `VITE_SUPABASE_URL` | Sí     | `https://ubijemneujcpxdzwoufk.supabase.co` | URL del proyecto de Supabase (para Supabase Auth). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sí | `sb_publishable_…` | Clave publicable; es segura en el navegador porque RLS bloquea el acceso directo a las tablas. |

> Las variables de Vite se incrustan en el build: si cambias `VITE_API_URL` en Vercel hay que volver a desplegar.

## Frontend (`apps/web`)

- **Stack:** React 19 + TypeScript + Vite, Tailwind CSS 4, React Router, TanStack Query y `vite-plugin-pwa`.
- **Estructura por funcionalidad:** cada épica tiene su carpeta en `src/features/<épica>/` (`auth`, `evaluacion`, `rutinas`, `entrenamiento`, `nutricion`, `gimnasio`, `cancha`, `progreso`, además de `inicio`).
  La configuración de la app (rutas, layout, TanStack Query) está en `src/app/`, los componentes compartidos en `src/components/` y el cliente HTTP en `src/lib/api/`.
- **Rutas:** se declaran en `src/app/rutas.tsx`. `/login` va fuera del layout; el resto usa el layout móvil con barra de navegación inferior (Inicio, Rutina, Entrenar, Reservas, Perfil).
- **Llamadas al API:** usa `apiFetch` (`src/lib/api/client.ts`) dentro de hooks de TanStack Query; toma `VITE_API_URL`, envía el token de sesión cuando exista (lo conectará GYMM-10) y convierte los errores en `ApiError`.
- **Diseño:** los colores y tipografías son tokens de Tailwind en `src/index.css` (`bg-campus`, `text-gris`, `font-display`…). El amarillo `seguridad` se reserva para la acción principal, Entrenar.
- **PWA:** la app se puede instalar desde el navegador del celular ("Agregar a pantalla de inicio") y abre sin conexión. Cuando se publica una versión nueva, muestra un aviso para actualizar en lugar de recargar a mitad de un entrenamiento. Los íconos se generan desde `public/logo.svg` con `pnpm --filter web generate-pwa-assets`.
- **Pruebas:** Vitest + Testing Library (`pnpm --filter web test`).

## Base de datos (Supabase)

- **Proyecto:** `gymtrack-unal` (región us-east-1). Las credenciales se piden al equipo; no se suben al repo.
- **Esquema:** [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma), diagrama y decisiones en [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md).
- **Migraciones:** en `apps/api/prisma/migrations/`. Algunas reglas (exclusión de reservas solapadas en la cancha, una rutina vigente por usuario, `CHECK` de rangos, RLS) están escritas en SQL a mano dentro de la migración porque Prisma no las representa.
- **Seguridad:** todas las tablas tienen RLS activado **sin políticas**, así la API REST pública de Supabase no expone datos; el acceso pasa siempre por el API de NestJS.

### Usuarios de prueba

El seed crea un usuario por rol (la contraseña es la de `SEED_PASSWORD`; pídela al equipo):

| Correo                        | Rol                 |
| ----------------------------- | ------------------- |
| `deportista@gymtrack.test`    | DEPORTISTA (con evaluación y rutina vigente de ejemplo) |
| `deportista2@gymtrack.test`   | DEPORTISTA          |
| `instructor@gymtrack.test`    | INSTRUCTOR          |
| `deportes@gymtrack.test`      | PERSONAL_DEPORTES   |
| `admin@gymtrack.test`         | ADMIN               |

También carga 27 ejercicios, las franjas del gimnasio (L–V 6:00–21:00, sáb 8:00–13:00, cupo 30) y de la cancha sintética (L–V 14:00–21:00, sáb 8:00–17:00).

### Cómo cambiar el esquema

1. Edita `schema.prisma`.
2. Genera la migración contra una base **local o de pruebas** (nunca contra el Supabase compartido):
   `SHADOW_DATABASE_URL=… pnpm --filter api exec prisma migrate dev --create-only --name descripcion_del_cambio`
3. Revisa el SQL generado, súbelo en el PR y el CI comprobará que coincide con el esquema.
4. Tras fusionar, aplica en Supabase con `pnpm --filter api db:migrate`.

## Integración continua

`.github/workflows/ci.yml` corre en cada Pull Request (y en cada push a `main`):
- **Lint, typecheck, pruebas y build:** lint → typecheck → pruebas unitarias → pruebas e2e → build.
- **Migraciones y seed:** en un PostgreSQL 17 temporal verifica que `schema.prisma` y las migraciones coinciden, aplica las migraciones y corre el seed dos veces.
Recomendado: en GitHub, **Settings → Branches**, exigir que el check **CI** pase antes de fusionar a `main`.

## Despliegue

### Backend en Render

1. En [Render](https://render.com): **New → Blueprint** y selecciona este repositorio. Render lee `render.yaml`.
2. Define `CORS_ORIGINS` con la URL del frontend en Vercel y `DATABASE_URL` con la conexión del pooler de Supabase (puerto 6543).
3. Cada push a `main` despliega automáticamente. Render verifica `/api/health` antes de dar el despliegue por bueno.

> En el plan gratuito el servicio se "duerme" tras 15 min sin tráfico; la primera petición tarda unos segundos.

### Frontend en Vercel

1. En [Vercel](https://vercel.com): **Add New → Project**, importa este repositorio.
2. En **Root Directory** elige `apps/web` (Vercel toma el resto de `apps/web/vercel.json`).
3. Agrega `VITE_API_URL` con la URL del API en Render (p. ej. `https://gymtrack-api.onrender.com/api`), `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Vercel despliega `main` a producción y crea una vista previa por cada Pull Request.
