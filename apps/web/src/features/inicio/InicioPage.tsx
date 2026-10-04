import { Link } from 'react-router'
import { IconoFlecha } from '../../components/iconos'
import { useEstadoApi } from '../../lib/api/sistema'
import { useSesion } from '../auth/sesion'

const SECCIONES = [
  { a: '/ficha', titulo: 'Ficha física', detalle: 'Tus evaluaciones con el instructor' },
  { a: '/nutricion', titulo: 'Nutrición', detalle: 'Calorías y macronutrientes para tu objetivo' },
  { a: '/progreso', titulo: 'Progreso', detalle: 'Cómo han cambiado tus cargas y medidas' },
  { a: '/ejercicios', titulo: 'Catálogo de ejercicios', detalle: 'Cómo se hace cada ejercicio, por grupo muscular' },
]

/** Solo para instructores y administradores. */
const SECCIONES_INSTRUCTOR = [
  { a: '/evaluaciones', titulo: 'Evaluaciones', detalle: 'Registra las medidas y los tests de un deportista' },
]

function saludo(fecha: Date): string {
  const hora = fecha.getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function InicioPage() {
  const { perfil } = useSesion()
  const esInstructor = perfil?.rol === 'INSTRUCTOR' || perfil?.rol === 'ADMIN'
  const secciones = esInstructor ? [...SECCIONES_INSTRUCTOR, ...SECCIONES] : SECCIONES
  const hoy = new Date()
  const fecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(hoy)

  return (
    <div className="mx-auto w-full max-w-lg pb-6 lg:max-w-6xl lg:px-10 lg:pt-10">
      <header className="px-5 pt-6 pb-5 lg:px-0 lg:pb-8">
        <p className="text-grafito first-letter:uppercase">{fecha}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight lg:text-3xl">
          {saludo(hoy)}
          {perfil ? `, ${perfil.nombres.split(' ')[0]}` : ''}
        </h1>
      </header>

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
        <Link
          to="/rutina"
          className="flex flex-col gap-6 bg-negro px-5 pt-7 pb-6 text-blanco hover:bg-negro-suave lg:col-span-7 lg:min-h-96 lg:justify-between lg:p-9"
        >
          <h2 className="titular text-6xl lg:text-[7rem]">Tu rutina de hoy</h2>
          <span className="flex items-end gap-4 text-blanco/75">
            <span className="max-w-[30ch] flex-1">Revisa los ejercicios antes de empezar y luego pulsa Entrenar.</span>
            <IconoFlecha width={28} height={28} className="shrink-0 text-verde" />
          </span>
        </Link>

        <div className="lg:col-span-5">
          <nav aria-label="Más secciones">
            <ul className="divide-y divide-linea border-b border-linea lg:border-t">
              {secciones.map((s) => (
                <li key={s.a}>
                  <Link to={s.a} className="flex min-h-16 items-center gap-3 px-5 py-4 hover:bg-hueso lg:px-1">
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{s.titulo}</p>
                      <p className="text-sm text-grafito">{s.detalle}</p>
                    </div>
                    <IconoFlecha className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="px-5 lg:px-1">
            <EstadoServidor />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Indicador pequeño de conexión con el API (útil mientras el sistema está en desarrollo). */
function EstadoServidor() {
  const { data, isPending, isError } = useEstadoApi()

  let texto = 'Comprobando conexión con el servidor…'
  let color = 'bg-linea'
  if (!isPending) {
    if (isError || data?.status !== 'ok') {
      texto = 'Sin conexión con el servidor. Algunas funciones no estarán disponibles.'
      color = 'bg-alerta'
    } else {
      texto = 'Conectado al servidor'
      color = 'bg-verde'
    }
  }

  return (
    <p className="mt-6 flex items-center gap-2 text-sm text-grafito" role="status">
      <span className={`size-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      {texto}
    </p>
  )
}
