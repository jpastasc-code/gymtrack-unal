import { BadRequestException, NotFoundException } from '@nestjs/common';
import { crearSesionesEnMemoria } from '../../test/sesiones-en-memoria';
import { HORAS_SESION_OLVIDADA, SesionesService } from './sesiones.service';

const HORA = 60 * 60 * 1000;

function montar(iniciales?: Parameters<typeof crearSesionesEnMemoria>[2]) {
  const db = crearSesionesEnMemoria(
    [{ id: 'd-1', rol: 'DEPORTISTA', activo: true }],
    [
      {
        id: 'r-1',
        usuarioId: 'd-1',
        vigente: true,
        // La sentadilla se repite: 3 series el día 1 y 5 el día 2.
        ejercicios: [
          { ejercicioId: 'sentadilla', series: 3 },
          { ejercicioId: 'sentadilla', series: 5 },
          { ejercicioId: 'press', series: 4 },
        ],
      },
    ],
    iniciales,
  );
  return { db, servicio: new SesionesService(db.prisma as never) };
}

const serie = (ejercicioId: string, numeroSerie: number) => ({
  ejercicioId,
  numeroSerie,
  cargaKg: 40,
  repeticiones: 10,
});

describe('SesionesService', () => {
  it('si dos "empezar" llegan a la vez, ambos reciben la misma sesión', async () => {
    const { db, servicio } = montar();
    // El segundo create choca con el índice único parcial (P2002).
    const [a, b] = await Promise.all([
      servicio.iniciar('d-1'),
      servicio.iniciar('d-1'),
    ]);
    expect(a.id).toBe(b.id);
    expect(db.sesiones()).toHaveLength(1);
  });

  it('un ejercicio repetido en la rutina acepta las series del día que más tiene', async () => {
    const { servicio } = montar();
    const { id } = await servicio.iniciar('d-1');

    await expect(
      servicio.registrarSerie('d-1', id, serie('sentadilla', 5)),
    ).resolves.toMatchObject({ numeroSerie: 5 });
    await expect(
      servicio.registrarSerie('d-1', id, serie('sentadilla', 6)),
    ).rejects.toThrow(
      new BadRequestException('Este ejercicio tiene 5 series en tu rutina.'),
    );
  });

  it('una sesión cuya rutina se borró ya no admite series', async () => {
    const { servicio } = montar({
      sesiones: [
        {
          id: 's-sin-rutina',
          usuarioId: 'd-1',
          rutinaId: null,
          inicio: new Date(),
          fin: null,
          notas: null,
        },
      ],
    });
    await expect(
      servicio.registrarSerie('d-1', 's-sin-rutina', serie('press', 1)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cierra una sesión olvidada sin series en la hora en que empezó', async () => {
    const inicio = new Date(Date.now() - (HORAS_SESION_OLVIDADA + 1) * HORA);
    const { db, servicio } = montar({
      sesiones: [
        {
          id: 's-vieja',
          usuarioId: 'd-1',
          rutinaId: 'r-1',
          inicio,
          fin: null,
          notas: null,
        },
      ],
    });

    await expect(servicio.actual('d-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.sesiones()[0].fin).toEqual(inicio);
  });

  it('una sesión de menos de seis horas sigue abierta', async () => {
    const inicio = new Date(Date.now() - (HORAS_SESION_OLVIDADA - 1) * HORA);
    const { servicio } = montar({
      sesiones: [
        {
          id: 's-larga',
          usuarioId: 'd-1',
          rutinaId: 'r-1',
          inicio,
          fin: null,
          notas: null,
        },
      ],
    });
    await expect(servicio.actual('d-1')).resolves.toMatchObject({
      id: 's-larga',
      fin: null,
    });
  });
});
