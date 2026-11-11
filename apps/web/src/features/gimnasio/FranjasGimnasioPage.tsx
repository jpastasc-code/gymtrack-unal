import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { Chip } from '../../components/Chip'
import { Contador } from '../../components/Contador'
import { AVISO, AVISO_EXITO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { NOMBRE_DIA } from '../cancha/api'
import { MAX_CUPO, useCambiarCupo, useFranjasGimnasio, type FranjaGimnasio } from './api'

/** Cupo máximo de cada franja del gimnasio, lo define el personal de deportes (GYMM-27). */
export function FranjasGimnasioPage() {
  const { data, isPending, isError, error, refetch } = useFranjasGimnasio()
  const [elegido, setElegido] = useState<number | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const dias = [...new Set(data?.map((f) => f.diaSemana))]
  const dia = elegido ?? dias[0]
  const delDia = data?.filter((f) => f.diaSemana === dia) ?? []

  return (
    <Pantalla titulo="Cupos del gimnasio" volverA="/reservas/gimnasio" estrecha>
      <p className="text-lg">
        Cuántas personas pueden reservar cada franja. Bajar el cupo no cancela las reservas que ya existen.
      </p>

      {isPending && (
        <p className="mt-4 text-grafito" role="status">
          Cargando las franjas…
        </p>
      )}
      {isError && (
        <div role="alert" className={`mt-4 ${AVISO}`}>
          <p className="font-medium text-alerta">{error.message}</p>
          <Boton variante="texto" className="mt-1" onClick={() => void refetch()}>
            Intentar de nuevo
          </Boton>
        </div>
      )}
      {data?.length === 0 && (
        <div className={`mt-4 ${VACIO}`}>
          <p>El gimnasio no tiene franjas.</p>
          <p className="mt-2 text-base text-grafito">Se cargan con el seed de la base de datos.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <div role="group" aria-label="Día de la semana" className="mt-5 flex flex-wrap gap-2">
            {dias.map((d) => (
              <Chip
                key={d}
                activo={d === dia}
                onClick={() => {
                  setElegido(d)
                  setEditando(null)
                  setAviso(null)
                }}
              >
                {NOMBRE_DIA[d]}
              </Chip>
            ))}
          </div>
          {aviso && (
            <p role="status" className={`mt-4 ${AVISO_EXITO}`}>
              {aviso}
            </p>
          )}
          <ul aria-label={`Franjas del ${NOMBRE_DIA[dia]?.toLowerCase()}`} className="mt-4 border-t border-linea">
            {delDia.map((f) => (
              <li key={f.id} className="border-b border-linea py-2">
                {editando === f.id ? (
                  <EditarCupo
                    franja={f}
                    onListo={(cupo) => {
                      setEditando(null)
                      setAviso(`Cupo del ${NOMBRE_DIA[f.diaSemana].toLowerCase()} de ${f.horaInicio} a ${f.horaFin}: ${cupo} personas.`)
                    }}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <div className="flex min-h-12 items-center gap-3">
                    <p className="flex-1 text-lg font-semibold tabular-nums">
                      {f.horaInicio}–{f.horaFin}
                      {!f.activa && <span className="ml-2 text-sm font-normal text-grafito">Deshabilitada</span>}
                    </p>
                    <p className="tabular-nums">{f.cupoMaximo} personas</p>
                    <Boton
                      variante="texto"
                      aria-label={`Cambiar el cupo de ${f.horaInicio} a ${f.horaFin}`}
                      onClick={() => {
                        setEditando(f.id)
                        setAviso(null)
                      }}
                    >
                      Cambiar
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Pantalla>
  )
}

function EditarCupo({
  franja,
  onListo,
  onCancelar,
}: {
  franja: FranjaGimnasio
  onListo: (cupo: number) => void
  onCancelar: () => void
}) {
  const [cupo, setCupo] = useState(franja.cupoMaximo)
  const cambiar = useCambiarCupo()

  return (
    <div className="flex flex-col gap-3 py-2">
      <Contador
        etiqueta={`Cupo de ${franja.horaInicio} a ${franja.horaFin}`}
        unidad="personas"
        valor={cupo}
        onCambiar={setCupo}
        paso={5}
        min={1}
        max={MAX_CUPO}
      />
      {cambiar.isError && (
        <p role="alert" className="font-medium text-alerta">
          {cambiar.error.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton
          disabled={cambiar.isPending || cupo === franja.cupoMaximo}
          onClick={() => cambiar.mutate({ id: franja.id, cupoMaximo: cupo }, { onSuccess: () => onListo(cupo) })}
        >
          {cambiar.isPending ? 'Guardando…' : 'Guardar cupo'}
        </Boton>
        <Boton variante="texto" disabled={cambiar.isPending} onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}
