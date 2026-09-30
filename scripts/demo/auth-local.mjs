/**
 * Simulador mínimo de Supabase Auth para `pnpm demo`. SOLO PARA DESARROLLO LOCAL.
 *
 * Implementa lo justo para que la app funcione sin el proyecto real de Supabase:
 * - POST /auth/v1/admin/users            (lo usa el seed para crear los usuarios de prueba)
 * - POST /auth/v1/token?grant_type=...   (inicio de sesión con contraseña y renovación)
 * - GET  /auth/v1/user, POST /auth/v1/logout
 *
 * Los tokens se firman con HS256 y DEMO_JWT_SECRET; el API los acepta porque la demo le pasa
 * el mismo valor en SUPABASE_JWT_SECRET (ver DT-05 y DT-10 en docs/wiki/Decisiones-tecnicas.md).
 * Los usuarios viven en memoria: el seed los vuelve a crear en cada `pnpm demo`.
 * Escucha solo en 127.0.0.1; la web llega a él por el proxy de Vite (/auth/v1).
 */
import crypto from 'node:crypto'
import http from 'node:http'

const PUERTO = Number(process.env.DEMO_AUTH_PORT ?? 54321)
const EMISOR = `http://localhost:${PUERTO}/auth/v1`
const SECRETO = process.env.DEMO_JWT_SECRET
const DURACION_S = 3600

if (!SECRETO || SECRETO.length < 32) {
  console.error('DEMO_JWT_SECRET debe tener al menos 32 caracteres (lo define scripts/demo/iniciar.mjs).')
  process.exit(1)
}

/** @type {Map<string, {id: string, email: string, password: string, app_metadata: object}>} */
const usuarios = new Map()
/** refresh token -> correo */
const renovaciones = new Map()

const base64url = (valor) => Buffer.from(JSON.stringify(valor)).toString('base64url')

function firmar(payload) {
  const datos = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}`
  return `${datos}.${crypto.createHmac('sha256', SECRETO).update(datos).digest('base64url')}`
}

function verificar(token) {
  const [cabecera, cuerpo, firma] = String(token).split('.')
  if (!firma) return undefined
  const esperada = crypto.createHmac('sha256', SECRETO).update(`${cabecera}.${cuerpo}`).digest('base64url')
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return undefined
  const payload = JSON.parse(Buffer.from(cuerpo, 'base64url').toString())
  return payload.exp > Date.now() / 1000 ? payload : undefined
}

function usuarioPublico(u) {
  const ahora = new Date().toISOString()
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: ahora,
    app_metadata: { provider: 'email', providers: ['email'], ...u.app_metadata },
    user_metadata: {},
    identities: [],
    created_at: ahora,
    updated_at: ahora,
  }
}

function sesion(u) {
  const ahora = Math.floor(Date.now() / 1000)
  const refresh = crypto.randomUUID()
  renovaciones.set(refresh, u.email)
  return {
    access_token: firmar({
      iss: EMISOR,
      sub: u.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: u.email,
      app_metadata: u.app_metadata,
      iat: ahora,
      exp: ahora + DURACION_S,
    }),
    token_type: 'bearer',
    expires_in: DURACION_S,
    expires_at: ahora + DURACION_S,
    refresh_token: refresh,
    user: usuarioPublico(u),
  }
}

const servidor = http.createServer((req, res) => {
  let cuerpo = ''
  req.on('data', (parte) => (cuerpo += parte))
  req.on('end', () => {
    const responder = (estado, datos) => {
      res.writeHead(estado, { 'Content-Type': 'application/json' })
      res.end(datos === undefined ? '' : JSON.stringify(datos))
    }
    let datos = {}
    try {
      datos = cuerpo ? JSON.parse(cuerpo) : {}
    } catch {
      return responder(400, { msg: 'JSON inválido' })
    }
    const url = new URL(req.url ?? '/', EMISOR)

    if (req.method === 'POST' && url.pathname === '/auth/v1/admin/users') {
      const correo = String(datos.email ?? '').toLowerCase()
      if (!correo || !datos.password) return responder(400, { msg: 'Faltan email o password' })
      if (usuarios.has(correo)) return responder(422, { msg: 'El usuario ya existe' })
      const u = {
        id: datos.id ?? crypto.randomUUID(),
        email: correo,
        password: datos.password,
        app_metadata: datos.app_metadata ?? {},
      }
      usuarios.set(u.email, u)
      return responder(200, usuarioPublico(u))
    }

    if (req.method === 'POST' && url.pathname === '/auth/v1/token') {
      const tipo = url.searchParams.get('grant_type')
      if (tipo === 'password') {
        const u = usuarios.get(String(datos.email ?? '').toLowerCase())
        if (!u || u.password !== datos.password) {
          return responder(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        }
        return responder(200, sesion(u))
      }
      if (tipo === 'refresh_token') {
        const correo = renovaciones.get(datos.refresh_token)
        renovaciones.delete(datos.refresh_token)
        const u = correo && usuarios.get(correo)
        if (!u) return responder(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
        return responder(200, sesion(u))
      }
    }

    if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
      const payload = verificar((req.headers.authorization ?? '').replace(/^Bearer /i, ''))
      const u = payload && [...usuarios.values()].find((x) => x.id === payload.sub)
      return u ? responder(200, usuarioPublico(u)) : responder(401, { code: 401, msg: 'Sesión no válida' })
    }

    if (req.method === 'POST' && url.pathname === '/auth/v1/logout') return responder(204)

    responder(404, { msg: `El simulador de auth de la demo no implementa ${req.method} ${url.pathname}` })
  })
})

servidor.listen(PUERTO, '127.0.0.1', () => console.log(`Auth local escuchando en ${EMISOR}`))
