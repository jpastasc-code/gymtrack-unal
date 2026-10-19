import type { DatoFaltante } from '@gymtrack/shared'
import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { EnConstruccion } from '../../components/EnConstruccion'
import { AVISO, ENLACE_PRIMARIO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { OPCIONES_ACTIVIDAD, OPCIONES_OBJETIVO } from '../auth/perfil'
import { faltantesDe, useMiRequerimiento, type MiRequerimiento } from './api'

const kcal = (n: number) => n.toLocaleString('es-CO')
const decimal = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 3 })
const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

const NOMBRE_FORMULA = { KATCH_MCARDLE: 'Katch-McArdle', MIFFLIN_ST_JEOR: 'Mifflin-St Jeor' } as const

/** Requerimiento calórico diario según la evaluación y el perfil (GYMM-25, DT-07). */
export function NutricionPage() {
  const requerimiento = useMiRequerimiento()
  const faltantes = faltantesDe(requerimiento.error)

  return (
    <Pantalla titulo="Nutrición" volverA="/" estrecha>
      {requerimiento.isPending && (
        <p className="text-grafito" role="status">
          Calculando tu requerimiento…
        </p>
      )}

      {requerimiento.isError && faltantes && (
        <FaltanDatos mensaje={requerimiento.error.message} faltantes={faltantes} />
      )}

      {requerimiento.isError && !faltantes && (
        <div role="alert" className={AVISO}>
          <p className="font-medium text-alerta">{requerimiento.error.message}</p>
          <Boton variante="texto" className="mt-3 -ml-2" onClick={() => void requerimiento.refetch()}>
            Intentar de nuevo
          </Boton>
        </div>
      )}

      {requerimiento.data && <Resultado r={requerimiento.data} />}
    </Pantalla>
  )
}

function Resultado({ r }: { r: MiRequerimiento }) {
  const actividad = OPCIONES_ACTIVIDAD.find((o) => o.valor === r.datos.nivelActividad)?.titulo ?? ''
  const objetivo = OPCIONES_OBJETIVO.find((o) => o.valor === r.datos.objetivo)?.titulo ?? ''
  const ajuste = Math.round((r.ajusteObjetivo - 1) * 100)

  return (
    <>
      <section aria-labelledby="titulo-requerimiento" className="border-t-2 border-negro pt-5">
        <h2 id="titulo-requerimiento" className="font-semibold">
          Tu requerimiento diario
        </h2>
        <p className="mt-1">
          <span className="titular text-7xl normal-case">{kcal(r.calorias)}</span>{' '}
          <span className="text-lg font-semibold">kcal</span>
        </p>
        <p className="mt-1 text-grafito">Objetivo: {objetivo.toLowerCase()}. Actividad: {actividad.toLowerCase()}.</p>
      </section>

      {/* Criterio de aceptación de GYMM-25: el aviso va junto al resultado, no al final de la página. */}
      <p className={`${AVISO} mt-5`}>
        Es una estimación con fórmulas generales y <strong>no reemplaza la valoración de un profesional en nutrición</strong>.
      </p>

      <section aria-labelledby="titulo-calculo" className="mt-8">
        <h2 id="titulo-calculo" className="titular text-3xl">
          Cómo se calcula
        </h2>
        <dl className="mt-3 border-t border-linea">
          <Paso nombre="Metabolismo basal" detalle={`Fórmula de ${NOMBRE_FORMULA[r.formula]}`} valor={r.tmb} />
          <Paso nombre="Con tu actividad" detalle={`${actividad}: × ${decimal(r.factorActividad)}`} valor={r.gastoDiario} />
          <Paso
            nombre="Ajuste por tu objetivo"
            detalle={ajuste === 0 ? `${objetivo}: sin ajuste` : `${objetivo}: ${ajuste > 0 ? '+' : '−'}${Math.abs(ajuste)} %`}
            valor={r.calorias}
          />
        </dl>
        <p className="mt-4 text-sm text-grafito">
          Con tu evaluación del {fechaLarga.format(new Date(r.datos.fechaEvaluacion))}: {decimal(r.datos.pesoKg!)} kg
          {r.datos.porcentajeGrasa !== null ? ` y ${decimal(r.datos.porcentajeGrasa)} % de grasa.` : '.'}
          {r.formula === 'MIFFLIN_ST_JEOR' &&
            ' Como no tienes % de grasa registrado, se usan tu talla, edad y sexo. Si el instructor te lo mide, el cálculo será más preciso.'}
        </p>
        <Link to="/perfil" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Cambiar mi objetivo o actividad
        </Link>
      </section>

      <section className="mt-8">
        <EnConstruccion
          historia="GYMM-30"
          descripcion="Pronto verás cómo repartir estas calorías en proteínas, carbohidratos y grasas."
        />
      </section>
    </>
  )
}

function Paso({ nombre, detalle, valor }: { nombre: string; detalle: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linea py-3">
      <dt>
        <span className="font-semibold">{nombre}</span>
        <span className="block text-sm text-grafito">{detalle}</span>
      </dt>
      <dd className="shrink-0 text-lg font-semibold">{kcal(valor)} kcal</dd>
    </div>
  )
}

const DATOS_DE_EVALUACION: DatoFaltante[] = ['pesoKg', 'tallaCm']

function FaltanDatos({ mensaje, faltantes }: { mensaje: string; faltantes: DatoFaltante[] }) {
  const faltaEvaluacion = faltantes.some((f) => DATOS_DE_EVALUACION.includes(f))
  const faltaPerfil = faltantes.some((f) => !DATOS_DE_EVALUACION.includes(f))

  return (
    <section aria-labelledby="titulo-faltan" className={VACIO}>
      <h2 id="titulo-faltan" className="titular text-3xl">
        Faltan datos
      </h2>
      <p className="mt-2">{mensaje}</p>
      {faltaEvaluacion && (
        <p className="mt-3 text-grafito">
          El peso y la talla salen de tu evaluación física: pide a un instructor del gimnasio que te la haga.
        </p>
      )}
      {faltaPerfil && (
        <Link to="/perfil" className={`mt-5 ${ENLACE_PRIMARIO}`}>
          Completar mi perfil
        </Link>
      )}
    </section>
  )
}
