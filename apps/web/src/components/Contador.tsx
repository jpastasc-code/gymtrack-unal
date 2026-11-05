import { useId, useState } from 'react'
import { IconoMas, IconoMenos } from './iconos'

interface Props {
  etiqueta: string
  valor: number
  onCambiar: (valor: number) => void
  /** Cuánto suben o bajan los botones (2,5 kg, 1 repetición…). */
  paso: number
  min?: number
  max: number
  /** Unidad a la derecha del valor, p. ej. "kg". */
  unidad?: string
  /** Acepta decimales al escribir (la carga sí, las repeticiones no). */
  decimal?: boolean
}

const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, useGrouping: false })
const redondear = (n: number) => Math.round(n * 100) / 100

/**
 * Número con botones − y + grandes para usar con una mano en el gimnasio (componente
 * Contador del sistema de diseño). El valor también se puede escribir.
 */
export function Contador({ etiqueta, valor, onCambiar, paso, min = 0, max, unidad, decimal = false }: Props) {
  const id = useId()
  // Lo que la persona está escribiendo; null cuando no está editando el número.
  const [texto, setTexto] = useState<string | null>(null)

  const fijar = (n: number) => onCambiar(redondear(Math.min(max, Math.max(min, n))))

  function confirmarTexto() {
    const n = Number((texto ?? '').replace(',', '.'))
    if (texto !== null && texto.trim() !== '' && !Number.isNaN(n)) fijar(decimal ? n : Math.round(n))
    setTexto(null)
  }

  const nombre = etiqueta.toLowerCase()
  const BOTON =
    'grid size-14 shrink-0 place-items-center rounded-full bg-blanco text-negro shadow-[inset_0_0_0_1.5px_var(--color-negro)] hover:bg-hueso disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {etiqueta}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={BOTON} aria-label={`Bajar ${nombre}`} disabled={valor <= min} onClick={() => fijar(valor - paso)}>
          <IconoMenos />
        </button>
        <div className="flex min-h-14 min-w-0 flex-1 items-center justify-center rounded-xl border border-borde-control bg-hueso focus-within:border-negro focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-negro">
          <input
            id={id}
            inputMode={decimal ? 'decimal' : 'numeric'}
            value={texto ?? formato.format(valor)}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmarTexto}
            onKeyDown={(e) => e.key === 'Enter' && confirmarTexto()}
            onFocus={(e) => {
              setTexto(formato.format(valor))
              e.target.select()
            }}
            className="w-full min-w-0 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none"
          />
          {unidad && (
            <span className="pr-3 text-grafito" aria-hidden="true">
              {unidad}
            </span>
          )}
        </div>
        <button type="button" className={BOTON} aria-label={`Subir ${nombre}`} disabled={valor >= max} onClick={() => fijar(valor + paso)}>
          <IconoMas />
        </button>
      </div>
    </div>
  )
}
