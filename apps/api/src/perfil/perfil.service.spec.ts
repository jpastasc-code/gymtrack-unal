import { BadRequestException } from '@nestjs/common';
import type { Usuario } from '../generated/prisma/client';
import { aPerfil, calcularEdad, PerfilService } from './perfil.service';

const USUARIO = {
  id: 'u-1',
  documento: '1000000001',
  correo: 'deportista@gymtrack.test',
  nombres: 'Daniela',
  apellidos: 'Deportista Prueba',
  telefono: null,
  fechaNacimiento: new Date('2003-05-14T00:00:00Z'),
  sexo: 'FEMENINO',
  rol: 'DEPORTISTA',
  objetivo: 'GANAR_MASA_MUSCULAR',
  nivelActividad: 'MODERADO',
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
} as Usuario;

describe('calcularEdad', () => {
  const hoy = new Date('2026-09-29T12:00:00Z');
  it('cuenta los años cumplidos', () => {
    expect(calcularEdad(new Date('2003-05-14T00:00:00Z'), hoy)).toBe(23);
  });
  it('no suma el año si aún no llega el cumpleaños', () => {
    expect(calcularEdad(new Date('2003-10-01T00:00:00Z'), hoy)).toBe(22);
    expect(calcularEdad(new Date('2003-09-30T00:00:00Z'), hoy)).toBe(22);
    expect(calcularEdad(new Date('2003-09-29T00:00:00Z'), hoy)).toBe(23);
  });
});

describe('aPerfil', () => {
  it('expone la fecha como AAAA-MM-DD y no expone campos internos', () => {
    const perfil = aPerfil(USUARIO);
    expect(perfil.fechaNacimiento).toBe('2003-05-14');
    expect(perfil).not.toHaveProperty('activo');
    expect(perfil).not.toHaveProperty('creadoEn');
  });
});

describe('PerfilService.actualizar', () => {
  const update = jest.fn(({ data }: { data: Partial<Usuario> }) =>
    Promise.resolve({ ...USUARIO, ...data } as Usuario),
  );
  const servicio = new PerfilService({ usuario: { update } } as never);
  const hoy = new Date('2026-09-29T12:00:00Z');

  beforeEach(() => update.mockClear());

  it('guarda solo los campos enviados', async () => {
    const perfil = await servicio.actualizar(
      'u-1',
      { telefono: '+57 300 123 4567', objetivo: 'PERDER_GRASA' },
      hoy,
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: expect.objectContaining({
        telefono: '+57 300 123 4567',
        objetivo: 'PERDER_GRASA',
        nombres: undefined,
        fechaNacimiento: undefined,
      }),
    });
    expect(perfil.objetivo).toBe('PERDER_GRASA');
  });

  it('convierte la fecha de nacimiento y permite borrarla', async () => {
    await servicio.actualizar('u-1', { fechaNacimiento: '2001-11-02' }, hoy);
    expect(update.mock.calls[0][0].data.fechaNacimiento).toEqual(
      new Date('2001-11-02T00:00:00Z'),
    );
    await servicio.actualizar('u-1', { fechaNacimiento: null }, hoy);
    expect(update.mock.calls[1][0].data.fechaNacimiento).toBeNull();
  });

  it('rechaza fechas de nacimiento fuera de 12 a 100 años', async () => {
    await expect(
      servicio.actualizar('u-1', { fechaNacimiento: '2020-01-01' }, hoy),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.actualizar('u-1', { fechaNacimiento: '1900-01-01' }, hoy),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});
