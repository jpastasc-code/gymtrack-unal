/**
 * `pnpm demo`: levanta GymTrack completo en local con datos de prueba, sin credenciales.
 *
 * 1. Base de datos: PostgreSQL en Docker (compose.demo.yaml) o la de DEMO_DATABASE_URL.
 * 2. Auth: un simulador local de Supabase Auth (scripts/demo/auth-local.mjs).
 * 3. Migraciones (prisma migrate deploy) y seed con los usuarios de prueba.
 * 4. API (NestJS en modo watch) y web (Vite). La web reenvía /api y /auth/v1 a los
 *    otros dos procesos, así todo se usa desde un solo puerto (sirve en Codespaces).
 *
 * Nunca toca Supabase ni los archivos .env: toda la configuración va por variables
 * de entorno de los procesos hijos, que tienen prioridad sobre los .env.
 */
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const WINDOWS = process.platform === 'win32'
const PUERTOS = { web: 5173, api: 3000, auth: 54321 }
const CONTRASENA = 'gymtrack-demo'
// Secreto fijo y público a propósito: solo firma tokens del simulador local.
const SECRETO_JWT = 'secreto-publico-solo-para-la-demo-local-de-gymtrack'
const BD_DOCKER = 'postgresql://postgres:postgres@127.0.0.1:54329/gymtrack_demo'

const COLORES = { auth: 35, api: 36, web: 32, bd: 33, demo: 1 }
const log = (quien, texto) => console.log(`\x1b[${COLORES[quien] ?? 0}m[${quien}]\x1b[0m ${texto}`)

/** @type {import('node:child_process').ChildProcess[]} */
const procesos = []
let cerrando = false

/** Error fatal: cierra lo que ya se había lanzado y termina. */
function fallar(texto) {
  log('demo', `\x1b[31m${texto}\x1b[0m`)
  cerrando = true
  matarProcesos()
  process.exit(1)
}

function detenerTodo(codigo = 0) {
  if (cerrando) return
  cerrando = true
  matarProcesos()
  setTimeout(() => process.exit(codigo), 500)
}

function matarProcesos() {
  for (const p of procesos) {
    if (p.exitCode !== null || !p.pid) continue
    try {
      // Cada proceso va en su propio grupo para cerrar también a sus hijos (pnpm → node).
      if (WINDOWS) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
      else process.kill(-p.pid, 'SIGTERM')
    } catch {
      /* ya había terminado */
    }
  }
}
process.on('SIGINT', () => detenerTodo(0))
process.on('SIGTERM', () => detenerTodo(0))

/** Corre un comando hasta que termine; aborta la demo si falla. */
function correr(quien, comando, args, env) {
  log(quien, `${comando} ${args.join(' ')}`)
  const r = spawnSync(comando, args, { cwd: RAIZ, env, stdio: 'inherit', shell: WINDOWS })
  if (r.status !== 0) fallar(`Falló: ${comando} ${args.join(' ')}`)
}

/** Arranca un proceso de larga duración con su salida prefijada. */
function lanzar(quien, comando, args, env) {
  const p = spawn(comando, args, { cwd: RAIZ, env, shell: WINDOWS, detached: !WINDOWS })
  procesos.push(p)
  for (const flujo of [p.stdout, p.stderr]) {
    let resto = ''
    flujo.on('data', (parte) => {
      const lineas = (resto + parte).split(/\r?\n/)
      resto = lineas.pop() ?? ''
      for (const linea of lineas) if (linea.trim()) log(quien, linea)
    })
  }
  p.on('exit', (codigo) => {
    if (cerrando) return
    log('demo', `\x1b[31m${quien} se detuvo (código ${codigo}). Cerrando la demo.\x1b[0m`)
    detenerTodo(1)
  })
  return p
}

const puertoLibre = (puerto) =>
  new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => s.close(() => resolve(true)))
    s.listen(puerto, '127.0.0.1')
  })

async function esperar(descripcion, prueba, segundos = 120) {
  const limite = Date.now() + segundos * 1000
  while (Date.now() < limite) {
    if (cerrando) return
    try {
      if (await prueba()) return
    } catch {
      /* todavía no responde */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  fallar(`${descripcion} no respondió en ${segundos} s.`)
}

// ── 1. Requisitos ────────────────────────────────────────────────────────────
const [mayor, menor] = process.versions.node.split('.').map(Number)
if (mayor < 24 || (mayor === 24 && menor < 9)) {
  fallar(`Se necesita Node.js 24.9 o superior (tienes ${process.versions.node}). Con nvm: nvm use`)
}
for (const [nombre, puerto] of Object.entries(PUERTOS)) {
  if (!(await puertoLibre(puerto))) {
    fallar(`El puerto ${puerto} (${nombre}) está ocupado. ¿Ya tienes corriendo pnpm dev:api, dev:web u otra demo?`)
  }
}

// ── 2. Base de datos ─────────────────────────────────────────────────────────
let urlBd = process.env.DEMO_DATABASE_URL
if (urlBd) {
  log('bd', 'Usando DEMO_DATABASE_URL.')
} else {
  const docker = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore', shell: WINDOWS })
  if (docker.status !== 0) {
    fallar(
      'No encontré Docker. Instala Docker Desktop, o define DEMO_DATABASE_URL con un PostgreSQL local ' +
        '(p. ej. postgresql://postgres:postgres@localhost:5432/gymtrack_demo), o abre el repo en Codespaces.',
    )
  }
  correr('bd', 'docker', ['compose', '-f', 'compose.demo.yaml', 'up', '-d', '--wait'], process.env)
  urlBd = BD_DOCKER
}
if (/supabase\.(co|com)/.test(urlBd)) {
  fallar('La demo siembra usuarios de prueba con una contraseña pública: no la apuntes a Supabase. Usa una base local.')
}

const env = {
  ...process.env,
  // API y Prisma
  DATABASE_URL: urlBd,
  DIRECT_URL: urlBd,
  PORT: String(PUERTOS.api),
  CORS_ORIGINS: '', // todo llega por el proxy de Vite; vacío = cualquier origen
  SUPABASE_URL: `http://localhost:${PUERTOS.auth}`,
  SUPABASE_JWT_SECRET: SECRETO_JWT,
  SUPABASE_SERVICE_ROLE_KEY: 'demo-local',
  SEED_PASSWORD: CONTRASENA,
  // Simulador de auth
  DEMO_AUTH_PORT: String(PUERTOS.auth),
  DEMO_JWT_SECRET: SECRETO_JWT,
  // Web: rutas relativas, resueltas contra el origen de la página (ver apps/web/vite.config.ts)
  GYMTRACK_DEMO: '1',
  VITE_API_URL: '/api',
  VITE_SUPABASE_URL: '/',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'demo-local',
}

// ── 3. Auth, migraciones y seed ──────────────────────────────────────────────
lanzar('auth', 'node', ['scripts/demo/auth-local.mjs'], env)
await esperar('El simulador de auth', async () => !(await puertoLibre(PUERTOS.auth)), 15)

correr('bd', 'pnpm', ['--filter', 'api', 'exec', 'prisma', 'migrate', 'deploy'], env)
correr('bd', 'pnpm', ['--filter', 'api', 'exec', 'prisma', 'db', 'seed'], env)

// ── 4. API y web ─────────────────────────────────────────────────────────────
lanzar('api', 'pnpm', ['--filter', 'api', 'start:dev', '--preserveWatchOutput'], env)
lanzar('web', 'pnpm', ['--filter', 'web', 'dev'], env)

await esperar('El API', async () => (await fetch(`http://localhost:${PUERTOS.api}/api/health`)).ok, 180)
await esperar('La web', async () => (await fetch(`http://localhost:${PUERTOS.web}/`)).ok, 60)

const codespace = process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
const urlWeb = codespace
  ? `https://${process.env.CODESPACE_NAME}-${PUERTOS.web}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
  : `http://localhost:${PUERTOS.web}`

console.log(`
\x1b[1m\x1b[32m✔ GymTrack está corriendo en modo demo\x1b[0m

  App:      ${urlWeb}
  Swagger:  ${urlWeb}/api/docs

  Usuarios de prueba (contraseña: \x1b[1m${CONTRASENA}\x1b[0m)
    deportista@gymtrack.test   Deportista con evaluación y rutina
    instructor@gymtrack.test   Instructor: catálogo y evaluaciones
    admin@gymtrack.test        Administrador

  Los cambios en el código se recargan solos. Ctrl+C para detener.
`)
