import { OPCIONES_ACTIVIDAD } from '../auth/perfil'
import type { Evaluacion, Medida } from './api'

const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const numero = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 })

const TITULO_TIPO: Record<Medida['tipo'], string> = {
  PERIMETRO: 'Perímetros',
  PLIEGUE: 'Pliegues cutáneos',
  TEST_FISICO: 'Tests de condición física',
}

/** Una evaluación con sus datos básicos y medidas. La usan el instructor (GYMM-13) y la ficha propia (GYMM-23). */
export function TarjetaEvaluacion({ evaluacion: e, inicial }: { evaluacion: Evaluacion; inicial: boolean }) {
  const actividad = OPCIONES_ACTIVIDAD.find((o) => o.valor === e.nivelActividad)?.titulo
  const grupos = (['PERIMETRO', 'PLIEGUE', 'TEST_FISICO'] as const)
    .map((tipo) => ({ tipo, medidas: e.medidas.filter((m) => m.tipo === tipo) }))
    .filter((g) => g.medidas.length > 0)

  return (
    <article className="border-t-2 border-negro pt-5">
      <h2 className="titular text-3xl">
        {inicial ? 'Evaluación inicial' : 'Evaluación'}, {fechaLarga.format(new Date(e.fecha))}
      </h2>
      <p className="text-sm text-grafito">
        Con {e.instructor.nombres} {e.instructor.apellidos}
        {actividad ? `. Actividad: ${actividad.toLowerCase()}` : ''}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato nombre="Peso" valor={`${numero(e.pesoKg)} kg`} />
        <Dato nombre="Talla" valor={`${numero(e.tallaCm)} cm`} />
        <Dato nombre="Grasa" valor={e.porcentajeGrasa === null ? 'Sin dato' : `${numero(e.porcentajeGrasa)} %`} />
        <Dato nombre="IMC" valor={numero(e.imc)} />
      </dl>

      {grupos.map((g) => (
        <div key={g.tipo} className="mt-4">
          <h3 className="font-semibold">{TITULO_TIPO[g.tipo]}</h3>
          <dl>
            {g.medidas.map((m) => (
              <div key={m.nombre} className="flex justify-between border-b border-linea py-2">
                <dt className="text-grafito">{m.nombre}</dt>
                <dd className="font-semibold">
                  {numero(m.valor)} {m.unidad}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {e.observaciones && <p className="mt-4 text-grafito">{e.observaciones}</p>}
    </article>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="rounded-xl bg-hueso p-3">
      <dt className="text-sm text-grafito">{nombre}</dt>
      <dd className="titular mt-1 text-4xl normal-case">{valor}</dd>
    </div>
  )
}
