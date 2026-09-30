import { Link } from 'react-router'

/**
 * Inicio de sesión (GYMM-10). Se implementará con Supabase Auth; por ahora solo
 * reserva la ruta y el lugar fuera del layout con navegación.
 */
export function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <img src="/logo.svg" alt="" width={72} height={72} className="mb-6 rounded-2xl" />
      <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight">GymTrack UNAL</h1>
      <p className="mt-2 text-lg text-gris">
        Entra con tu cuenta para ver tu rutina y registrar tus entrenamientos.
      </p>
      <p className="mt-8 rounded-2xl border-2 border-dashed border-linea bg-superficie p-5 text-gris">
        El inicio de sesión está en construcción (GYMM-10).
      </p>
      <Link to="/" className="mt-6 font-semibold text-campus underline underline-offset-4">
        Continuar sin iniciar sesión
      </Link>
    </div>
  )
}
