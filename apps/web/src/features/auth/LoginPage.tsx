import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Boton } from '../../components/Boton'
import logoUnal from '../../assets/logo-unal.webp'
import { Campo } from '../../components/Campo'
import { AVISO } from '../../components/estilos'
import { useSesion } from './sesion'

/** Inicio de sesión con Supabase Auth (GYMM-10). */
export function LoginPage() {
  const { estado, iniciarSesion } = useSesion()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const desde = (location.state as { desde?: string } | null)?.desde
  if (estado === 'con-sesion') {
    return <Navigate to={desde && desde !== '/login' ? desde : '/'} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!correo.trim() || !contrasena) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setEnviando(true)
    setError(null)
    const mensaje = await iniciarSesion(correo, contrasena)
    setEnviando(false)
    if (mensaje) setError(mensaje)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-10 lg:justify-center lg:pt-16">
      <img src={logoUnal} alt="Universidad Nacional de Colombia" width={112} height={112} className="-ml-1.5 size-28" />
      <h1 className="titular mt-8 text-7xl">GymTrack UNAL</h1>
      <p className="mt-4 text-lg text-grafito">Entra con tu cuenta para ver tu rutina y registrar tus entrenamientos.</p>

      <form className="mt-10 flex flex-col gap-5" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo
          etiqueta="Correo institucional"
          type="email"
          name="correo"
          autoComplete="email"
          inputMode="email"
          placeholder="tu.nombre@unal.edu.co"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          name="contrasena"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        {error && (
          <p role="alert" className={`${AVISO} font-medium text-alerta`}>
            {error}
          </p>
        )}
        <Boton type="submit" bloque grande disabled={enviando} className="mt-2">
          {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </Boton>
      </form>

      <p className="mt-auto pt-10 text-sm text-grafito lg:mt-10">
        Tu sesión queda abierta en este celular hasta que la cierres desde Perfil.
      </p>
    </div>
  )
}
