import type { SVGProps } from 'react'

/** Íconos de trazo propios de la app (24×24, heredan el color del texto). */
type PropsIcono = SVGProps<SVGSVGElement>

function Base({ children, ...props }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconoInicio(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </Base>
  )
}

export function IconoRutina(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </Base>
  )
}

export function IconoPesa(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M6 7v10M3.5 9.5v5M18 7v10M20.5 9.5v5M6 12h12" />
    </Base>
  )
}

export function IconoCalendario(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Base>
  )
}

export function IconoPerfil(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
    </Base>
  )
}

export function IconoFlecha(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m9 5 7 7-7 7" />
    </Base>
  )
}

export function IconoMas(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function IconoMenos(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
    </Base>
  )
}

export function IconoListo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Base>
  )
}

export function IconoAtras(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m15 5-7 7 7 7" />
    </Base>
  )
}

/** Panel del personal: cuatro bloques. */
export function IconoPanel(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Base>
  )
}

/** Evaluaciones físicas: una línea de pulso. */
export function IconoEvaluacion(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
    </Base>
  )
}

/** Cancha sintética: el campo con su línea y círculo central. */
export function IconoCancha(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
    </Base>
  )
}
