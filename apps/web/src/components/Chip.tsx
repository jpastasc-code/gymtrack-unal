/** Botón de filtro que se queda marcado (verde) mientras está activo. */
export function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border-[1.5px] px-4 font-semibold whitespace-nowrap ${
        activo ? 'border-verde bg-verde text-negro' : 'border-borde-control bg-blanco text-negro hover:bg-hueso'
      }`}
    >
      {children}
    </button>
  )
}
