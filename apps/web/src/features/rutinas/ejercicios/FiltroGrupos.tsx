import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Chip } from '../../../components/Chip'
import { IconoAtras, IconoFlecha } from '../../../components/iconos'
import { GRUPOS, type GrupoMuscular } from './api'

interface Props {
  valor: GrupoMuscular | null
  onChange: (grupo: GrupoMuscular | null) => void
  /**
   * Relleno lateral del contenedor: en pantallas táctiles la fila llega hasta el borde para
   * que se note que se desliza ("pagina" = px-5 de Pantalla, "tarjeta" = p-4 de una tarjeta).
   */
  margen: 'pagina' | 'tarjeta'
  className?: string
}

const SANGRIA = {
  pagina: { fuera: '-mx-5', dentro: 'px-5' },
  tarjeta: { fuera: '-mx-4', dentro: 'px-4' },
} as const

/** Píxeles que debe moverse el mouse para que cuente como arrastre y no como clic. */
const UMBRAL_ARRASTRE = 5

/**
 * Filtro por grupo muscular en una sola fila, para no ocupar espacio en la pantalla.
 * - Celular y tableta (táctil): la fila se desliza con el dedo.
 * - Computador (mouse): flechas a los lados cuando hay más grupos hacia ese lado, y la
 *   fila también se puede arrastrar con el mouse.
 * En todos los casos, un desvanecido en el borde indica que hay más botones.
 */
export function FiltroGrupos({ valor, onChange, margen, className = '' }: Props) {
  const fila = useRef<HTMLDivElement>(null)
  const [hayMas, setHayMas] = useState({ antes: false, despues: false })
  const arrastre = useRef<{ x: number; inicio: number; movido: boolean } | null>(null)
  const fueArrastre = useRef(false)

  const medir = useCallback(() => {
    const el = fila.current
    if (!el) return
    const antes = el.scrollLeft > 2
    const despues = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setHayMas((h) => (h.antes === antes && h.despues === despues ? h : { antes, despues }))
  }, [])

  useEffect(() => {
    medir()
    const el = fila.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [medir])

  const desplazar = (sentido: -1 | 1) => {
    const el = fila.current
    el?.scrollBy({ left: sentido * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  // Arrastrar con el mouse (en pantallas táctiles el navegador ya desliza con el dedo).
  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    fueArrastre.current = false
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    arrastre.current = { x: e.clientX, inicio: e.currentTarget.scrollLeft, movido: false }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const a = arrastre.current
    if (!a) return
    const dx = e.clientX - a.x
    if (!a.movido && Math.abs(dx) > UMBRAL_ARRASTRE) {
      a.movido = true
      // Solo al empezar a arrastrar: capturar antes impediría el clic en los botones.
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (a.movido) e.currentTarget.scrollLeft = a.inicio - dx
  }

  function alSoltar() {
    fueArrastre.current = arrastre.current?.movido ?? false
    arrastre.current = null
  }

  return (
    <div className={`relative ${SANGRIA[margen].fuera} pointer-fine:mx-0 ${className}`}>
      <div
        ref={fila}
        role="group"
        aria-label="Filtrar por grupo muscular"
        onScroll={medir}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={(e) => {
          // El clic que cierra un arrastre no debe cambiar el filtro.
          if (fueArrastre.current) {
            e.preventDefault()
            e.stopPropagation()
            fueArrastre.current = false
          }
        }}
        className={`${SANGRIA[margen].dentro} flex gap-2 overflow-x-auto py-1 pointer-fine:px-0 [scrollbar-width:none] pointer-fine:cursor-grab pointer-fine:select-none pointer-fine:active:cursor-grabbing [&::-webkit-scrollbar]:hidden`}
      >
        <Chip activo={valor === null} onClick={() => onChange(null)}>
          Todos
        </Chip>
        {GRUPOS.map((g) => (
          <Chip key={g.valor} activo={valor === g.valor} onClick={() => onChange(valor === g.valor ? null : g.valor)}>
            {g.nombre}
          </Chip>
        ))}
      </div>

      {hayMas.antes && <Indicador lado="antes" onClick={() => desplazar(-1)} />}
      {hayMas.despues && <Indicador lado="despues" onClick={() => desplazar(1)} />}
    </div>
  )
}

/** Desvanecido en el borde (siempre) y flecha para desplazar (solo con mouse), con los íconos de la app. */
function Indicador({ lado, onClick }: { lado: 'antes' | 'despues'; onClick: () => void }) {
  const antes = lado === 'antes'
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 flex w-14 items-center ${
        antes ? 'left-0 justify-start bg-gradient-to-r' : 'right-0 justify-end bg-gradient-to-l'
      } from-blanco from-40% to-transparent`}
    >
      <button
        type="button"
        // Las flechas son un atajo para el mouse; con teclado se recorren los botones con Tab.
        tabIndex={-1}
        aria-label={antes ? 'Ver grupos anteriores' : 'Ver más grupos'}
        onClick={onClick}
        // Mismo estilo que el botón de volver de la app (Pantalla): chevron de trazo sobre un círculo.
        className="pointer-events-auto hidden size-11 place-items-center rounded-full bg-blanco text-negro hover:bg-hueso pointer-fine:grid"
      >
        {antes ? <IconoAtras /> : <IconoFlecha />}
      </button>
    </div>
  )
}
