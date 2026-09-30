import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_INSTRUCTOR, renderApp, simularApi } from '../../../test/renderApp'
import { crearSupabaseFalso } from '../../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion()
})

const nombresEnLista = () =>
  within(screen.getByRole('list', { name: 'Ejercicios del catálogo' })).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)

describe('catálogo de ejercicios: deportista (GYMM-12)', () => {
  it('ve el catálogo activo, sin opciones de edición', async () => {
    simularApi()
    renderApp('/ejercicios')
    await screen.findByText('3 ejercicios')
    expect(nombresEnLista()).toEqual(['Jalón al pecho en polea', 'Remo con barra', 'Sentadilla con barra'])
    expect(screen.queryByRole('link', { name: 'Agregar ejercicio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Editar/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mostrar ejercicios desactivados')).not.toBeInTheDocument()
  })

  it('busca sin importar tildes y filtra por grupo muscular', async () => {
    simularApi()
    renderApp('/ejercicios')
    await screen.findByText('3 ejercicios')

    await userEvent.type(screen.getByLabelText('Buscar ejercicio'), 'jalon')
    await waitFor(() => expect(nombresEnLista()).toEqual(['Jalón al pecho en polea']))

    await userEvent.clear(screen.getByLabelText('Buscar ejercicio'))
    await userEvent.click(screen.getByRole('button', { name: 'Cuádriceps' }))
    expect(screen.getByRole('button', { name: 'Cuádriceps' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(nombresEnLista()).toEqual(['Sentadilla con barra']))
    expect(screen.getByText('1 ejercicio de cuádriceps')).toBeInTheDocument()
  })

  it('explica cuando nada coincide y permite quitar los filtros', async () => {
    simularApi()
    renderApp('/ejercicios')
    await screen.findByText('3 ejercicios')
    await userEvent.type(screen.getByLabelText('Buscar ejercicio'), 'natación')
    expect(await screen.findByText('Ningún ejercicio coincide con la búsqueda.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await screen.findByText('3 ejercicios')
  })

  it('no puede abrir el formulario de nuevo ejercicio', async () => {
    simularApi()
    renderApp('/ejercicios/nuevo')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
  })
})

describe('catálogo de ejercicios: instructor (GYMM-12)', () => {
  beforeEach(() => supabaseFalso.actual!.conSesion('instructor@gymtrack.test'))

  it('agrega un ejercicio y vuelve al catálogo', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/ejercicios')
    await userEvent.click(await screen.findByRole('link', { name: 'Agregar ejercicio' }))
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Hip thrust con barra')
    await userEvent.selectOptions(screen.getByLabelText('Grupo muscular'), 'GLUTEOS')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al catálogo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ejercicios'))
    expect(await screen.findByText('Hip thrust con barra')).toBeInTheDocument()
  })

  it('valida antes de enviar y muestra el nombre repetido que responde el API', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/ejercicios/nuevo')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar al catálogo' }))
    expect(screen.getByText('El nombre debe tener al menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Elige un grupo muscular.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Nombre'), 'Remo con barra')
    await userEvent.selectOptions(screen.getByLabelText('Grupo muscular'), 'ESPALDA')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al catálogo' }))
    expect(await screen.findByText('Ya existe un ejercicio llamado "Remo con barra".')).toBeInTheDocument()
  })

  it('edita un ejercicio desde el catálogo', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/ejercicios')
    await userEvent.click(await screen.findByRole('link', { name: 'Editar Remo con barra' }))
    const descripcion = await screen.findByLabelText('Descripción (opcional)')
    await userEvent.type(descripcion, 'Espalda recta.')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Espalda recta.')
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ nombre: 'Remo con barra', descripcion: 'Espalda recta.' })
  })

  it('desactiva un ejercicio y lo ve solo al mostrar los desactivados', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/ejercicios/e2/editar')
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar ejercicio' }))
    await screen.findByText('2 ejercicios')
    await userEvent.click(screen.getByLabelText('Mostrar ejercicios desactivados'))
    await screen.findByText('4 ejercicios')
    expect(screen.getAllByText('Desactivado')).toHaveLength(2)
  })

  it('pide confirmación para eliminar y explica si el ejercicio está en uso', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR, ejerciciosEnUso: ['e3'] })
    renderApp('/ejercicios/e3/editar')
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar ejercicio' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('¿Eliminar “Sentadilla con barra”?')
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(await screen.findByText(/Desactívalo para ocultarlo del catálogo/)).toBeInTheDocument()
  })

  it('elimina un ejercicio sin uso', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/ejercicios/e2/editar')
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar ejercicio' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ejercicios'))
    await screen.findByText('2 ejercicios')
    expect(screen.queryByText('Remo con barra')).not.toBeInTheDocument()
  })
})
