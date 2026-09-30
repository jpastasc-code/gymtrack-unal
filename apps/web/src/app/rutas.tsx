import type { RouteObject } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { PerfilPage } from '../features/auth/PerfilPage'
import { RutaProtegida } from '../features/auth/RutaProtegida'
import { CanchaPage } from '../features/cancha/CanchaPage'
import { EntrenarPage } from '../features/entrenamiento/EntrenarPage'
import { DeportistaEvaluacionesPage } from '../features/evaluacion/DeportistaEvaluacionesPage'
import { EvaluarPage } from '../features/evaluacion/EvaluarPage'
import { FichaFisicaPage } from '../features/evaluacion/FichaFisicaPage'
import { NuevaEvaluacionPage } from '../features/evaluacion/NuevaEvaluacionPage'
import { ReservasPage } from '../features/gimnasio/ReservasPage'
import { InicioPage } from '../features/inicio/InicioPage'
import { NutricionPage } from '../features/nutricion/NutricionPage'
import { ProgresoPage } from '../features/progreso/ProgresoPage'
import { MiRutinaPage } from '../features/rutinas/MiRutinaPage'
import { CatalogoPage } from '../features/rutinas/ejercicios/CatalogoPage'
import { EditarEjercicioPage, NuevoEjercicioPage } from '../features/rutinas/ejercicios/EjercicioFormPage'
import { AppLayout } from './AppLayout'
import { ErrorRuta } from './ErrorRuta'

/**
 * Rutas de la app. Cada pantalla vive en src/features/<épica>/.
 * Se exportan como objetos para poder montarlas en pruebas con createMemoryRouter.
 */
export const rutas: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <ErrorRuta /> },
  {
    // Todo lo demás exige sesión iniciada (GYMM-10).
    element: (
      <RutaProtegida>
        <AppLayout />
      </RutaProtegida>
    ),
    errorElement: <ErrorRuta />,
    children: [
      { index: true, element: <InicioPage /> },
      { path: 'rutina', element: <MiRutinaPage /> },
      { path: 'entrenar', element: <EntrenarPage /> },
      { path: 'reservas', element: <ReservasPage /> },
      { path: 'reservas/cancha', element: <CanchaPage /> },
      { path: 'perfil', element: <PerfilPage /> },
      { path: 'ficha', element: <FichaFisicaPage /> },
      { path: 'nutricion', element: <NutricionPage /> },
      { path: 'progreso', element: <ProgresoPage /> },
      { path: 'ejercicios', element: <CatalogoPage /> },
      {
        // Pantallas de instructores: catálogo (GYMM-12) y evaluaciones (GYMM-13).
        element: <RutaProtegida roles={['INSTRUCTOR', 'ADMIN']} />,
        children: [
          { path: 'ejercicios/nuevo', element: <NuevoEjercicioPage /> },
          { path: 'ejercicios/:id/editar', element: <EditarEjercicioPage /> },
          // Evaluaciones físicas (GYMM-13).
          { path: 'evaluaciones', element: <EvaluarPage /> },
          { path: 'evaluaciones/:id', element: <DeportistaEvaluacionesPage /> },
          { path: 'evaluaciones/:id/nueva', element: <NuevaEvaluacionPage /> },
        ],
      },
    ],
  },
]
