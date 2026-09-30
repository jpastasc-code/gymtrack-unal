import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  error?: string
  /** Unidad a la derecha del valor, p. ej. "kg" (componente Campo del sistema de diseño). */
  unidad?: string
}

/** Campo de formulario del sistema de diseño GymTrack (componente Campo). */
export function Campo({ etiqueta, ayuda, error, unidad, id, className = '', ...resto }: Props) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const idMensaje = `${idCampo}-mensaje`
  const mensaje = error ?? ayuda

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <div
        className={`flex min-h-11 items-center rounded-xl border-2 bg-superficie focus-within:border-campus focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-campus ${
          error ? 'border-alerta' : 'border-borde-control'
        }`}
      >
        <input
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={mensaje ? idMensaje : undefined}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-2 text-lg text-tinta outline-none placeholder:text-gris"
          {...resto}
        />
        {unidad && (
          <span className="pr-4 text-gris" aria-hidden="true">
            {unidad}
          </span>
        )}
      </div>
      {mensaje && (
        <p id={idMensaje} className={`text-sm ${error ? 'font-medium text-alerta' : 'text-gris'}`}>
          {mensaje}
        </p>
      )}
    </div>
  )
}
