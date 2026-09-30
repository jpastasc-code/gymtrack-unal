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
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-6">
      <header className="mb-6">
        <p className="text-gris first-letter:uppercase">{fecha}</p>
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight">
          {saludo(hoy)}
        </h1>
      </header>

      <Link
        to="/rutina"
        className="mb-6 flex items-center gap-4 rounded-3xl bg-campus p-6 text-concreto hover:bg-campus-oscuro"
      >
        <div className="flex-1">
          <h2 className="font-display text-3xl leading-tight font-semibold">Tu rutina de hoy</h2>
          <p className="mt-1 text-concreto/85">
            Revisa los ejercicios antes de empezar y luego pulsa Entrenar.
          </p>
        </div>
        <IconoFlecha width={28} height={28} />
      </Link>

      <nav aria-label="Más secciones">
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {secciones.map((s) => (
            <li key={s.a}>
              <Link to={s.a} className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-campus-claro">
                <div className="flex-1">
                  <p className="text-lg font-semibold">{s.titulo}</p>
                  <p className="text-sm text-gris">{s.detalle}</p>
                </div>
                <IconoFlecha className="text-campus" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <EstadoServidor />
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
      color = 'bg-campus'
    }
  }

  return (
    <p className="mt-8 flex items-center gap-2 text-sm text-gris" role="status">
      <span className={`size-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      {texto}
    </p>
  )
}
