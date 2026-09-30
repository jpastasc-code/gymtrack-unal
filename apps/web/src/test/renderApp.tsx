import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { crearQueryClient } from '../app/query-client'
import { rutas } from '../app/rutas'
import { SesionProvider } from '../features/auth/SesionProvider'
import type { Perfil } from '../features/auth/perfil'
import type { PerfilSesion } from '../features/auth/tipos'
import type { DeportistaResumen, Evaluacion } from '../features/evaluacion/api'
import type { Ejercicio } from '../features/rutinas/ejercicios/api'

export const PERFIL_DEPORTISTA: PerfilSesion = {
  id: 'id-deportista@gymtrack.test',
  correo: 'deportista@gymtrack.test',
  nombres: 'Daniela',
  apellidos: 'Deportista Prueba',
  rol: 'DEPORTISTA',
}

export const PERFIL_COMPLETO: Perfil = {
  ...PERFIL_DEPORTISTA,
  documento: '1000000001',
  telefono: null,
  fechaNacimiento: '2003-05-14',
  sexo: 'FEMENINO',
  objetivo: 'GANAR_MASA_MUSCULAR',
  nivelActividad: 'MODERADO',
}

export const PERFIL_INSTRUCTOR: PerfilSesion = {
  id: 'id-instructor@gymtrack.test',
  correo: 'instructor@gymtrack.test',
  nombres: 'Iván',
  apellidos: 'Instructor Prueba',
  rol: 'INSTRUCTOR',
}

export const EJERCICIOS_BASE: Ejercicio[] = [
  { id: 'e1', nombre: 'Jalón al pecho en polea', grupoMuscular: 'ESPALDA', descripcion: 'Halar la barra hacia el pecho.', activo: true },
  { id: 'e2', nombre: 'Remo con barra', grupoMuscular: 'ESPALDA', descripcion: null, activo: true },
  { id: 'e3', nombre: 'Sentadilla con barra', grupoMuscular: 'CUADRICEPS', descripcion: 'Bajar hasta muslos paralelos.', activo: true },
  { id: 'e4', nombre: 'Curl femoral acostado', grupoMuscular: 'ISQUIOTIBIALES', descripcion: null, activo: false },
]

export const DEPORTISTAS: DeportistaResumen[] = [
  { id: 'd1', nombres: 'Daniela', apellidos: 'Deportista Prueba', documento: '1000000001', correo: 'deportista@gymtrack.test' },
  { id: 'd2', nombres: 'Santiago', apellidos: 'Deportista Prueba', documento: '1000000002', correo: 'deportista2@gymtrack.test' },
]

export const EVALUACION_INICIAL: Evaluacion = {
  id: 'ev1',
  fecha: '2026-09-22T15:00:00.000Z',
  pesoKg: 62.5,
  tallaCm: 165,
  porcentajeGrasa: 24.5,
  imc: 23,
  nivelActividad: 'MODERADO',
  observaciones: 'Evaluación inicial de prueba.',
  instructor: { id: 'i1', nombres: 'Iván', apellidos: 'Instructor Prueba' },
  medidas: [
    { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 72, unidad: 'cm' },
    { tipo: 'TEST_FISICO', nombre: 'Flexiones en 1 minuto', valor: 18, unidad: 'rep' },
  ],
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

interface OpcionesApi {
  /** Respuesta de GET /api/auth/yo: un perfil, o un código de error. */
  perfil?: PerfilSesion | number
  /** false simula que el servidor no responde. */
  saludOk?: boolean
  /** Respuesta de PATCH /api/perfil: por defecto guarda y devuelve el perfil actualizado. */
  respuestaPatchPerfil?: (cambios: Record<string, unknown>) => Response
  /** Ids de ejercicios que están en rutinas (DELETE responde 409). */
  ejerciciosEnUso?: string[]
  /** Respuesta de POST /api/deportistas/:id/evaluaciones: por defecto la guarda. */
  respuestaPostEvaluacion?: (datos: Record<string, unknown>) => Response
}

/** Simula el API: responde /auth/yo y /health según las opciones. */
export function simularApi({
  perfil = PERFIL_DEPORTISTA,
  saludOk = true,
  respuestaPatchPerfil,
  ejerciciosEnUso = [],
  respuestaPostEvaluacion,
}: OpcionesApi = {}) {
  const evaluaciones: Record<string, Evaluacion[]> = { d1: [EVALUACION_INICIAL] }
  let perfilCompleto: Perfil = { ...PERFIL_COMPLETO }
  let ejercicios = EJERCICIOS_BASE.map((e) => ({ ...e }))
  const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status })
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = String(entrada)
    const { pathname, searchParams } = new URL(url)
    const metodo = init?.method ?? 'GET'
    if (pathname === '/api/ejercicios' && metodo === 'GET') {
      const q = sinTildes(searchParams.get('q') ?? '')
      const grupo = searchParams.get('grupo')
      const inactivos = searchParams.get('incluirInactivos') === 'true'
      return json(
        ejercicios
          .filter((e) => (inactivos || e.activo) && (!grupo || e.grupoMuscular === grupo))
          .filter((e) => sinTildes(`${e.nombre} ${e.descripcion ?? ''}`).includes(q))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      )
    }
    if (pathname === '/api/ejercicios' && metodo === 'POST') {
      const datos = JSON.parse(String(init?.body)) as Ejercicio
      if (ejercicios.some((e) => sinTildes(e.nombre) === sinTildes(datos.nombre))) {
        const mensaje = `Ya existe un ejercicio llamado "${datos.nombre}".`
        return json({ message: mensaje, errores: { nombre: mensaje } }, 409)
      }
      const nuevo = { ...datos, id: `e${ejercicios.length + 1}`, activo: true }
      ejercicios.push(nuevo)
      return json(nuevo, 201)
    }
    if (pathname === '/api/deportistas') {
      const q = sinTildes(searchParams.get('q') ?? '')
      return json(DEPORTISTAS.filter((d) => sinTildes(`${d.nombres} ${d.apellidos} ${d.documento} ${d.correo}`).includes(q)))
    }
    const deportista = pathname.match(/^\/api\/deportistas\/([^/]+)(\/evaluaciones)?$/)
    if (deportista) {
      const d = DEPORTISTAS.find((x) => x.id === deportista[1])
      if (!d) return json({ message: 'Ese deportista no existe o no está activo.' }, 404)
      if (!deportista[2]) return json(d)
      if (metodo === 'POST') {
        const datos = JSON.parse(String(init?.body)) as Record<string, unknown>
        if (respuestaPostEvaluacion) return respuestaPostEvaluacion(datos)
        const nueva = {
          ...EVALUACION_INICIAL,
          ...datos,
          id: `ev-${Date.now()}`,
          fecha: (datos.fecha as string | undefined) ?? '2026-09-29T20:00:00.000Z',
          imc: 22.1,
        } as Evaluacion
        evaluaciones[d.id] = [nueva, ...(evaluaciones[d.id] ?? [])]
        return json(nueva, 201)
      }
      return json(evaluaciones[d.id] ?? [])
    }
    const detalle = pathname.match(/^\/api\/ejercicios\/([^/]+)$/)
    if (detalle) {
      const actual = ejercicios.find((e) => e.id === detalle[1])
      if (!actual) return json({ message: 'Ese ejercicio no existe.' }, 404)
      if (metodo === 'PATCH') Object.assign(actual, JSON.parse(String(init?.body)))
      if (metodo === 'DELETE') {
        if (ejerciciosEnUso.includes(actual.id)) {
          return json({ message: 'Este ejercicio ya se usa en rutinas o registros de entrenamiento, así que no se puede eliminar. Desactívalo para ocultarlo del catálogo.' }, 409)
        }
        ejercicios = ejercicios.filter((e) => e.id !== actual.id)
        return new Response(null, { status: 204 })
      }
      return json(actual)
    }
    if (url.endsWith('/perfil')) {
      if (init?.method === 'PATCH') {
        const cambios = JSON.parse(String(init.body)) as Record<string, unknown>
        if (respuestaPatchPerfil) return respuestaPatchPerfil(cambios)
        perfilCompleto = { ...perfilCompleto, ...cambios } as Perfil
      }
      return new Response(JSON.stringify(perfilCompleto))
    }
    if (url.endsWith('/auth/yo')) {
      return typeof perfil === 'number'
        ? new Response(JSON.stringify({ message: 'Tu cuenta no tiene un perfil activo en GymTrack.' }), { status: perfil })
        : new Response(JSON.stringify(perfil))
    }
    if (url.endsWith('/health')) {
      if (!saludOk) throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify({ status: 'ok', database: 'ok' }))
    }
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Monta la app completa (sesión, TanStack Query y rutas) en la ruta indicada. */
export function renderApp(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
  return router
}
