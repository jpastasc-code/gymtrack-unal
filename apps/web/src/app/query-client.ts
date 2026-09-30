import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../lib/api/client'

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // En el gimnasio la señal va y viene: reintentar errores de red, no errores 4xx.
        retry: (intentos, error) =>
          intentos < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  })
}
