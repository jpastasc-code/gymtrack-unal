import { Link, NavLink, Outlet } from 'react-router'
import logoUnal from '../assets/logo-unal.webp'
import { AvisoActualizacion } from '../components/AvisoActualizacion'
import {
  IconoCalendario,
  IconoInicio,
  IconoPerfil,
  IconoPesa,
  IconoRutina,
} from '../components/iconos'

const PESTANAS = [
  { a: '/', texto: 'Inicio', Icono: IconoInicio },
  { a: '/rutina', texto: 'Rutina', Icono: IconoRutina },
  { a: '/entrenar', texto: 'Entrenar', Icono: IconoPesa, principal: true },
  { a: '/reservas', texto: 'Reservas', Icono: IconoCalendario },
  { a: '/perfil', texto: 'Perfil', Icono: IconoPerfil },
] as const

/**
 * Layout responsive con una sola barra de navegación:
 * - En el celular y la tableta (menos de 1024 px) va fija abajo, al alcance del pulgar.
 * - Desde 1024 px sube a una barra superior con el logo de la universidad.
 * "Entrenar" es la acción principal y por eso es el único elemento en verde.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-blanco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:top-0 lg:bottom-auto lg:border-t-0 lg:border-b lg:pb-0">
        <div className="mx-auto flex max-w-lg lg:h-18 lg:max-w-6xl lg:items-center lg:gap-10 lg:px-10">
          <Link to="/" className="hidden items-center gap-3 lg:flex" aria-label="GymTrack, ir al inicio">
            <img src={logoUnal} alt="" width={44} height={44} className="size-11" />
            <span className="titular text-[1.65rem]">GymTrack</span>
          </Link>

          <nav aria-label="Navegación principal" className="flex-1 lg:ml-auto lg:flex-none">
            <ul className="grid h-[4.5rem] grid-cols-5 items-stretch lg:flex lg:h-18 lg:items-center lg:gap-8">
              {PESTANAS.map(({ a, texto, Icono, ...resto }) => {
                const principal = 'principal' in resto && resto.principal
                return (
                  <li key={a} className="flex">
                    <NavLink
                      to={a}
                      end={a === '/'}
                      className={({ isActive }) =>
                        principal
                          ? 'group flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold text-negro lg:flex-row lg:gap-2 lg:rounded-full lg:bg-verde lg:px-5 lg:py-2.5 lg:text-base lg:hover:brightness-95'
                          : `flex flex-1 flex-col items-center justify-center gap-1 text-xs lg:self-stretch lg:text-base ${
                              isActive
                                ? 'font-semibold text-negro lg:shadow-[inset_0_-2px_0_var(--color-negro)]'
                                : 'font-medium text-grafito hover:text-negro'
                            }`
                      }
                    >
                      {({ isActive }) =>
                        principal ? (
                          <>
                            <span
                              className={`grid h-9 w-14 place-items-center rounded-xl bg-verde transition-transform group-active:scale-95 lg:contents ${
                                isActive ? 'ring-2 ring-negro ring-offset-2 lg:ring-0' : ''
                              }`}
                            >
                              <Icono strokeWidth={2.4} />
                            </span>
                            <span>{texto}</span>
                          </>
                        ) : (
                          <>
                            <Icono strokeWidth={isActive ? 2.4 : 2} className="lg:hidden" />
                            <span>{texto}</span>
                          </>
                        )
                      }
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      <AvisoActualizacion />
    </div>
  )
}
