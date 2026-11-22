import { describe, expect, it } from 'vitest'
import { esPersonal, PERMISOS, permisosDe, tienePermiso, type Rol } from './permisos.js'

describe('permisos por rol', () => {
  it('el deportista no tiene ningún permiso', () => {
    expect(permisosDe('DEPORTISTA')).toEqual([])
    for (const permiso of PERMISOS) expect(tienePermiso('DEPORTISTA', permiso)).toBe(false)
  })

  it('el instructor tiene todos, también cupos y cancha', () => {
    expect([...permisosDe('INSTRUCTOR')].sort()).toEqual([...PERMISOS].sort())
    expect(tienePermiso('INSTRUCTOR', 'GESTIONAR_CUPOS_GIMNASIO')).toBe(true)
    expect(tienePermiso('INSTRUCTOR', 'GESTIONAR_CANCHA')).toBe(true)
  })

  it('el personal de deportes solo gestiona cupos y cancha', () => {
    expect([...permisosDe('PERSONAL_DEPORTES')].sort()).toEqual(['GESTIONAR_CANCHA', 'GESTIONAR_CUPOS_GIMNASIO'])
    expect(tienePermiso('PERSONAL_DEPORTES', 'GESTIONAR_RUTINAS')).toBe(false)
    expect(tienePermiso('PERSONAL_DEPORTES', 'REGISTRAR_EVALUACIONES')).toBe(false)
    expect(tienePermiso('PERSONAL_DEPORTES', 'GESTIONAR_EJERCICIOS')).toBe(false)
  })

  it('el administrador tiene todos', () => {
    for (const permiso of PERMISOS) expect(tienePermiso('ADMIN', permiso)).toBe(true)
  })

  it('es personal quien tiene al menos un permiso', () => {
    expect(esPersonal('DEPORTISTA')).toBe(false)
    expect(esPersonal('INSTRUCTOR')).toBe(true)
    expect(esPersonal('PERSONAL_DEPORTES')).toBe(true)
    expect(esPersonal('ADMIN')).toBe(true)
  })

  it('un rol desconocido no tiene permisos', () => {
    const desconocido = 'VISITANTE' as Rol
    expect(permisosDe(desconocido)).toEqual([])
    expect(esPersonal(desconocido)).toBe(false)
  })
})
