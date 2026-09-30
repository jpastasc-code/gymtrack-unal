import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  error?: string
}

/** Campo de formulario del sistema de diseño GymTrack (componente Campo). */
export function Campo({ etiqueta, ayuda, error, id, className = '', ...resto }: Props) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const idMensaje = `${idCampo}-mensaje`
  const mensaje = error ?? ayuda

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={mensaje ? idMensaje : undefined}
        className={`min-h-11 rounded-xl border-2 bg-superficie px-4 py-2 text-lg text-tinta placeholder:text-gris focus:border-campus focus:outline-3 focus:outline-offset-2 focus:outline-campus ${
          error ? 'border-alerta' : 'border-borde-control'
        }`}
        {...resto}
      />
      {mensaje && (
        <p id={idMensaje} className={`text-sm ${error ? 'font-medium text-alerta' : 'text-gris'}`}>
          {mensaje}
        </p>
      )}
    </div>
  )
}
