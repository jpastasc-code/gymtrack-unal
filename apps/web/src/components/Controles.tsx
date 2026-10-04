import { useId, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const BASE =
  'rounded-xl bg-hueso px-4 py-2 text-lg text-negro focus:border-negro focus:outline-3 focus:outline-offset-2 focus:outline-negro'

function Mensaje({ id, ayuda, error }: { id: string; ayuda?: string; error?: string }) {
  const texto = error ?? ayuda
  if (!texto) return null
  return (
    <p id={id} className={`text-sm ${error ? 'font-medium text-alerta' : 'text-grafito'}`}>
      {texto}
    </p>
  )
}

interface PropsSelector extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string
  opciones: { valor: string; nombre: string }[]
  ayuda?: string
  error?: string
}

/** Lista desplegable con etiqueta visible, ayuda y error (sistema de diseño GymTrack). */
export function Selector({ etiqueta, opciones, ayuda, error, id, ...resto }: PropsSelector) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <select
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${idCampo}-mensaje` : undefined}
        className={`min-h-13 ${BASE} ${error ? 'border-2 border-alerta' : 'border border-borde-control'}`}
        {...resto}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nombre}
          </option>
        ))}
      </select>
      <Mensaje id={`${idCampo}-mensaje`} ayuda={ayuda} error={error} />
    </div>
  )
}

interface PropsAreaTexto extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta: string
  ayuda?: string
  error?: string
}

/** Texto de varias líneas con etiqueta visible, ayuda y error. */
export function AreaTexto({ etiqueta, ayuda, error, id, ...resto }: PropsAreaTexto) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <textarea
        id={idCampo}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${idCampo}-mensaje` : undefined}
        className={`${BASE} ${error ? 'border-2 border-alerta' : 'border border-borde-control'}`}
        {...resto}
      />
      <Mensaje id={`${idCampo}-mensaje`} ayuda={ayuda} error={error} />
    </div>
  )
}
