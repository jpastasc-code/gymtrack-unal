import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { crearCanchaEnMemoria } from '../../test/cancha-en-memoria';
import { CanchaService, type DisponibilidadSemana } from './cancha.service';

/** Miércoles 21 de octubre de 2026, 3:00 p. m. en Colombia. */
const AHORA = new Date('2026-10-21T20:00:00Z');

const FRANJAS = [
  { diaSemana: 1, inicio: '14:00', fin: '15:00' },
  { diaSemana: 1, inicio: '15:00', fin: '16:00' },
  { diaSemana: 2, inicio: '14:00', fin: '15:00', activa: false },
  { diaSemana: 3, inicio: '14:00', fin: '15:00' },
  { diaSemana: 3, inicio: '16:00', fin: '17:00' },
  { diaSemana: 6, inicio: '08:00', fin: '09:00' },
];

function montar(opciones: Parameters<typeof crearCanchaEnMemoria>[0] = {}) {
  const db = crearCanchaEnMemoria({ franjas: FRANJAS, ...opciones });
  return { db, servicio: new CanchaService(db.prisma as never) };
}

/** { "2026-10-26": ["14:00 RESERVADA", …], … } para comparar de un vistazo. */
const resumen = (d: DisponibilidadSemana) =>
  Object.fromEntries(
    d.dias.map((dia) => [
      dia.fecha,
      dia.franjas.map((f) => `${f.horaInicio} ${f.estado}`),
    ]),
  );

describe('CanchaService.disponibilidad', () => {
  it('arma la semana de lunes a domingo con las franjas habilitadas', async () => {
    const { servicio } = montar();
    const semana = await servicio.disponibilidad('2026-10-28', AHORA);
    expect(semana.semana).toEqual({ desde: '2026-10-26', hasta: '2026-11-01' });
    expect(semana.hoy).toBe('2026-10-21');
    expect(semana.cancha.nombre).toBe('Cancha sintética');
    expect(semana.dias.map((d) => d.diaSemana)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(resumen(semana)).toEqual({
      '2026-10-26': ['14:00 DISPONIBLE', '15:00 DISPONIBLE'],
      // La franja del martes está deshabilitada: no aparece.
      '2026-10-27': [],
      '2026-10-28': ['14:00 DISPONIBLE', '16:00 DISPONIBLE'],
      '2026-10-29': [],
      '2026-10-30': [],
      '2026-10-31': ['08:00 DISPONIBLE'],
      '2026-11-01': [],
    });
  });

  it('marca como reservada una franja con una reserva confirmada que se cruza', async () => {
    const { servicio } = montar({
      reservas: [
        // Lunes 26, 2 a 3 p. m. en Colombia.
        { inicio: '2026-10-26T19:00:00Z', fin: '2026-10-26T20:00:00Z' },
        // Lunes 26, 3 a 4 p. m., pero cancelada: no cuenta.
        {
          inicio: '2026-10-26T20:00:00Z',
          fin: '2026-10-26T21:00:00Z',
          estado: 'CANCELADA',
        },
        // Miércoles 28, de 4:30 a 5:00 p. m.: ocupa parte de la franja de 4 a 5.
        { inicio: '2026-10-28T21:30:00Z', fin: '2026-10-28T22:00:00Z' },
        // Miércoles 28, termina justo cuando empieza la franja de 4: no la ocupa.
        { inicio: '2026-10-28T20:00:00Z', fin: '2026-10-28T21:00:00Z' },
      ],
    });
    const semana = await servicio.disponibilidad('2026-10-26', AHORA);
    expect(resumen(semana)['2026-10-26']).toEqual([
      '14:00 RESERVADA',
      '15:00 DISPONIBLE',
    ]);
    expect(resumen(semana)['2026-10-28']).toEqual([
      '14:00 DISPONIBLE',
      '16:00 RESERVADA',
    ]);
  });

  it('por defecto muestra la semana actual y marca lo que ya empezó', async () => {
    const { servicio } = montar();
    const semana = await servicio.disponibilidad(undefined, AHORA);
    expect(semana.semana.desde).toBe('2026-10-19');
    expect(resumen(semana)['2026-10-19']).toEqual([
      '14:00 PASADA',
      '15:00 PASADA',
    ]);
    // Son las 3 p. m. del miércoles: la de 2 ya pasó, la de 4 todavía no.
    expect(resumen(semana)['2026-10-21']).toEqual([
      '14:00 PASADA',
      '16:00 DISPONIBLE',
    ]);
    expect(resumen(semana)['2026-10-24']).toEqual(['08:00 DISPONIBLE']);
  });

  it('usa la fecha de Colombia: el domingo a las 10 p. m. sigue siendo esa semana', async () => {
    const { servicio } = montar();
    // En UTC ya es lunes 26; en Colombia es domingo 25 a las 10 p. m.
    const semana = await servicio.disponibilidad(
      undefined,
      new Date('2026-10-26T03:00:00Z'),
    );
    expect(semana.hoy).toBe('2026-10-25');
    expect(semana.semana.desde).toBe('2026-10-19');
  });

  it('responde 404 si no hay una cancha habilitada', async () => {
    const { servicio } = montar({ canchaActiva: false });
    await expect(servicio.disponibilidad(undefined, AHORA)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('CanchaService: franjas (personal de deportes)', () => {
  it('lista todas las franjas, también las deshabilitadas, por día y hora', async () => {
    const { servicio } = montar();
    const { franjas } = await servicio.listarFranjas();
    expect(
      franjas.map(
        (f) => `${f.diaSemana} ${f.horaInicio}-${f.horaFin} ${f.activa}`,
      ),
    ).toEqual([
      '1 14:00-15:00 true',
      '1 15:00-16:00 true',
      '2 14:00-15:00 false',
      '3 14:00-15:00 true',
      '3 16:00-17:00 true',
      '6 08:00-09:00 true',
    ]);
  });

  it('crea una franja pegada a otra sin cruzarse', async () => {
    const { servicio, db } = montar();
    const nueva = await servicio.crearFranja({
      diaSemana: 3,
      horaInicio: '15:00',
      horaFin: '16:00',
    });
    expect(nueva).toMatchObject({
      diaSemana: 3,
      horaInicio: '15:00',
      horaFin: '16:00',
      activa: true,
    });
    expect(db.franjas()).toHaveLength(FRANJAS.length + 1);
  });

  it('rechaza una franja que termina antes de empezar', async () => {
    const { servicio } = montar();
    await expect(
      servicio.crearFranja({
        diaSemana: 4,
        horaInicio: '15:00',
        horaFin: '15:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una franja que se cruza con otra, y dice con cuál', async () => {
    const { servicio } = montar();
    await expect(
      servicio.crearFranja({
        diaSemana: 1,
        horaInicio: '14:30',
        horaFin: '15:30',
      }),
    ).rejects.toThrow('Se cruza con la franja del lunes de 14:00 a 15:00.');
  });

  it('también avisa si se cruza con una deshabilitada', async () => {
    const { servicio } = montar();
    await expect(
      servicio.crearFranja({
        diaSemana: 2,
        horaInicio: '14:00',
        horaFin: '15:00',
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      servicio.crearFranja({
        diaSemana: 2,
        horaInicio: '14:00',
        horaFin: '15:00',
      }),
    ).rejects.toThrow('(deshabilitada)');
  });

  it('deshabilita, habilita y elimina una franja', async () => {
    const { servicio, db } = montar();
    const id = db.idDe(1, '14:00');
    expect(
      (await servicio.actualizarFranja(id, { activa: false })).activa,
    ).toBe(false);
    const semana = await servicio.disponibilidad('2026-10-26', AHORA);
    expect(resumen(semana)['2026-10-26']).toEqual(['15:00 DISPONIBLE']);

    await servicio.eliminarFranja(id);
    expect(db.franjas().some((f) => f.id === id)).toBe(false);
  });

  it('responde 404 al editar o eliminar una franja que no existe', async () => {
    const { servicio } = montar();
    const id = '00000000-0000-4000-8000-000000000000';
    await expect(
      servicio.actualizarFranja(id, { activa: false }),
    ).rejects.toThrow(NotFoundException);
    await expect(servicio.eliminarFranja(id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
