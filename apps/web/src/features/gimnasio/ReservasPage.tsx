import { Link } from 'react-router'
import { IconoFlecha } from '../../components/iconos'
import { Pantalla } from '../../components/Pantalla'

/** Reservas: cupo en el gimnasio (GYMM-27) y cancha sintética (GYMM-28). */
export function ReservasPage() {
  return (
    <Pantalla titulo="Reservas">
      <div className="space-y-3">
        <section className="rounded-2xl bg-superficie p-5">
          <h2 className="font-display text-2xl font-semibold">Gimnasio</h2>
          <p className="mt-1 text-gris">
            Reserva tu cupo en una franja horaria y consulta cuánta gente hay entrenando ahora.
          </p>
          <p className="mt-3 text-sm text-gris">Pantalla en construcción (GYMM-27 y GYMM-33).</p>
        </section>

        <Link
          to="/reservas/cancha"
          className="flex items-center gap-3 rounded-2xl bg-superficie p-5 hover:bg-campus-claro"
        >
          <div className="flex-1">
            <h2 className="font-display text-2xl font-semibold">Cancha sintética</h2>
            <p className="mt-1 text-gris">Mira los horarios libres y aparta la cancha.</p>
          </div>
          <IconoFlecha className="text-campus" />
        </Link>
      </div>
    </Pantalla>
  )
}
