import { Link } from 'react-router'
import { IconoFlecha } from '../../components/iconos'
import { Pantalla } from '../../components/Pantalla'

/** Reservas: cupo en el gimnasio (GYMM-27) y cancha sintética (GYMM-28). */
export function ReservasPage() {
  return (
    <Pantalla titulo="Reservas" estrecha>
      <div className="border-t border-linea">
        <section className="border-b border-linea py-5">
          <h2 className="titular text-3xl">Gimnasio</h2>
          <p className="mt-1 text-grafito">
            Reserva tu cupo en una franja horaria y consulta cuánta gente hay entrenando ahora.
          </p>
          <p className="mt-3 text-sm text-grafito">Pantalla en construcción (GYMM-27 y GYMM-33).</p>
        </section>

        <Link
          to="/reservas/cancha"
          className="flex items-center gap-3 border-b border-linea py-5 hover:bg-hueso"
        >
          <div className="flex-1">
            <h2 className="titular text-3xl">Cancha sintética</h2>
            <p className="mt-1 text-grafito">Mira los horarios libres y aparta la cancha.</p>
          </div>
          <IconoFlecha className="shrink-0" />
        </Link>
      </div>
    </Pantalla>
  )
}
