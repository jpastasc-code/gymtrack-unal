import { evolucionPorSesion, type PuntoEvolucion } from '@gymtrack/shared'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { VACIO } from '../../components/estilos'
import { GrupoOpciones } from '../../components/GrupoOpciones'
import { formatoFecha, type HistoricoEjercicio } from './api'

type Medida = 'carga' | 'volumen'

const MEDIDAS: Record<Medida, { titulo: string; detalle: string; valor: (p: PuntoEvolucion) => number }> = {
  carga: { titulo: 'Carga máxima', detalle: 'La serie más pesada', valor: (p) => p.cargaMaximaKg },
  volumen: { titulo: 'Volumen total', detalle: 'Series × repeticiones × kg', valor: (p) => p.volumenKg },
}

const fechaEje = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const kg = (valor: number) => `${valor.toLocaleString('es-CO')} kg`

/** Gráfica de la carga máxima o del volumen de un ejercicio, sesión por sesión (GYMM-34). */
export function EvolucionEjercicio({ sesiones }: { sesiones: HistoricoEjercicio['sesiones'] }) {
  const [medida, setMedida] = useState<Medida>('carga')
  const puntos = evolucionPorSesion(sesiones)
  if (puntos.length === 0) return null

  const titulo = (
    <h2 id="titulo-evolucion" className="titular mb-4 text-3xl">
      Tu evolución
    </h2>
  )

  if (puntos.every((p) => p.cargaMaximaKg === 0)) {
    return (
      <section aria-labelledby="titulo-evolucion" className="mt-10">
        {titulo}
        <p className={VACIO}>
          Haces este ejercicio sin carga, así que no hay kilos que graficar. Tu progreso está en las repeticiones de cada
          serie, aquí abajo.
        </p>
      </section>
    )
  }

  const { titulo: nombreMedida, valor } = MEDIDAS[medida]
  const datos = puntos.map((p) => ({ fecha: p.fecha, valor: valor(p) }))
  const primero = datos[0]
  const ultimo = datos.at(-1)!

  return (
    <section aria-labelledby="titulo-evolucion" className="mt-10">
      {titulo}
      <GrupoOpciones
        leyenda="Qué quieres ver"
        nombre="medida-evolucion"
        forma="fila"
        opciones={(Object.keys(MEDIDAS) as Medida[]).map((m) => ({
          valor: m,
          titulo: MEDIDAS[m].titulo,
          detalle: MEDIDAS[m].detalle,
        }))}
        valor={medida}
        onChange={setMedida}
      />

      <figure className="mt-6">
        <figcaption className="mb-3 text-grafito" aria-live="polite">
          {datos.length === 1
            ? `${nombreMedida}: ${kg(primero.valor)} el ${formatoFecha(primero.fecha)}. Con una sesión más verás la tendencia.`
            : `${nombreMedida}: de ${kg(primero.valor)} el ${formatoFecha(primero.fecha)} a ${kg(ultimo.valor)} el ${formatoFecha(ultimo.fecha)}.`}
        </figcaption>

        <p aria-hidden="true" className="mb-1 text-sm text-grafito">
          kg
        </p>
        <div aria-hidden="true" className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-linea)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={(iso: string) => fechaEje.format(new Date(iso))}
                stroke="var(--color-grafito)"
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(v: number) => v.toLocaleString('es-CO')}
                stroke="var(--color-grafito)"
                width={48}
                domain={['auto', 'auto']}
              />
              <Tooltip
                labelFormatter={(iso) => formatoFecha(String(iso))}
                formatter={(v) => [kg(Number(v)), nombreMedida]}
                separator=": "
                contentStyle={{ borderRadius: 12, borderColor: 'var(--color-linea)' }}
              />
              <Line
                type="linear"
                dataKey="valor"
                stroke="var(--color-negro)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-negro)' }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <table className="sr-only">
          <caption>{nombreMedida} por sesión</caption>
          <thead>
            <tr>
              <th scope="col">Sesión</th>
              <th scope="col">{nombreMedida}</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.fecha}>
                <td>{formatoFecha(d.fecha)}</td>
                <td>{kg(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  )
}
