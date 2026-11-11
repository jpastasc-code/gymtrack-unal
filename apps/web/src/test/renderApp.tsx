import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { crearQueryClient } from '../app/query-client'
import { rutas } from '../app/rutas'
import { SesionProvider } from '../features/auth/SesionProvider'
import type { Perfil } from '../features/auth/perfil'
import type { PerfilSesion } from '../features/auth/tipos'
import { sumarDias, type DisponibilidadSemana, type Franja, type NuevaReserva, type ReservaCancha } from '../features/cancha/api'
import type { PrecargaEjercicio, SerieNueva, SerieRegistrada, Sesion } from '../features/entrenamiento/api'
import type { DeportistaResumen, Evaluacion } from '../features/evaluacion/api'
import type { NuevaRutina, Rutina } from '../features/rutinas/api'
import type { Ejercicio } from '../features/rutinas/ejercicios/api'
import { crearGimnasioFalso, GIMNASIO_BASE, type GimnasioSimulado } from './gimnasioFalso'

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

export const PERFIL_DEPORTES: PerfilSesion = {
  id: 'id-deportes@gymtrack.test',
  correo: 'deportes@gymtrack.test',
  nombres: 'Paula',
  apellidos: 'Deportes Prueba',
  rol: 'PERSONAL_DEPORTES',
}

/** Franjas de la cancha de las pruebas: lunes y miércoles por la tarde, sábado temprano. */
export const FRANJAS_CANCHA: Franja[] = [
  { id: 'f1', diaSemana: 1, horaInicio: '14:00', horaFin: '15:00', activa: true },
  { id: 'f2', diaSemana: 3, horaInicio: '14:00', horaFin: '15:00', activa: true },
  { id: 'f3', diaSemana: 3, horaInicio: '18:00', horaFin: '19:00', activa: true },
  { id: 'f4', diaSemana: 4, horaInicio: '18:00', horaFin: '19:00', activa: false },
  { id: 'f5', diaSemana: 6, horaInicio: '08:00', horaFin: '09:00', activa: true },
]

/** En las pruebas, "hoy" es el miércoles 21 de octubre de 2026 a las 3 p. m. (Colombia). */
export const HOY_CANCHA = { fecha: '2026-10-21', hora: '15:00' }

const lunesDe = (fecha: string) => {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay()
  return sumarDias(fecha, 1 - (dia === 0 ? 7 : dia))
}

/** Arma GET /api/cancha/disponibilidad como el API, a partir de las franjas activas. */
function disponibilidadDe(
  franjas: Franja[],
  semana: string | null,
  reservadas: string[],
  mias: string[],
  /** Personal de deportes (GYMM-29): cada franja ocupada dice de quién es. */
  gestor?: { nombreMio: string },
): DisponibilidadSemana {
  const desde = lunesDe(semana ?? HOY_CANCHA.fecha)
  const dias = [1, 2, 3, 4, 5, 6, 7].map((diaSemana) => {
    const fecha = sumarDias(desde, diaSemana - 1)
    return {
      fecha,
      diaSemana,
      franjas: franjas
        .filter((f) => f.activa && f.diaSemana === diaSemana)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
        .map((f) => {
          const pasada = `${fecha} ${f.horaInicio}` <= `${HOY_CANCHA.fecha} ${HOY_CANCHA.hora}`
          const clave = `${fecha} ${f.horaInicio}`
          const estado = pasada
            ? ('PASADA' as const)
            : mias.includes(clave)
              ? ('TUYA' as const)
              : reservadas.includes(clave)
                ? ('RESERVADA' as const)
                : ('DISPONIBLE' as const)
          const duenio = estado === 'TUYA' ? gestor?.nombreMio : estado === 'RESERVADA' ? 'Otra Persona' : undefined
          const reserva = gestor && duenio ? { reserva: { id: `r-${clave}`, nombre: duenio } } : {}
          return { id: f.id, horaInicio: f.horaInicio, horaFin: f.horaFin, estado, ...reserva }
        }),
    }
  })
  return {
    cancha: { id: 'c1', nombre: 'Cancha sintética', descripcion: null },
    hoy: HOY_CANCHA.fecha,
    semana: { desde, hasta: sumarDias(desde, 6) },
    dias,
  }
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

export const RUTINA_VIGENTE: Rutina = {
  id: 'r1',
  nombre: 'Fase 1',
  descripcion: '3 series de 10 a 12 repeticiones.',
  vigente: true,
  fechaAsignacion: '2026-09-22T15:00:00.000Z',
  instructor: { id: 'i1', nombres: 'Iván', apellidos: 'Instructor Prueba' },
  dias: [
    {
      dia: 1,
      ejercicios: [
        {
          id: 're1',
          orden: 1,
          ejercicio: { id: 'e3', nombre: 'Sentadilla con barra', grupoMuscular: 'CUADRICEPS' },
          series: 3,
          repeticionesObjetivo: '10-12',
          metodo: 'TRADICIONAL',
          descansoSegundos: 60,
          notas: null,
        },
      ],
    },
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
  /** Rutinas iniciales de cada deportista (por defecto, ninguna). */
  rutinas?: Record<string, Rutina[]>
  /** Respuesta de POST /api/deportistas/:id/rutinas: por defecto la asigna y la anterior deja de estar vigente. */
  respuestaPostRutina?: (datos: NuevaRutina) => Response
  /** Respuesta de GET /api/perfil/evaluaciones (mi ficha física): por defecto, ninguna. */
  miFicha?: Evaluacion[]
  /** Franjas de la cancha (GYMM-20): por defecto, FRANJAS_CANCHA. */
  franjasCancha?: Franja[]
  /** Franjas reservadas, como "AAAA-MM-DD HH:MM" de inicio. */
  canchaReservada?: string[]
  /** Código de error para GET /api/cancha/disponibilidad (p. ej. 404 sin cancha). */
  errorCancha?: number
  /** Mis reservas de la cancha (GYMM-28), como "AAAA-MM-DD HH:MM" de inicio. Por defecto, ninguna. */
  misReservasCancha?: string[]
  /** Franjas que se ven libres pero otra persona reserva justo antes (POST responde 409). */
  canchaGanadaPorOtro?: string[]
  /** Código de error para GET /api/cancha/reservas/mias. */
  errorMisReservas?: number
  /** GET /api/rutinas/mia (GYMM-22): la rutina vigente, null (404, sin rutina) o un código de error. */
  miRutina?: Rutina | null | number
  /** Sesión de entrenamiento abierta (GYMM-26): por defecto, ninguna. */
  sesionActual?: Sesion | null
  /** GET /api/sesiones/precarga: lo que se hizo la última vez en cada ejercicio. */
  precargaSesiones?: PrecargaEjercicio[]
  /** Mientras `caida` sea true, registrar una serie falla como si no hubiera señal. */
  red?: { caida: boolean }
  /** Cupos del gimnasio (GYMM-27): por defecto, GIMNASIO_BASE. */
  gimnasio?: GimnasioSimulado
}

/** Simula el API: responde /auth/yo y /health según las opciones. */
export function simularApi({
  perfil = PERFIL_DEPORTISTA,
  saludOk = true,
  respuestaPatchPerfil,
  ejerciciosEnUso = [],
  respuestaPostEvaluacion,
  rutinas: rutinasIniciales = {},
  respuestaPostRutina,
  miFicha = [],
  franjasCancha = FRANJAS_CANCHA,
  canchaReservada = ['2026-10-26 14:00'],
  errorCancha,
  misReservasCancha = [],
  canchaGanadaPorOtro = [],
  errorMisReservas,
  miRutina = null,
  sesionActual = null,
  precargaSesiones = [],
  red = { caida: false },
  gimnasio = GIMNASIO_BASE,
}: OpcionesApi = {}) {
  const responderGimnasio = crearGimnasioFalso(gimnasio)
  let sesion: Sesion | null = sesionActual && { ...sesionActual, series: [...sesionActual.series] }
  let franjas = franjasCancha.map((f) => ({ ...f }))
  const reservadasCancha = [...canchaReservada]
  const miasCancha = [...misReservasCancha]
  /** "2026-10-28 14:00" → la reserva como la devuelve el API. */
  const reservaDe = (clave: string): ReservaCancha => {
    const [fecha, horaInicio] = clave.split(' ')
    const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay() || 7
    const franja = franjas.find((f) => f.diaSemana === diaSemana && f.horaInicio === horaInicio)
    return { id: `r-${clave}`, cancha: 'Cancha sintética', fecha, diaSemana, horaInicio, horaFin: franja?.horaFin ?? '' }
  }
  const evaluaciones: Record<string, Evaluacion[]> = { d1: [EVALUACION_INICIAL] }
  const rutinas: Record<string, Rutina[]> = Object.fromEntries(
    Object.entries(rutinasIniciales).map(([id, lista]) => [id, lista.map((r) => ({ ...r }))]),
  )
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
    const rutinasDe = pathname.match(/^\/api\/deportistas\/([^/]+)\/rutinas$/)
    if (rutinasDe) {
      const lista = rutinas[rutinasDe[1]] ?? []
      if (metodo !== 'POST') return json(lista)
      const datos = JSON.parse(String(init?.body)) as NuevaRutina
      if (respuestaPostRutina) return respuestaPostRutina(datos)
      const numeros = [...new Set(datos.ejercicios.map((e) => e.dia))].sort((a, b) => a - b)
      const nueva: Rutina = {
        id: `r-${lista.length + 1}`,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        vigente: true,
        fechaAsignacion: '2026-10-18T15:00:00.000Z',
        instructor: { id: 'i1', nombres: 'Iván', apellidos: 'Instructor Prueba' },
        dias: numeros.map((dia) => ({
          dia,
          ejercicios: datos.ejercicios
            .filter((e) => e.dia === dia)
            .map((e, i) => {
              const { id, nombre, grupoMuscular } = ejercicios.find((x) => x.id === e.ejercicioId)!
              return { ...e, id: `re-${dia}-${i}`, orden: i + 1, ejercicio: { id, nombre, grupoMuscular }, notas: null }
            }),
        })),
      }
      rutinas[rutinasDe[1]] = [nueva, ...lista.map((r) => ({ ...r, vigente: false }))]
      return json(nueva, 201)
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
    if (pathname === '/api/perfil/evaluaciones') return json(miFicha)
    if (pathname === '/api/rutinas/mia') {
      if (typeof miRutina === 'number') return json({ message: 'El servidor tuvo un problema. Intenta de nuevo.' }, miRutina)
      if (miRutina === null) return json({ message: 'Aún no tienes una rutina asignada. Pídesela a tu instructor.' }, 404)
      return json(miRutina)
    }
    const delGimnasio = responderGimnasio(pathname, metodo, init)
    if (delGimnasio) return delGimnasio
    if (pathname === '/api/sesiones/actual') {
      return sesion ? json(sesion) : json({ message: 'No tienes una sesión de entrenamiento abierta.' }, 404)
    }
    if (pathname === '/api/sesiones/precarga') return json(precargaSesiones)
    if (pathname === '/api/sesiones' && metodo === 'POST') {
      sesion ??= { id: 's-nueva', rutinaId: 'r1', inicio: '2026-11-04T13:00:00.000Z', fin: null, series: [] }
      return json(sesion, 201)
    }
    const seriesDe = pathname.match(/^\/api\/sesiones\/([^/]+)\/series$/)
    if (seriesDe) {
      if (red.caida) throw new TypeError('Failed to fetch')
      if (!sesion || sesion.id !== seriesDe[1]) return json({ message: 'Esta sesión ya terminó. Empieza una nueva para seguir registrando.' }, 409)
      const datos = JSON.parse(String(init?.body)) as SerieNueva
      const registrada: SerieRegistrada = { ...datos, registradaEn: '2026-11-04T13:10:00.000Z' }
      sesion.series = [
        ...sesion.series.filter((s) => !(s.ejercicioId === datos.ejercicioId && s.numeroSerie === datos.numeroSerie)),
        registrada,
      ]
      return json(registrada)
    }
    if (/^\/api\/sesiones\/[^/]+\/cerrar$/.test(pathname)) {
      const cerrada = { ...sesion!, fin: '2026-11-04T14:00:00.000Z' }
      sesion = null
      return json(cerrada)
    }
    if (pathname === '/api/cancha/disponibilidad') {
      if (errorCancha) return json({ message: 'La cancha no está habilitada en este momento.' }, errorCancha)
      const datosPerfil = typeof perfil === 'object' ? perfil : null
      const gestor =
        datosPerfil && ['PERSONAL_DEPORTES', 'ADMIN'].includes(datosPerfil.rol)
          ? { nombreMio: `${datosPerfil.nombres} ${datosPerfil.apellidos}` }
          : undefined
      return json(disponibilidadDe(franjas, searchParams.get('semana'), reservadasCancha, miasCancha, gestor))
    }
    if (pathname === '/api/cancha/reservas/mias') {
      if (errorMisReservas) return json({ message: 'No pudimos cargar tus reservas.' }, errorMisReservas)
      return json([...miasCancha].sort().map(reservaDe))
    }
    const cancelacion = pathname.match(/^\/api\/cancha\/reservas\/r-(.+)\/cancelar$/)
    if (cancelacion && metodo === 'POST') {
      const clave = decodeURIComponent(cancelacion[1])
      const gestor = typeof perfil === 'object' && ['PERSONAL_DEPORTES', 'ADMIN'].includes(perfil.rol)
      const lista = miasCancha.includes(clave) ? miasCancha : gestor && reservadasCancha.includes(clave) ? reservadasCancha : null
      if (!lista) return json({ message: 'Solo quien hizo la reserva o el personal de deportes puede cancelarla.' }, 403)
      lista.splice(lista.indexOf(clave), 1)
      return new Response(null, { status: 204 })
    }
    if (pathname === '/api/cancha/reservas' && metodo === 'POST') {
      const datos = JSON.parse(String(init?.body)) as NuevaReserva
      const franja = franjas.find((f) => f.id === datos.franjaId)
      if (!franja) return json({ message: 'Esa franja no existe.' }, 404)
      const clave = `${datos.fecha} ${franja.horaInicio}`
      if (canchaGanadaPorOtro.includes(clave)) reservadasCancha.push(clave)
      if (miasCancha.includes(clave)) return json({ message: 'Ya tienes reservada la cancha en ese horario.' }, 409)
      if (reservadasCancha.includes(clave)) {
        return json({ message: 'Otra persona acaba de reservar esa franja. Elige otra.' }, 409)
      }
      miasCancha.push(clave)
      return json(reservaDe(clave), 201)
    }
    if (pathname === '/api/cancha/franjas' && metodo === 'GET') {
      const ordenadas = [...franjas].sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio))
      return json({ cancha: { id: 'c1', nombre: 'Cancha sintética', descripcion: null }, franjas: ordenadas })
    }
    if (pathname === '/api/cancha/franjas' && metodo === 'POST') {
      const datos = JSON.parse(String(init?.body)) as Omit<Franja, 'id' | 'activa'>
      const cruce = franjas.find(
        (f) => f.diaSemana === datos.diaSemana && datos.horaInicio < f.horaFin && f.horaInicio < datos.horaFin,
      )
      if (cruce) {
        const mensaje = `Se cruza con la franja de ${cruce.horaInicio} a ${cruce.horaFin}.`
        return json({ message: mensaje, errores: { horaInicio: mensaje } }, 409)
      }
      const nueva: Franja = { ...datos, id: `f${franjas.length + 1}`, activa: true }
      franjas.push(nueva)
      return json(nueva, 201)
    }
    const franja = pathname.match(/^\/api\/cancha\/franjas\/([^/]+)$/)
    if (franja) {
      const actual = franjas.find((f) => f.id === franja[1])
      if (!actual) return json({ message: 'Esa franja no existe.' }, 404)
      if (metodo === 'DELETE') {
        franjas = franjas.filter((f) => f.id !== actual.id)
        return new Response(null, { status: 204 })
      }
      Object.assign(actual, JSON.parse(String(init?.body)))
      return json(actual)
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
