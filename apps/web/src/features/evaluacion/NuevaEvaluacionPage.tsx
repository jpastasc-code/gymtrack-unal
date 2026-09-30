import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Boton } from '../../components/Boton'
import { Campo } from '../../components/Campo'
import { AreaTexto, Selector } from '../../components/Controles'
import { Pantalla } from '../../components/Pantalla'
import { ApiError } from '../../lib/api/client'
import { OPCIONES_ACTIVIDAD, type NivelActividad } from '../auth/perfil'
import { useDeportista, useRegistrarEvaluacion, type Medida } from './api'
import {
  aNumero,
  calcularImc,
  mensajeRango,
  PERIMETROS,
  PLIEGUES,
  RANGOS_BASICOS,
  RANGOS_MEDIDA,
  TESTS_FISICOS,
  type MedidaPredefinida,
} from './rangos'

const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const clave = (m: MedidaPredefinida) => `${m.tipo}:${m.nombre}`
const TODAS = [...PERIMETROS, ...PLIEGUES, ...TESTS_FISICOS]

type Basicos = 'pesoKg' | 'tallaCm' | 'porcentajeGrasa'

/** Paso 2 de GYMM-13: registrar una evaluación nueva (nunca reemplaza las anteriores). */
export function NuevaEvaluacionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const deportista = useDeportista(id)
  const registrar = useRegistrarEvaluacion(id)

  const [fecha, setFecha] = useState(hoyLocal)
  const [basicos, setBasicos] = useState<Record<Basicos, string>>({ pesoKg: '', tallaCm: '', porcentajeGrasa: '' })
  const [actividad, setActividad] = useState<NivelActividad | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const [medidas, setMedidas] = useState<Record<string, string>>({})
  const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({})
  const aviso = useRef<HTMLParagraphElement>(null)
  const formulario = useRef<HTMLFormElement>(null)

  const peso = aNumero(basicos.pesoKg)
  const talla = aNumero(basicos.tallaCm)
  const enRango = (valor: number | null, r: { min: number; max: number }) =>
    valor !== null && !Number.isNaN(valor) && valor >= r.min && valor <= r.max
  // El IMC solo se muestra con peso y talla válidos: con datos fuera de rango sería engañoso.
  const imc =
    enRango(peso, RANGOS_BASICOS.pesoKg) && enRango(talla, RANGOS_BASICOS.tallaCm) ? calcularImc(peso!, talla!) : null

  // Errores del API: `pesoKg`, `fecha` o `medidas.<i>.valor`, que se traducen a la medida del formulario.
  const [enviadas, setEnviadas] = useState<MedidaPredefinida[]>([])
  const erroresApi = useMemo(() => {
    const error = registrar.error
    if (!error) return {}
    const delApi = error instanceof ApiError ? ((error.body as { errores?: Record<string, string> } | undefined)?.errores ?? {}) : {}
    const traducidos: Record<string, string> = {}
    for (const [campo, mensaje] of Object.entries(delApi)) {
      const indice = campo.match(/^medidas\.(\d+)\./)?.[1]
      const medida = indice === undefined ? undefined : enviadas[Number(indice)]
      traducidos[medida ? clave(medida) : campo] = mensaje
    }
    return Object.keys(traducidos).length ? traducidos : { general: error.message }
  }, [registrar.error, enviadas])
  const errores: Record<string, string> = { ...erroresApi, ...erroresLocales }
  const hayErrores = Object.keys(errores).length > 0

  // Tras un intento fallido, el foco va al primer campo con error (el celular se desplaza hasta él);
  // si el error no es de un campo, va al aviso general.
  useEffect(() => {
    if (!hayErrores) return
    const campo = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(campo ?? aviso.current)?.focus()
  }, [hayErrores, erroresApi, erroresLocales])

  function validar(): { errores: Record<string, string>; lista: Medida[]; usadas: MedidaPredefinida[] } {
    const e: Record<string, string> = {}
    if (!fecha) e.fecha = 'Indica la fecha de la evaluación.'
    else if (fecha > hoyLocal()) e.fecha = 'La fecha de la evaluación no puede ser futura.'

    for (const campo of ['pesoKg', 'tallaCm', 'porcentajeGrasa'] as const) {
      const r = RANGOS_BASICOS[campo]
      const valor = aNumero(basicos[campo])
      if (valor === null) {
        if (campo !== 'porcentajeGrasa') e[campo] = `Indica ${r.nombre.toLowerCase()}.`
      } else if (Number.isNaN(valor)) {
        e[campo] = `${r.nombre} debe ser un número con máximo 2 decimales.`
      } else if (valor < r.min || valor > r.max) {
        e[campo] = mensajeRango(r.nombre, r.min, r.max, r.unidad)
      }
    }

    const lista: Medida[] = []
    const usadas: MedidaPredefinida[] = []
    for (const m of TODAS) {
      const valor = aNumero(medidas[clave(m)] ?? '')
      if (valor === null) continue
      const rango = RANGOS_MEDIDA[m.tipo][m.unidad]
      if (Number.isNaN(valor)) e[clave(m)] = `${m.nombre} debe ser un número con máximo 2 decimales.`
      else if (valor < rango.min || valor > rango.max) e[clave(m)] = mensajeRango(m.nombre, rango.min, rango.max, m.unidad)
      else {
        lista.push({ tipo: m.tipo, nombre: m.nombre, valor, unidad: m.unidad })
        usadas.push(m)
      }
    }
    return { errores: e, lista, usadas }
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const resultado = validar()
    setErroresLocales(resultado.errores)
    if (Object.keys(resultado.errores).length > 0) return
    setEnviadas(resultado.usadas)
    registrar.mutate(
      {
        // Hoy: la hora exacta la pone el servidor. Otro día: a mediodía, hora local.
        fecha: fecha === hoyLocal() ? undefined : new Date(`${fecha}T12:00:00`).toISOString(),
        pesoKg: aNumero(basicos.pesoKg)!,
        tallaCm: aNumero(basicos.tallaCm)!,
        porcentajeGrasa: aNumero(basicos.porcentajeGrasa),
        nivelActividad: actividad || null,
        observaciones: observaciones.trim() || null,
        medidas: resultado.lista,
      },
      { onSuccess: () => void navigate(`/evaluaciones/${id}`, { state: { guardada: true } }) },
    )
  }

  const cambiarBasico = (campo: Basicos, valor: string) => setBasicos((b) => ({ ...b, [campo]: valor }))
  const numErrores = Object.keys(errores).filter((k) => k !== 'general').length

  return (
    <Pantalla titulo="Nueva evaluación" volverA={`/evaluaciones/${id}`}>
      {deportista.data && (
        <p className="-mt-3 mb-5 text-lg text-gris">
          {deportista.data.nombres} {deportista.data.apellidos}
        </p>
      )}

      <form ref={formulario} className="flex flex-col gap-8" onSubmit={guardar} noValidate>
        <section className="flex flex-col gap-5" aria-labelledby="titulo-basicos">
          <h2 id="titulo-basicos" className="font-display text-2xl font-semibold">
            Medidas básicas
          </h2>
          <Campo
            etiqueta="Fecha"
            type="date"
            max={hoyLocal()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={errores.fecha}
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Peso"
              inputMode="decimal"
              unidad="kg"
              placeholder="Ej.: 62,5"
              value={basicos.pesoKg}
              onChange={(e) => cambiarBasico('pesoKg', e.target.value)}
              error={errores.pesoKg}
            />
            <Campo
              etiqueta="Talla"
              inputMode="decimal"
              unidad="cm"
              placeholder="Ej.: 165"
              value={basicos.tallaCm}
              onChange={(e) => cambiarBasico('tallaCm', e.target.value)}
              error={errores.tallaCm}
            />
          </div>
          <Campo
            etiqueta="Porcentaje de grasa (opcional)"
            inputMode="decimal"
            unidad="%"
            placeholder="Ej.: 24,5"
            value={basicos.porcentajeGrasa}
            onChange={(e) => cambiarBasico('porcentajeGrasa', e.target.value)}
            ayuda="Con este dato, el cálculo nutricional usa la fórmula de Katch-McArdle."
            error={errores.porcentajeGrasa}
          />
          {imc !== null && (
            <p className="rounded-xl bg-superficie p-4" role="status">
              IMC: <strong className="font-display text-2xl">{imc.toLocaleString('es-CO')}</strong> kg/m²
            </p>
          )}
          <Selector
            etiqueta="Nivel de actividad (opcional)"
            value={actividad}
            onChange={(e) => setActividad(e.target.value as NivelActividad | '')}
            opciones={[
              { valor: '', nombre: 'Sin indicar' },
              ...OPCIONES_ACTIVIDAD.map((o) => ({ valor: o.valor, nombre: `${o.titulo}: ${o.detalle.toLowerCase()}` })),
            ]}
          />
        </section>

        <GrupoMedidas
          titulo="Perímetros"
          ayuda="Llena solo los que tomaste."
          medidas={PERIMETROS}
          valores={medidas}
          errores={errores}
          onChange={(k, v) => setMedidas((m) => ({ ...m, [k]: v }))}
        />

        <details className="group rounded-2xl bg-superficie p-5 open:pb-6">
          <summary className="flex min-h-11 cursor-pointer items-center font-display text-2xl font-semibold">
            Pliegues cutáneos (opcional)
          </summary>
          <div className="mt-4">
            <GrupoMedidas
              medidas={PLIEGUES}
              valores={medidas}
              errores={errores}
              onChange={(k, v) => setMedidas((m) => ({ ...m, [k]: v }))}
            />
          </div>
        </details>

        <GrupoMedidas
          titulo="Tests de condición física"
          ayuda="Registra el resultado de los tests que hizo."
          medidas={TESTS_FISICOS}
          valores={medidas}
          errores={errores}
          onChange={(k, v) => setMedidas((m) => ({ ...m, [k]: v }))}
          unaColumna
        />

        <AreaTexto
          etiqueta="Observaciones (opcional)"
          value={observaciones}
          maxLength={1000}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Lesiones, recomendaciones, cómo se sintió…"
        />

        <div className="flex flex-col gap-3">
          {(numErrores > 0 || errores.general) && (
            <p ref={aviso} tabIndex={-1} role="alert" className="rounded-xl bg-superficie p-4 font-medium text-alerta focus:outline-none">
              {errores.general ??
                (numErrores === 1 ? 'Revisa el campo marcado.' : `Revisa los ${numErrores} campos marcados.`)}
            </p>
          )}
          <p className="text-sm text-gris">
            Se guarda como una evaluación nueva: las anteriores no se modifican.
          </p>
          <Boton type="submit" bloque grande disabled={registrar.isPending}>
            {registrar.isPending ? 'Guardando…' : 'Guardar evaluación'}
          </Boton>
        </div>
      </form>
    </Pantalla>
  )
}

interface PropsGrupo {
  titulo?: string
  ayuda?: string
  medidas: MedidaPredefinida[]
  valores: Record<string, string>
  errores: Record<string, string>
  onChange: (clave: string, valor: string) => void
  unaColumna?: boolean
}

function GrupoMedidas({ titulo, ayuda, medidas, valores, errores, onChange, unaColumna }: PropsGrupo) {
  return (
    <section className="flex flex-col gap-3" aria-label={titulo}>
      {titulo && <h2 className="font-display text-2xl font-semibold">{titulo}</h2>}
      {ayuda && <p className="-mt-2 text-sm text-gris">{ayuda}</p>}
      <div className={unaColumna ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'}>
        {medidas.map((m) => (
          <Campo
            key={clave(m)}
            etiqueta={m.nombre}
            inputMode="decimal"
            unidad={m.unidad}
            value={valores[clave(m)] ?? ''}
            onChange={(e) => onChange(clave(m), e.target.value)}
            error={errores[clave(m)]}
          />
        ))}
      </div>
    </section>
  )
}
