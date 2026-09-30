# GymTrack UNAL

App web para el gimnasio de la Universidad Nacional.

Monorepo con [pnpm workspaces](https://pnpm.io/workspaces):

| Carpeta    | Qué es                                   | Stack                              |
| ---------- | ---------------------------------------- | ---------------------------------- |
| `apps/api` | Backend REST, documentado con Swagger    | NestJS + TypeScript                |
| `apps/web` | Frontend                                 | React + Vite + TypeScript          |

## Requisitos

- **Node.js 24.9 o superior** (la versión está en `.nvmrc`; con nvm: `nvm use`).
  Jest necesita Node ≥ 24.9 para cargar los paquetes ESM de NestJS 12.
- **pnpm 12.6** (se descarga solo gracias al campo `packageManager`; también puedes usar `corepack enable`).

## Primeros pasos

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm dev:api   # API en http://localhost:3000/api  (Swagger en /api/docs)
pnpm dev:web   # Frontend en http://localhost:5173
```

## Scripts (desde la raíz)

| Script              | Qué hace                                         |
| ------------------- | ------------------------------------------------ |
| `pnpm lint`         | oxlint en el API y ESLint en el frontend         |
| `pnpm typecheck`    | Verificación de tipos con `tsc` en ambos proyectos |
| `pnpm test`         | Pruebas unitarias (Jest) del API                 |
| `pnpm test:e2e`     | Pruebas end-to-end del API (Jest + Supertest)    |
| `pnpm build`        | Build de producción de ambos proyectos           |

## Endpoints del API

| Método | Ruta              | Descripción                            |
| ------ | ----------------- | -------------------------------------- |
| GET    | `/api`            | "Hola mundo" del API                   |
| GET    | `/api/health`     | Chequeo de salud (lo usa Render)       |
| GET    | `/api/docs`       | Documentación Swagger UI               |
| GET    | `/api/docs-json`  | Especificación OpenAPI en JSON         |

## Variables de entorno

Nunca subas archivos `.env` al repositorio; usa los `.env.example` como plantilla.

### API (`apps/api/.env`)

| Variable       | Obligatoria | Por defecto | Descripción |
| -------------- | ----------- | ----------- | ----------- |
| `PORT`         | No          | `3000`      | Puerto HTTP. En Render lo asigna la plataforma. |
| `CORS_ORIGINS` | En producción | *(vacío = cualquier origen)* | Orígenes permitidos separados por coma, p. ej. `https://gymtrack-unal.vercel.app,http://localhost:5173`. |

### Frontend (`apps/web/.env`)

| Variable       | Obligatoria | Ejemplo                       | Descripción |
| -------------- | ----------- | ----------------------------- | ----------- |
| `VITE_API_URL` | Sí          | `http://localhost:3000/api`   | URL base del API, sin barra final. |

> Las variables de Vite se incrustan en el build: si cambias `VITE_API_URL` en Vercel hay que volver a desplegar.

## Integración continua

`.github/workflows/ci.yml` corre en cada Pull Request (y en cada push a `main`):
lint → typecheck → pruebas unitarias → pruebas e2e → build.
Recomendado: en GitHub, **Settings → Branches**, exigir que el check **CI** pase antes de fusionar a `main`.

## Despliegue

### Backend en Render

1. En [Render](https://render.com): **New → Blueprint** y selecciona este repositorio. Render lee `render.yaml`.
2. Define `CORS_ORIGINS` con la URL del frontend en Vercel.
3. Cada push a `main` despliega automáticamente. Render verifica `/api/health` antes de dar el despliegue por bueno.

> En el plan gratuito el servicio se "duerme" tras 15 min sin tráfico; la primera petición tarda unos segundos.

### Frontend en Vercel

1. En [Vercel](https://vercel.com): **Add New → Project**, importa este repositorio.
2. En **Root Directory** elige `apps/web` (Vercel toma el resto de `apps/web/vercel.json`).
3. Agrega la variable `VITE_API_URL` con la URL del API en Render, p. ej. `https://gymtrack-api.onrender.com/api`.
4. Vercel despliega `main` a producción y crea una vista previa por cada Pull Request.
