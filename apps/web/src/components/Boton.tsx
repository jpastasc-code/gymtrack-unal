import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'texto'
  bloque?: boolean
  /** 56px de alto, para acciones durante el entrenamiento o formularios principales. */
  grande?: boolean
}

const VARIANTES = {
  primario: 'bg-negro text-blanco hover:bg-negro-suave disabled:hover:bg-negro',
  secundario: 'bg-blanco text-negro shadow-[inset_0_0_0_1.5px_var(--color-negro)] hover:bg-hueso',
  texto: 'px-2 text-negro underline underline-offset-4 hover:text-grafito',
} as const

/** Botón del sistema de diseño GymTrack (componente Boton): píldora negra o con borde. */
export function Boton({ variante = 'primario', bloque, grande, className = '', type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'texto' ? 'min-h-11 text-base' : `rounded-full px-6 text-lg ${grande ? 'min-h-14' : 'min-h-11'}`,
        VARIANTES[variante],
        bloque ? 'flex w-full' : '',
        className,
      ].join(' ')}
      {...resto}
    />
  )
}
