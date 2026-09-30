import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'texto'
  bloque?: boolean
  /** 56px de alto, para acciones durante el entrenamiento o formularios principales. */
  grande?: boolean
}

const VARIANTES = {
  primario: 'bg-campus text-concreto hover:bg-campus-oscuro disabled:hover:bg-campus',
  secundario: 'border-2 border-borde-control bg-superficie text-tinta hover:bg-campus-claro',
  texto: 'px-2 text-campus underline underline-offset-4 hover:text-campus-oscuro',
} as const

/** Botón del sistema de diseño GymTrack (componente Boton). */
export function Boton({ variante = 'primario', bloque, grande, className = '', type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'texto' ? 'min-h-11 text-base' : `px-5 text-lg ${grande ? 'min-h-14' : 'min-h-11'}`,
        VARIANTES[variante],
        bloque ? 'flex w-full' : '',
        className,
      ].join(' ')}
      {...resto}
    />
  )
}
