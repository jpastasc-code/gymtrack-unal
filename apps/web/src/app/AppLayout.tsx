import { NavLink, Outlet } from 'react-router'
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
 * Layout móvil: contenido con scroll y barra de navegación fija abajo, al alcance del pulgar.
 * "Entrenar" es la acción principal y por eso es el único elemento en amarillo.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid h-[4.75rem] max-w-lg grid-cols-5 items-stretch">
          {PESTANAS.map(({ a, texto, Icono, ...resto }) => {
            const principal = 'principal' in resto && resto.principal
            return (
              <li key={a} className="flex">
                <NavLink
                  to={a}
                  end={a === '/'}
                  className={({ isActive }) =>
                    principal
                      ? 'group flex flex-1 flex-col items-center justify-center gap-1'
                      : `flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
                          isActive ? 'text-campus' : 'text-gris'
                        }`
                  }
                >
                  {({ isActive }) =>
                    principal ? (
                      <>
                        <span
                          className={`-mt-6 grid size-16 place-items-center rounded-full border-4 border-concreto bg-seguridad text-tinta shadow-md transition-transform group-active:scale-95 ${
                            isActive ? 'ring-2 ring-tinta' : ''
                          }`}
                        >
                          <Icono width={30} height={30} strokeWidth={2.4} />
                        </span>
                        <span className="text-xs font-semibold text-tinta">{texto}</span>
                      </>
                    ) : (
                      <>
                        <Icono strokeWidth={isActive ? 2.4 : 2} />
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

      <AvisoActualizacion />
    </div>
  )
}
