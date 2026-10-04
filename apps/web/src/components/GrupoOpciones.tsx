import { useId } from 'react'

export interface Opcion<T extends string> {
  valor: T
  titulo: string
  detalle?: string
}

interface Props<T extends string> {
  leyenda: string
  nombre: string
  opciones: Opcion<T>[]
  valor: T | null
  onChange: (valor: T) => void
  /** "fila": botones lado a lado (pocas opciones cortas); "lista": una opción por renglón con detalle. */
  forma?: 'fila' | 'lista'
  error?: string
}

/** Grupo de opciones excluyentes, con radios reales (teclado y lector de pantalla). */
export function GrupoOpciones<T extends string>({
  leyenda,
  nombre,
  opciones,
  valor,
  onChange,
  forma = 'lista',
  error,
}: Props<T>) {
  const idError = useId()
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? idError : undefined}>
      <legend className="mb-2 font-semibold">{leyenda}</legend>
      <div className={forma === 'fila' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
        {opciones.map((o) => {
          const activa = o.valor === valor
          return (
            <label
              key={o.valor}
              className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-negro ${
                activa ? 'border-verde bg-verde text-negro' : 'border-borde-control bg-hueso hover:bg-linea'
              }`}
            >
              <input
                type="radio"
                name={nombre}
                value={o.valor}
                checked={activa}
                onChange={() => onChange(o.valor)}
                className="size-5 accent-negro"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{o.titulo}</span>
                {o.detalle && <span className={`text-sm ${activa ? 'text-verde-tinta' : 'text-grafito'}`}>{o.detalle}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={idError} className="text-sm font-medium text-alerta">
          {error}
        </p>
      )}
    </fieldset>
  )
}
