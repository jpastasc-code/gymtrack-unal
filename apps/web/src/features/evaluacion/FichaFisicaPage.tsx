import { AVISO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useMiFicha } from './api'
import { TarjetaEvaluacion } from './TarjetaEvaluacion'

/** Ficha física propia: evaluación inicial y las posteriores, de la más reciente a la más antigua (GYMM-23). */
export function FichaFisicaPage() {
  const ficha = useMiFicha()

  return (
    <Pantalla titulo="Ficha física" volverA="/" estrecha>
      {ficha.isPending && (
        <p className="text-grafito" role="status">
          Cargando tu ficha…
        </p>
      )}
      {ficha.isError && (
        <div role="alert" className={AVISO}>
          <p className="font-medium text-alerta">{ficha.error.message}</p>
          <button type="button" onClick={() => void ficha.refetch()} className="mt-3 min-h-11 font-semibold underline underline-offset-4">
            Intentar de nuevo
          </button>
        </div>
      )}
      {ficha.data?.length === 0 && (
        <p className={VACIO}>
          Aún no tienes evaluaciones. Pide a un instructor del gimnasio tu primera evaluación: será tu punto de partida.
        </p>
      )}
      {ficha.data && ficha.data.length > 0 && (
        <ol aria-label="Mis evaluaciones" className="flex flex-col gap-10">
          {ficha.data.map((e, i) => (
            <li key={e.id}>
              <TarjetaEvaluacion evaluacion={e} inicial={i === ficha.data.length - 1} />
            </li>
          ))}
        </ol>
      )}
    </Pantalla>
  )
}
