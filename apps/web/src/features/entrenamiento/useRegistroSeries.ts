import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api/client'
import { CLAVE_SESION, enviarSerie, type SerieNueva, type Sesion } from './api'

/**
 * Series que se registraron en el celular pero el API aún no confirmó (GYMM-45). Se
 * guardan en este navegador para no perderlas si se cae la señal en el gimnasio o se
 * cierra la app, y se reenvían solas: el API guarda cada serie una sola vez.
 */
export interface SeriePendiente extends SerieNueva {
  sesionId: string
}

const CLAVE_PENDIENTES = 'gymtrack:entrenar:pendientes'
/** Cada cuánto se reintenta mientras quedan series sin enviar. */
export const REINTENTO_MS = 15_000

const misma = (a: SerieNueva, b: SerieNueva) => a.ejercicioId === b.ejercicioId && a.numeroSerie === b.numeroSerie

export function leerPendientes(): SeriePendiente[] {
  try {
    const lista: unknown = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) ?? '[]')
    return Array.isArray(lista) ? (lista as SeriePendiente[]) : []
  } catch {
    return []
  }
}

const colaDe = (sesionId: string) => leerPendientes().filter((p) => p.sesionId === sesionId)

function guardarPendientes(lista: SeriePendiente[]) {
  try {
    if (lista.length === 0) localStorage.removeItem(CLAVE_PENDIENTES)
    else localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(lista))
  } catch {
    // Sin almacenamiento (modo privado): la cola sigue en memoria mientras la app esté abierta.
  }
}

/** Fallos que se arreglan solos (sin señal, servidor caído, sesión por renovar): se reintenta. */
const esPasajero = (error: unknown) =>
  error instanceof ApiError && (error.esErrorDeRed || error.status >= 500 || [401, 408, 429].includes(error.status))

/**
 * Registro de series con cola sin conexión. `registrar` muestra la serie al instante y
 * la envía; si no hay señal queda pendiente y se reintenta al volver la conexión, cada
 * REINTENTO_MS y al abrir la pantalla otra vez.
 */
export function useRegistroSeries(sesion: Sesion) {
  const queryClient = useQueryClient()
  const [pendientes, setPendientes] = useState(() => colaDe(sesion.id))
  const [sinConexion, setSinConexion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Las confirmadas en esta pantalla: salen de la cola en el mismo render en que entran
  // aquí, así la fila no parpadea mientras la caché de la sesión se actualiza.
  const [enviadas, setEnviadas] = useState<SerieNueva[]>([])
  const enviando = useRef(false)

  const actualizarCola = useCallback(
    (cambio: (lista: SeriePendiente[]) => SeriePendiente[]) => {
      // La cola completa puede tener series de otra sesión que no se alcanzaron a enviar.
      const todas = cambio(leerPendientes())
      guardarPendientes(todas)
      setPendientes(todas.filter((p) => p.sesionId === sesion.id))
    },
    [sesion.id],
  )

  const enviar = useCallback(async () => {
    if (enviando.current) return
    enviando.current = true
    try {
      // Se repite hasta vaciar la cola: mientras se enviaba pudieron registrarse más series.
      for (let lote = colaDe(sesion.id); lote.length > 0; lote = colaDe(sesion.id)) {
        for (const serie of lote) {
          try {
            const { sesionId, ...datos } = serie
            const registrada = await enviarSerie(sesionId, datos)
            const conRegistrada = <T extends SerieNueva>(lista: T[]) => [...lista.filter((s) => !misma(s, registrada)), registrada]
            queryClient.setQueryData<Sesion | null>(CLAVE_SESION, (actual) =>
              actual?.id === sesionId ? { ...actual, series: conRegistrada(actual.series) } : actual,
            )
            setEnviadas(conRegistrada)
            // Solo sale de la cola si nadie la corrigió mientras viajaba.
            actualizarCola((lista) =>
              lista.filter(
                (p) =>
                  !(p.sesionId === sesionId && misma(p, serie) && p.cargaKg === serie.cargaKg && p.repeticiones === serie.repeticiones),
              ),
            )
            setSinConexion(false)
          } catch (e) {
            if (esPasajero(e)) {
              setSinConexion(true)
              return
            }
            // El API la rechazó (p. ej. la sesión ya terminó): reintentar no la arregla.
            actualizarCola((lista) => lista.filter((p) => !(p.sesionId === serie.sesionId && misma(p, serie))))
            setError(e instanceof Error ? e.message : 'No se pudo guardar la serie.')
          }
        }
      }
    } finally {
      enviando.current = false
    }
  }, [actualizarCola, queryClient, sesion.id])

  const registrar = useCallback(
    (serie: SerieNueva) => {
      setError(null)
      actualizarCola((lista) => [...lista.filter((p) => !(p.sesionId === sesion.id && misma(p, serie))), { ...serie, sesionId: sesion.id }])
      void enviar()
    },
    [actualizarCola, enviar, sesion.id],
  )

  const hayPendientes = pendientes.length > 0
  useEffect(() => {
    if (!hayPendientes) return
    void enviar()
    const alVolver = () => void enviar()
    window.addEventListener('online', alVolver)
    const intervalo = window.setInterval(alVolver, REINTENTO_MS)
    return () => {
      window.removeEventListener('online', alVolver)
      window.clearInterval(intervalo)
    }
  }, [enviar, hayPendientes])

  // Lo confirmado por el API y, encima, lo que está por enviar.
  const series: SerieMarcada[] = []
  const anotar = (s: SerieNueva, pendiente: boolean) => {
    const i = series.findIndex((x) => misma(x, s))
    const marcada = { ejercicioId: s.ejercicioId, numeroSerie: s.numeroSerie, cargaKg: s.cargaKg, repeticiones: s.repeticiones, pendiente }
    if (i === -1) series.push(marcada)
    else series[i] = marcada
  }
  sesion.series.forEach((s) => anotar(s, false))
  enviadas.forEach((s) => anotar(s, false))
  pendientes.forEach((s) => anotar(s, true))

  return { series, pendientes: pendientes.length, sinConexion: sinConexion && hayPendientes, error, registrar, reintentar: enviar }
}

export interface SerieMarcada extends SerieNueva {
  /** Registrada en el celular pero el API aún no la confirmó. */
  pendiente: boolean
}
