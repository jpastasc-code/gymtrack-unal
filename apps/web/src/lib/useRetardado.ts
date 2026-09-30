import { useEffect, useState } from 'react'

/** Devuelve `valor` después de `ms` sin cambios (para no consultar en cada tecla). */
export function useRetardado<T>(valor: T, ms = 250): T {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetardado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retardado
}
