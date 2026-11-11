import type { DiaGimnasio, FranjaGimnasio, ReservaGimnasio } from '../features/gimnasio/api'

/** Estado inicial del gimnasio simulado (GYMM-27). */
export interface GimnasioSimulado {
  dias: DiaGimnasio[]
  mias?: ReservaGimnasio[]
  franjas?: FranjaGimnasio[]
  /** Código de error para GET /api/gimnasio/disponibilidad. */
  error?: number
}

/** Martes 10 y miércoles 11 de noviembre de 2026: dos franjas por día. */
export const GIMNASIO_BASE: GimnasioSimulado = {
  dias: [
    {
      fecha: '2026-11-10',
      diaSemana: 2,
      franjas: [
        { id: 'g1', horaInicio: '06:00', horaFin: '07:00', cupoMaximo: 30, libres: 30, estado: 'PASADA' },
        { id: 'g2', horaInicio: '18:00', horaFin: '19:00', cupoMaximo: 30, libres: 12, estado: 'DISPONIBLE' },
      ],
    },
    {
      fecha: '2026-11-11',
      diaSemana: 3,
      franjas: [
        { id: 'g3', horaInicio: '07:00', horaFin: '08:00', cupoMaximo: 20, libres: 0, estado: 'LLENA' },
        { id: 'g4', horaInicio: '08:00', horaFin: '09:00', cupoMaximo: 20, libres: 1, estado: 'DISPONIBLE' },
      ],
    },
  ],
  franjas: [
    { id: 'g2', diaSemana: 2, horaInicio: '18:00', horaFin: '19:00', cupoMaximo: 30, activa: true },
    { id: 'g4', diaSemana: 3, horaInicio: '08:00', horaFin: '09:00', cupoMaximo: 20, activa: true },
  ],
}

const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status })

/**
 * Responde las rutas /api/gimnasio/* como el API: reservar ocupa un cupo y
 * cancelar lo libera. Devuelve null si la ruta no es del gimnasio.
 */
export function crearGimnasioFalso(inicial: GimnasioSimulado) {
  const dias: DiaGimnasio[] = structuredClone(inicial.dias)
  const mias: ReservaGimnasio[] = structuredClone(inicial.mias ?? [])
  const franjas: FranjaGimnasio[] = structuredClone(inicial.franjas ?? [])
  let siguiente = 0

  return (pathname: string, metodo: string, init?: RequestInit): Response | null => {
    if (pathname === '/api/gimnasio/disponibilidad') {
      if (inicial.error) return json({ message: 'El servidor tuvo un problema. Intenta de nuevo.' }, inicial.error)
      return json({ hoy: dias[0].fecha, dias })
    }
    if (pathname === '/api/gimnasio/reservas/mias') return json(mias)
    if (pathname === '/api/gimnasio/reservas' && metodo === 'POST') {
      const { franjaId, fecha } = JSON.parse(String(init?.body)) as { franjaId: string; fecha: string }
      const dia = dias.find((d) => d.fecha === fecha)!
      const franja = dia.franjas.find((f) => f.id === franjaId)!
      if (franja.libres === 0) return json({ message: 'Esa franja se llenó. Elige otra hora.' }, 409)
      siguiente += 1
      const reserva: ReservaGimnasio = {
        id: `rg${siguiente}`,
        fecha,
        diaSemana: dia.diaSemana,
        horaInicio: franja.horaInicio,
        horaFin: franja.horaFin,
      }
      Object.assign(franja, { libres: franja.libres - 1, estado: 'TUYA', reservaId: reserva.id })
      mias.push(reserva)
      return json(reserva, 201)
    }
    const cancelar = pathname.match(/^\/api\/gimnasio\/reservas\/([^/]+)\/cancelar$/)
    if (cancelar) {
      const i = mias.findIndex((r) => r.id === cancelar[1])
      if (i === -1) return json({ message: 'Esa reserva no existe.' }, 404)
      mias.splice(i, 1)
      for (const f of dias.flatMap((d) => d.franjas).filter((f) => f.reservaId === cancelar[1])) {
        Object.assign(f, { libres: f.libres + 1, estado: 'DISPONIBLE', reservaId: undefined })
      }
      return new Response(null, { status: 204 })
    }
    if (pathname === '/api/gimnasio/franjas') return json(franjas)
    const franja = pathname.match(/^\/api\/gimnasio\/franjas\/([^/]+)$/)
    if (franja && metodo === 'PATCH') {
      const actual = franjas.find((f) => f.id === franja[1])!
      Object.assign(actual, JSON.parse(String(init?.body)))
      return json(actual)
    }
    return null
  }
}
