import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Avisa cuando hay una versión nueva de la app instalada. No recarga sola para no
 * interrumpir a quien está registrando una serie.
 */
export function AvisoActualizacion() {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW()

  if (!hayVersionNueva) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-tinta p-4 text-concreto shadow-lg"
    >
      <p className="flex-1 text-sm">Hay una versión nueva de GymTrack.</p>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="min-h-11 rounded-xl bg-concreto px-4 font-semibold text-tinta"
      >
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => setHayVersionNueva(false)}
        className="min-h-11 px-2 text-sm underline"
      >
        Después
      </button>
    </div>
  )
}
