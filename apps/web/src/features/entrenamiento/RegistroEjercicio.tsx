import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { Contador } from '../../components/Contador'
import { IconoListo } from '../../components/iconos'
import { NOMBRE_METODO, type EjercicioEnRutina } from '../rutinas/api'
import type { PrecargaEjercicio, SerieNueva } from './api'
import { describirSerie, valoresIniciales, type Valores } from './valores'

export interface SerieHecha extends Valores {
  /** Registrada en el celular pero el API aún no la confirmó. */
  pendiente: boolean
}

interface Props {
  ejercicio: EjercicioEnRutina
  /** Series de este ejercicio registradas hoy, por número. */
  hechas: Map<number, SerieHecha>
  precarga: PrecargaEjercicio | undefined
  onRegistrar: (serie: SerieNueva) => void
}

/**
 * Las series de un ejercicio como filas (GYMM-44). La siguiente serie por hacer aparece
 * abierta y con los valores de la última vez: registrarla sin cambios es un toque.
 */
export function RegistroEjercicio({ ejercicio, hechas, precarga, onRegistrar }: Props) {
  const [corrigiendo, setCorrigiendo] = useState<number | null>(null)
  const numeros = Array.from({ length: ejercicio.series }, (_, i) => i + 1)
  const abierta = corrigiendo ?? numeros.find((n) => !hechas.has(n)) ?? null
  const inicial = (n: number) => hechas.get(n) ?? valoresIniciales(ejercicio, n, precarga, hechas)

  function registrar(numeroSerie: number, valores: Valores) {
    onRegistrar({ ejercicioId: ejercicio.ejercicio.id, numeroSerie, ...valores })
    setCorrigiendo(null)
  }

  return (
    <section aria-labelledby={`ejercicio-${ejercicio.id}`}>
      <h2 id={`ejercicio-${ejercicio.id}`} className="titular text-3xl">
        {ejercicio.ejercicio.nombre}
      </h2>
      <p className="mt-1 text-grafito">
        {ejercicio.series} × {ejercicio.repeticionesObjetivo} · {NOMBRE_METODO[ejercicio.metodo]}
        {ejercicio.descansoSegundos !== null && ` · descanso ${ejercicio.descansoSegundos} s`}
      </p>
      {ejercicio.notas && <p className="mt-1 text-sm text-grafito">{ejercicio.notas}</p>}
      {precarga && (
        <p className="mt-1 text-sm text-grafito">La última vez: {precarga.series.map(describirSerie).join(' · ')}</p>
      )}

      <ol className="mt-4 border-t border-linea">
        {numeros.map((n) =>
          n === abierta ? (
            <li key={n} className="border-b border-linea py-4">
              <SerieAbierta
                key={`${ejercicio.id}-${n}-${corrigiendo === n}`}
                numero={n}
                inicial={inicial(n)}
                corrigiendo={corrigiendo === n}
                onRegistrar={(valores) => registrar(n, valores)}
                onCancelar={() => setCorrigiendo(null)}
              />
            </li>
          ) : (
            <FilaSerie key={n} numero={n} hecha={hechas.get(n)} prevista={inicial(n)} onCorregir={() => setCorrigiendo(n)} />
          ),
        )}
      </ol>
    </section>
  )
}

function SerieAbierta({
  numero,
  inicial,
  corrigiendo,
  onRegistrar,
  onCancelar,
}: {
  numero: number
  inicial: Valores
  corrigiendo: boolean
  onRegistrar: (valores: Valores) => void
  onCancelar: () => void
}) {
  const [cargaKg, setCargaKg] = useState(inicial.cargaKg)
  const [repeticiones, setRepeticiones] = useState(inicial.repeticiones)

  return (
    <div className="flex flex-col gap-4">
      <p className="font-semibold">Serie {numero}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Contador etiqueta="Carga" unidad="kg" valor={cargaKg} onCambiar={setCargaKg} paso={2.5} max={500} decimal />
        <Contador etiqueta="Repeticiones" valor={repeticiones} onCambiar={setRepeticiones} paso={1} max={100} />
      </div>
      <Boton bloque grande onClick={() => onRegistrar({ cargaKg, repeticiones })}>
        {corrigiendo ? `Guardar serie ${numero}` : `Registrar serie ${numero}`}
      </Boton>
      {corrigiendo && (
        <Boton variante="texto" onClick={onCancelar}>
          Cancelar
        </Boton>
      )}
    </div>
  )
}

function FilaSerie({
  numero,
  hecha,
  prevista,
  onCorregir,
}: {
  numero: number
  hecha: SerieHecha | undefined
  prevista: Valores
  onCorregir: () => void
}) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-linea py-2">
      <span className="w-16 shrink-0 font-semibold">Serie {numero}</span>
      {hecha ? (
        <>
          <span className="flex-1 text-lg tabular-nums">{describirSerie(hecha)}</span>
          {hecha.pendiente ? (
            <span className="text-sm text-grafito">Sin enviar</span>
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-verde-claro text-verde-tinta">
              <IconoListo width={18} height={18} />
              <span className="sr-only">Registrada</span>
            </span>
          )}
          <Boton variante="texto" onClick={onCorregir} aria-label={`Corregir serie ${numero}`}>
            Corregir
          </Boton>
        </>
      ) : (
        <span className="flex-1 text-grafito tabular-nums">{describirSerie(prevista)}</span>
      )}
    </li>
  )
}
