import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion()
})

const llamadasPatch = (fetchMock: ReturnType<typeof simularApi>) =>
  fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/perfil') && init?.method === 'PATCH')

describe('perfil (GYMM-11)', () => {
  it('muestra los datos institucionales sin campos para editarlos', async () => {
    simularApi()
    renderApp('/perfil')
    const institucional = await screen.findByRole('region', { name: 'Datos institucionales' })
    expect(within(institucional).getByText('1000000001')).toBeInTheDocument()
    expect(within(institucional).getByText('deportista@gymtrack.test')).toBeInTheDocument()
    expect(within(institucional).queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Correo/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Documento/)).not.toBeInTheDocument()
  })

  it('carga los datos personales y de entrenamiento en el formulario', async () => {
    simularApi()
    renderApp('/perfil')
    expect(await screen.findByLabelText('Nombres')).toHaveValue('Daniela')
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue('2003-05-14')
    expect(screen.getByRole('radio', { name: 'Femenino' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Ganar masa muscular/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Moderado/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('guarda solo lo que cambió y confirma', async () => {
    const fetchMock = simularApi()
    renderApp('/perfil')
    await userEvent.type(await screen.findByLabelText('Teléfono'), '+57 300 123 4567')
    await userEvent.click(screen.getByRole('radio', { name: /Perder grasa/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    const [[, init]] = llamadasPatch(fetchMock)
    expect(JSON.parse(String(init?.body))).toEqual({ telefono: '+57 300 123 4567', objetivo: 'PERDER_GRASA' })
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('borrar el teléfono lo envía como null', async () => {
    const fetchMock = simularApi()
    renderApp('/perfil')
    const telefono = await screen.findByLabelText('Teléfono')
    await userEvent.type(telefono, '3001234567')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Cambios guardados.')
    await userEvent.clear(telefono)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(llamadasPatch(fetchMock)).toHaveLength(2))
    expect(JSON.parse(String(llamadasPatch(fetchMock)[1][1]?.body))).toEqual({ telefono: null })
  })

  it('muestra junto a cada campo los errores que devuelve el API', async () => {
    simularApi({
      respuestaPatchPerfil: () =>
        new Response(
          JSON.stringify({
            statusCode: 400,
            message: 'Escribe tus nombres.',
            errores: { nombres: 'Escribe tus nombres.' },
          }),
          { status: 400 },
        ),
    })
    renderApp('/perfil')
    await userEvent.clear(await screen.findByLabelText('Nombres'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Escribe tus nombres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombres')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Revisa los campos marcados.')).toBeInTheDocument()
  })
})
