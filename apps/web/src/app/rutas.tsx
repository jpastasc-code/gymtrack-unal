import type { RouteObject } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { PerfilPage } from '../features/auth/PerfilPage'
import { RutaProtegida } from '../features/auth/RutaProtegida'
import { CanchaPage } from '../features/cancha/CanchaPage'
import { FranjasCanchaPage } from '../features/cancha/FranjasCanchaPage'
import { EntrenarPage } from '../features/entrenamiento/EntrenarPage'
import { DeportistaEvaluacionesPage } from '../features/evaluacion/DeportistaEvaluacionesPage'
import { EvaluarPage } from '../features/evaluacion/EvaluarPage'
import { FichaFisicaPage } from '../features/evaluacion/FichaFisicaPage'
import { NuevaEvaluacionPage } from '../features/evaluacion/NuevaEvaluacionPage'
import { FranjasGimnasioPage } from '../features/gimnasio/FranjasGimnasioPage'
import { ReservaGimnasioPage } from '../features/gimnasio/ReservaGimnasioPage'
import { ReservasPage } from '../features/gimnasio/ReservasPage'
import { InicioPage } from '../features/inicio/InicioPage'
import { NutricionPage } from '../features/nutricion/NutricionPage'
import { PanelInicioPage } from '../features/panel/PanelInicioPage'
import { HistoricoEjercicioPage } from '../features/progreso/HistoricoEjercicioPage'
import { ProgresoPage } from '../features/progreso/ProgresoPage'
import { MiRutinaPage } from '../features/rutinas/MiRutinaPage'
import { AsignarRutinasPage } from '../features/rutinas/asignar/AsignarRutinasPage'
import { DeportistaRutinasPage } from '../features/rutinas/asignar/DeportistaRutinasPage'
import { NuevaRutinaPage } from '../features/rutinas/asignar/NuevaRutinaPage'
import { CatalogoPage } from '../features/rutinas/ejercicios/CatalogoPage'
import { EditarEjercicioPage, NuevoEjercicioPage } from '../features/rutinas/ejercicios/EjercicioFormPage'
import { AppLayout } from './AppLayout'
import { ErrorRuta } from './ErrorRuta'
import { PanelLayout } from './PanelLayout'
import { Redirigir } from './Redirigir'


/**
 * Pantallas del personal que se movieron al panel (GYMM-47). Las rutas viejas siguen funcionando
 * para no romper enlaces guardados: redirigen a su equivalente en /panel.
 */
const RUTAS_MOVIDAS: [vieja: string, nueva: string][] = [
  ['rutinas', '/panel/rutinas'],
  ['rutinas/:id', '/panel/rutinas/:id'],
  ['rutinas/:id/nueva', '/panel/rutinas/:id/nueva'],
  ['evaluaciones', '/panel/evaluaciones'],
  ['evaluaciones/:id', '/panel/evaluaciones/:id'],
  ['evaluaciones/:id/nueva', '/panel/evaluaciones/:id/nueva'],
  ['ejercicios/nuevo', '/panel/ejercicios/nuevo'],
  ['ejercicios/:id/editar', '/panel/ejercicios/:id/editar'],
  ['reservas/gimnasio/franjas', '/panel/gimnasio'],
  ['reservas/cancha/franjas', '/panel/cancha'],
]

/**
 * Rutas de la app. Cada pantalla vive en src/features/<épica>/.
 * Se exportan como objetos para poder montarlas en pruebas con createMemoryRouter.
 *
 * Hay dos modos (GYMM-47, DT-16): el del deportista, con AppLayout, y el panel del personal bajo
 * /panel, con PanelLayout. Cada sección del panel exige su permiso, nunca un rol.
 */
export const rutas: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <ErrorRuta /> },
  {
    // Todo lo demás exige sesión iniciada (GYMM-10).
    element: <RutaProtegida />,
    errorElement: <ErrorRuta />,
    children: [
      {
        // Modo deportista: lo que cualquier persona con sesión usa para entrenar.
        element: <AppLayout />,
        children: [
          { index: true, element: <InicioPage /> },
          { path: 'rutina', element: <MiRutinaPage /> },
          { path: 'entrenar', element: <EntrenarPage /> },
          { path: 'reservas', element: <ReservasPage /> },
          { path: 'reservas/gimnasio', element: <ReservaGimnasioPage /> },
          { path: 'reservas/cancha', element: <CanchaPage /> },
          { path: 'perfil', element: <PerfilPage /> },
          { path: 'ficha', element: <FichaFisicaPage /> },
          { path: 'nutricion', element: <NutricionPage /> },
          { path: 'progreso', element: <ProgresoPage /> },
          { path: 'progreso/ejercicios/:id', element: <HistoricoEjercicioPage /> },
          // Solo lectura: crear y editar están en /panel/ejercicios.
          { path: 'ejercicios', element: <CatalogoPage /> },
        ],
      },
      ...RUTAS_MOVIDAS.map(([vieja, nueva]) => ({ path: vieja, element: <Redirigir a={nueva} /> })),
      {
        // Panel del personal: solo para quien tiene al menos un permiso.
        path: 'panel',
        element: (
          <RutaProtegida personal>
            <PanelLayout />
          </RutaProtegida>
        ),
        children: [
          { index: true, element: <PanelInicioPage /> },
          { path: 'perfil', element: <PerfilPage /> },
          {
            // Armar y asignar rutinas (GYMM-21).
            element: <RutaProtegida permiso="GESTIONAR_RUTINAS" />,
            children: [
              { path: 'rutinas', element: <AsignarRutinasPage /> },
              { path: 'rutinas/:id', element: <DeportistaRutinasPage /> },
              { path: 'rutinas/:id/nueva', element: <NuevaRutinaPage /> },
            ],
          },
          {
            // Evaluaciones físicas (GYMM-13).
            element: <RutaProtegida permiso="REGISTRAR_EVALUACIONES" />,
            children: [
              { path: 'evaluaciones', element: <EvaluarPage /> },
              { path: 'evaluaciones/:id', element: <DeportistaEvaluacionesPage /> },
              { path: 'evaluaciones/:id/nueva', element: <NuevaEvaluacionPage /> },
            ],
          },
          {
            // Catálogo con crear y editar (GYMM-12).
            element: <RutaProtegida permiso="GESTIONAR_EJERCICIOS" />,
            children: [
              { path: 'ejercicios', element: <CatalogoPage gestion /> },
              { path: 'ejercicios/nuevo', element: <NuevoEjercicioPage /> },
              { path: 'ejercicios/:id/editar', element: <EditarEjercicioPage /> },
            ],
          },
          {
            // Cupos del gimnasio (GYMM-27).
            element: <RutaProtegida permiso="GESTIONAR_CUPOS_GIMNASIO" />,
            children: [{ path: 'gimnasio', element: <FranjasGimnasioPage /> }],
          },
          {
            // Horario de la cancha (GYMM-20).
            element: <RutaProtegida permiso="GESTIONAR_CANCHA" />,
            children: [{ path: 'cancha', element: <FranjasCanchaPage /> }],
          },
        ],
      },
    ],
  },
]
