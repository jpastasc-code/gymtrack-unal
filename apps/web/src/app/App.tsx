import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { SesionProvider } from '../features/auth/SesionProvider'
import { crearQueryClient } from './query-client'
import { rutas } from './rutas'

const router = createBrowserRouter(rutas)

export function App() {
  const [queryClient] = useState(crearQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>
  )
}
