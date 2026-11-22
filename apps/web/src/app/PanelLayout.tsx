import { Link, NavLink, Outlet } from 'react-router'
import logoUnal from '../assets/logo-unal.webp'
import { AvisoActualizacion } from '../components/AvisoActualizacion'
import { IconoPanel, IconoPerfil } from '../components/iconos'
import { usePermisos } from '../features/auth/permisos'
import { EnlaceModoDeportista } from '../features/panel/CambioModo'
import { seccionesPara } from '../features/panel/secciones'

/** En el celular caben 5 pestañas: Panel, hasta 3 secciones y Perfil. Las demás se abren desde Panel. */
const SECCIONES_EN_CELULAR = 3

/** Clases literales para que Tailwind las genere: de 3 a 5 pestañas en el celular. */
const COLUMNAS = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' } as const

/**
 * Layout del panel del personal (GYMM-47), con la misma barra responsive que AppLayout:
 * abajo en el celular y la tableta, arriba con el logo desde 1024 px.
 * Las pestañas salen de los permisos del usuario, nunca de su rol.
 * No hay verde: aquí no se entrena. "Entrenar como deportista" lleva al otro modo.
 */
export function PanelLayout() {
  const { permisos } = usePermisos()
  const secciones = seccionesPara(permisos)
  const visiblesEnCelular = Math.min(secciones.length, SECCIONES_EN_CELULAR)

  const pestanas = [
    { a: '/panel', texto: 'Panel', Icono: IconoPanel, soloComputador: false },
    ...secciones.map((s, i) => ({ a: s.a, texto: s.titulo, Icono: s.Icono, soloComputador: i >= SECCIONES_EN_CELULAR })),
    { a: '/panel/perfil', texto: 'Perfil', Icono: IconoPerfil, soloComputador: false },
  ]
  const columnas = COLUMNAS[(visiblesEnCelular + 2) as keyof typeof COLUMNAS] ?? COLUMNAS[5]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-blanco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:top-0 lg:bottom-auto lg:border-t-0 lg:border-b lg:pb-0">
        <div className="mx-auto flex max-w-lg lg:h-18 lg:max-w-6xl lg:items-center lg:gap-10 lg:px-10">
          <Link to="/panel" className="hidden items-center gap-3 lg:flex" aria-label="GymTrack, ir al panel">
            <img src={logoUnal} alt="" width={44} height={44} className="size-11" />
            <span className="titular text-[1.65rem]">GymTrack</span>
          </Link>

          <nav aria-label="Navegación del panel" className="flex-1 lg:ml-auto lg:flex-none">
            <ul className={`grid h-[4.5rem] ${columnas} items-stretch lg:flex lg:h-18 lg:items-center lg:gap-8`}>
              {pestanas.map(({ a, texto, Icono, soloComputador }) => (
                <li key={a} className={soloComputador ? 'hidden lg:flex' : 'flex'}>
                  <NavLink
                    to={a}
                    end={a === '/panel'}
                    className={({ isActive }) =>
                      `flex flex-1 flex-col items-center justify-center gap-1 text-xs lg:self-stretch lg:text-base ${
                        isActive
                          ? 'font-semibold text-negro lg:shadow-[inset_0_-2px_0_var(--color-negro)]'
                          : 'font-medium text-grafito hover:text-negro'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icono strokeWidth={isActive ? 2.4 : 2} className="lg:hidden" />
                        <span>{texto}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <EnlaceModoDeportista className="whitespace-nowrap" />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      <AvisoActualizacion />
    </div>
  )
}
