# GymTrack UNAL

[![Abrir en GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/jpastasc-code/gymtrack-unal?quickstart=1)

App web para el gimnasio de la Universidad Nacional.

Monorepo con [pnpm workspaces](https://pnpm.io/workspaces):

| Carpeta    | Qué es                                   | Stack                              |
| ---------- | ---------------------------------------- | ---------------------------------- |
| `apps/api` | Backend REST, documentado con Swagger    | NestJS + TypeScript                |
| `apps/web` | Frontend                                 | React + Vite + TypeScript          |
| `packages/shared` | Código que usan el API y la web: fórmulas nutricionales (DT-07) | TypeScript + Vitest |

Base de datos y autenticación en **Supabase** (PostgreSQL + Supabase Auth), con **Prisma** como ORM.
El modelo de datos está documentado en [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md).

**Antes de contribuir, lee la [wiki del equipo](docs/wiki/Home.md):** Definition of Done, convenciones de ramas, commits y PRs, decisiones técnicas y proceso de sprint.

## Requisitos

- **Node.js 24.9 o superior** (la versión está en `.nvmrc`; con nvm: `nvm use`).
  Jest necesita Node ≥ 24.9 para cargar los paquetes ESM de NestJS 12.
- **pnpm 12.6** (se descarga solo gracias al campo `packageManager`; también puedes usar `corepack enable`).

## Probar la app en un minuto (modo demo)

Levanta la app completa (base de datos, API y web) con datos de prueba, **sin credenciales de Supabase**. Sirve para revisar un PR, mostrar el avance del sprint o empezar a programar.

**Opción A: en el navegador, sin instalar nada.** Pulsa el botón **Open in GitHub Codespaces** de arriba y luego **Create codespace**. La primera vez tarda unos 3 minutos en instalar todo; después la demo arranca sola y la app se abre en una pestaña (si no, abre el puerto **5173** en la pestaña *Ports*). Para probar otra rama, elígela en *Change options* antes de crear el codespace.

> Las cuentas personales de GitHub tienen horas gratis de Codespaces al mes. Detén el codespace cuando termines (github.com/codespaces) para no gastarlas.

**Opción B: en tu computador.** Necesitas Node.js 24.9+ y [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto:

```bash
pnpm install
pnpm demo        # abre http://localhost:5173
```

Entra con cualquiera de estos usuarios, todos con la contraseña **`gymtrack-demo`**:

| Correo                     | Para probar |
| -------------------------- | ----------- |
| `deportista@gymtrack.test` | El modo deportista: Inicio, rutina, entrenar, reservas, perfil |
| `instructor@gymtrack.test` | El panel del personal con sus 5 secciones (rutinas, evaluaciones, ejercicios, cupos y cancha) y el cambio al modo deportista |
| `deportes@gymtrack.test`   | El panel del personal solo con cupos y cancha |
| `admin@gymtrack.test`      | Todo lo anterior |

Cómo funciona:
- **Base de datos:** un PostgreSQL 17 en Docker (`compose.demo.yaml`, puerto 54329) con las migraciones y el seed del repo. Los datos se conservan entre ejecuciones. Para empezar de cero: `docker compose -f compose.demo.yaml down -v`. Sin Docker puedes usar tu propio PostgreSQL con una base vacía: `DEMO_DATABASE_URL=postgresql://usuario:clave@localhost:5432/gymtrack_demo pnpm demo`.
- **Inicio de sesión:** `scripts/demo/auth-local.mjs` imita Supabase Auth en local (ver DT-10 en la [wiki](docs/wiki/Decisiones-tecnicas.md)). Es solo para desarrollo; producción sigue usando Supabase.
- **Un solo puerto:** la web (5173) reenvía `/api` al API (3000) y `/auth/v1` al simulador (54321). Swagger queda en http://localhost:5173/api/docs.
- **Recarga en caliente:** API y web corren en modo desarrollo, así que los cambios en el código se ven al instante.
- No lee ni modifica tus archivos `.env`, y se niega a correr contra una base de datos de Supabase.

## Primeros pasos (con Supabase)

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
| `pnpm demo`         | App completa en local con datos de prueba (ver [modo demo](#probar-la-app-en-un-minuto-modo-demo)) |
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
| GET    | `/api/auth/yo`    | Perfil, rol y `permisos` del usuario con sesión (requiere token). La web decide con `permisos` qué mostrar. |
| GET    | `/api/perfil`     | Mi perfil completo (datos personales, institucionales y de entrenamiento) |
| PATCH  | `/api/perfil`     | Actualiza mis datos personales, objetivo y nivel de actividad. Documento, correo y rol no se pueden editar. |
| GET    | `/api/ejercicios` | Catálogo de ejercicios. `?q=` busca en nombre y descripción sin importar tildes; `?grupo=ESPALDA` filtra por grupo muscular; `?incluirInactivos=true` (con `GESTIONAR_EJERCICIOS`) muestra los desactivados. |
| GET    | `/api/ejercicios/:id` | Detalle de un ejercicio. |
| POST   | `/api/ejercicios` | Crea un ejercicio (`GESTIONAR_EJERCICIOS`). Nombre único sin importar tildes ni mayúsculas. |
| PATCH  | `/api/ejercicios/:id` | Edita, desactiva (`activo: false`) o reactiva un ejercicio (`GESTIONAR_EJERCICIOS`). |
| DELETE | `/api/ejercicios/:id` | Elimina un ejercicio que nadie usa (`GESTIONAR_EJERCICIOS`). Si está en rutinas o registros responde 409: hay que desactivarlo. |
| GET    | `/api/deportistas` | Busca deportistas activos por nombre, documento o correo (`REGISTRAR_EVALUACIONES` o `GESTIONAR_RUTINAS`). |
| GET    | `/api/deportistas/:id` | Datos básicos de un deportista (`REGISTRAR_EVALUACIONES` o `GESTIONAR_RUTINAS`). |
| GET    | `/api/deportistas/:id/evaluaciones` | Historial de evaluaciones, de la más reciente a la más antigua (`REGISTRAR_EVALUACIONES`). |
| POST   | `/api/deportistas/:id/evaluaciones` | Registra una evaluación nueva; nunca modifica las anteriores. Valida rangos de peso, talla, % de grasa y de cada medida; los errores de una medida llegan como `medidas.<i>.valor` (`REGISTRAR_EVALUACIONES`). |
| GET    | `/api/deportistas/:id/rutinas` | Rutinas de un deportista: la vigente y las anteriores (`GESTIONAR_RUTINAS`). |
| POST   | `/api/deportistas/:id/rutinas` | Arma y asigna una rutina; la anterior deja de estar vigente (`GESTIONAR_RUTINAS`). |
| GET    | `/api/cancha/disponibilidad` | Franjas de la cancha de una semana (`?semana=AAAA-MM-DD`) con su estado: `DISPONIBLE`, `RESERVADA`, `TUYA` o `PASADA`. Con `GESTIONAR_CANCHA`, cada franja ocupada trae `reserva` (id y nombre de quien reservó). |
| POST   | `/api/cancha/reservas` | Reserva una franja libre (`{ franjaId, fecha }`) a nombre de quien la pide. Si alguien la reservó primero, 409. |
| GET    | `/api/cancha/reservas/mias` | Mis reservas de la cancha que todavía no terminan. |
| POST   | `/api/cancha/reservas/:id/cancelar` | Cancela una reserva antes de que empiece (quien la hizo o quien tiene `GESTIONAR_CANCHA`); la franja queda libre de inmediato. 204, también si ya estaba cancelada. |
| GET, POST | `/api/cancha/franjas` | Lista y crea las franjas semanales de la cancha (`GESTIONAR_CANCHA`). |
| PATCH, DELETE | `/api/cancha/franjas/:id` | Habilita, deshabilita o elimina una franja de la cancha (`GESTIONAR_CANCHA`). |
| POST   | `/api/gimnasio/reservas/:id/cancelar` | Cancela un cupo del gimnasio antes de que empiece la franja (quien lo reservó o quien tiene `GESTIONAR_CUPOS_GIMNASIO`). |
| GET    | `/api/gimnasio/franjas` | Franjas del gimnasio con su cupo (`GESTIONAR_CUPOS_GIMNASIO`). |
| PATCH  | `/api/gimnasio/franjas/:id` | Cambia el cupo de una franja del gimnasio (`GESTIONAR_CUPOS_GIMNASIO`). |

Todas las rutas exigen `Authorization: Bearer <token de Supabase>` salvo las marcadas con `@Publico()` (`/api`, `/api/health`). Para restringir una ruta usa `@Permisos('GESTIONAR_RUTINAS', …)`: deja pasar a quien tenga al menos uno de esos permisos según su rol, que se lee de la tabla `usuario`. En Swagger, el botón **Authorize** acepta el token.

Los errores de validación responden `400` con `{ message, errores: { campo: "mensaje en español" } }`, para que la web muestre cada error junto a su campo.

### Roles y permisos

Los permisos de cada rol están en `PERMISOS_POR_ROL` (`packages/shared/src/permisos.ts`, [DT-16](docs/wiki/Decisiones-tecnicas.md#dt-16--permisos-por-rol-y-panel-del-personal)). Para adaptar la app a otro gimnasio se cambia esa tabla, sin tocar pantallas ni endpoints.

| Permiso | Qué deja hacer | Deportista | Instructor | Personal de deportes | Admin |
| ------- | -------------- | :--------: | :--------: | :------------------: | :---: |
| `GESTIONAR_RUTINAS` | Armar y asignar rutinas | | ✓ | | ✓ |
| `REGISTRAR_EVALUACIONES` | Registrar evaluaciones físicas | | ✓ | | ✓ |
| `GESTIONAR_EJERCICIOS` | Crear, editar y desactivar ejercicios del catálogo | | ✓ | | ✓ |
| `GESTIONAR_CUPOS_GIMNASIO` | Cambiar el cupo de las franjas y cancelar cupos ajenos | | ✓ | ✓ | ✓ |
| `GESTIONAR_CANCHA` | Definir el horario de la cancha y cancelar reservas ajenas | | ✓ | ✓ | ✓ |

## Variables de entorno

Nunca subas archivos `.env` al repositorio; usa los `.env.example` como plantilla.

### API (`apps/api/.env`)

| Variable       | Obligatoria | Por defecto | Descripción |
| -------------- | ----------- | ----------- | ----------- |
| `PORT`         | No          | `3000`      | Puerto HTTP. En Render lo asigna la plataforma. |
| `CORS_ORIGINS` | En producción | *(vacío = cualquier origen)* | Orígenes permitidos separados por coma, p. ej. `https://gymtrack-unal.vercel.app,http://localhost:5173`. |
| `DATABASE_URL` | Sí          | —           | Conexión de Supabase por el pooler en **modo transacción** (puerto 6543, con `?pgbouncer=true`). La usa el API. |
| `DIRECT_URL`   | Para migrar y sembrar | — | Conexión de Supabase por el pooler en **modo sesión** (puerto 5432). La usan `prisma migrate` y el seed. |
| `SUPABASE_URL` | Sí          | — | `https://ubijemneujcpxdzwoufk.supabase.co`. El API valida los tokens de sesión con las claves públicas de este proyecto; sin ella, toda ruta protegida responde 401. |
| `SUPABASE_JWT_SECRET` | Solo con secreto heredado | — | Si Supabase aún firma los tokens con el secreto JWT heredado (HS256), cópialo de Project Settings → JWT Keys. **Solo backend.** |
| `SUPABASE_SERVICE_ROLE_KEY` | Para el seed | — | Clave secreta de Supabase (Project Settings → API Keys). **Solo backend, nunca en el frontend ni en el repo.** |
| `SEED_PASSWORD` | Para el seed | — | Contraseña de los usuarios de prueba (mín. 10 caracteres). |

### Frontend (`apps/web/.env`)

| Variable       | Obligatoria | Ejemplo                       | Descripción |
| -------------- | ----------- | ----------------------------- | ----------- |
| `VITE_API_URL` | Sí          | `http://localhost:3000/api`   | URL base del API, sin barra final. |
| `VITE_SUPABASE_URL` | Sí     | `https://ubijemneujcpxdzwoufk.supabase.co` | URL del proyecto de Supabase (para Supabase Auth). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sí | `sb_publishable_…` | Clave publicable; es segura en el navegador porque RLS bloquea el acceso directo a las tablas. |

> Las variables de Vite se incrustan en el build: si cambias `VITE_API_URL` en Vercel hay que volver a desplegar.

## Código compartido (`packages/shared`)

- Lo importan el API y la web como `@gymtrack/shared`. Tiene las fórmulas nutricionales de [DT-07](docs/wiki/Decisiones-tecnicas.md#dt-07--fórmulas-nutricionales), la mejor marca del progreso y los permisos por rol de [DT-16](docs/wiki/Decisiones-tecnicas.md#dt-16--permisos-por-rol-y-panel-del-personal), con sus pruebas (`pnpm --filter @gymtrack/shared test`).
- Se compila a `packages/shared/dist/` al hacer `pnpm install`. Si lo cambias, vuelve a compilarlo con `pnpm --filter @gymtrack/shared build` (o déjalo compilando con `pnpm --filter @gymtrack/shared dev`) para que el API y la web vean el cambio.
- No depende de NestJS, React ni Prisma: solo lógica que funcione igual en el servidor y en el navegador.

## Frontend (`apps/web`)

- **Stack:** React 19 + TypeScript + Vite, Tailwind CSS 4, React Router, TanStack Query y `vite-plugin-pwa`.
- **Estructura por funcionalidad:** cada épica tiene su carpeta en `src/features/<épica>/` (`auth`, `evaluacion`, `rutinas`, `entrenamiento`, `nutricion`, `gimnasio`, `cancha`, `progreso`, además de `inicio` y `panel`).
  La configuración de la app (rutas, layout, TanStack Query) está en `src/app/`, los componentes compartidos en `src/components/` y el cliente HTTP en `src/lib/api/`.
- **Rutas:** se declaran en `src/app/rutas.tsx`. `/login` va fuera del layout. El modo deportista usa `AppLayout` (Inicio, Rutina, Entrenar, Reservas, Perfil) y el panel del personal, bajo `/panel`, usa `PanelLayout` con una pestaña por permiso ([DT-16](docs/wiki/Decisiones-tecnicas.md#dt-16--permisos-por-rol-y-panel-del-personal)).
- **Llamadas al API:** usa `apiFetch` (`src/lib/api/client.ts`) dentro de hooks de TanStack Query; toma `VITE_API_URL`, envía el token de sesión cuando exista (lo conectará GYMM-10) y convierte los errores en `ApiError`.
- **Diseño:** minimalista en blanco y negro con un solo acento, el verde UNAL. Los colores y la tipografía son tokens de Tailwind en `src/index.css` y las piezas reutilizables están en `src/components/`. Antes de hacer una pantalla lee el [Sistema de diseño](docs/wiki/Sistema-de-diseno.md).
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
