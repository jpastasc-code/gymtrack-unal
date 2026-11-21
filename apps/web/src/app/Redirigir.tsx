import { generatePath, Navigate, useParams } from 'react-router'

/** Lleva una ruta vieja a su nueva dirección, conservando sus parámetros (`:id`). */
export function Redirigir({ a }: { a: string }) {
  const params = useParams()
  return <Navigate to={generatePath(a, params)} replace />
}
