import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  crearGimnasioEnMemoria,
  type ReservaFila,
} from '../../test/gimnasio-en-memoria';
import { GimnasioService } from './gimnasio.service';

/** Miércoles 11 de noviembre de 2026, 3:30 p. m. en Colombia. */
const AHORA = new Date('2026-11-11T20:30:00Z');
const HOY = '2026-11-11';
const JUEVES = '2026-11-12';

const MANANA_MIE = 'aaaaaaaa-0000-4000-8000-000000000001';
const TARDE_MIE = 'aaaaaaaa-0000-4000-8000-000000000002';
const JUEVES_7 = 'aaaaaaaa-0000-4000-8000-000000000003';

const reserva = (
  id: string,
  usuarioId: string,
  franjaId: string,
  fecha: string,
): ReservaFila => ({
  id,
  usuarioId,
  franjaId,
  fecha,
  estado: 'CONFIRMADA',
  canceladaEn: null,
});

function montar(reservas: ReservaFila[] = []) {
  const db = crearGimnasioEnMemoria(
    [],
    [
      {
        id: MANANA_MIE,
        diaSemana: 3,
        horaInicio: '06:00',
        horaFin: '07:00',
        cupoMaximo: 30,
        activa: true,
      },
      {
        id: TARDE_MIE,
        diaSemana: 3,
        horaInicio: '18:00',
        horaFin: '19:00',
        cupoMaximo: 2,
        activa: true,
      },
      {
        id: JUEVES_7,
        diaSemana: 4,
        horaInicio: '07:00',
        horaFin: '08:00',
        cupoMaximo: 1,
        activa: true,
      },
    ],
    reservas,
  );
  return { db, servicio: new GimnasioService(db.prisma as never) };
}

describe('GimnasioService', () => {
  describe('disponibilidad', () => {
    it('da hoy y los 6 días siguientes con los cupos libres y el estado de cada franja', async () => {
      const { servicio } = montar([
        reserva('r1', 'yo', TARDE_MIE, HOY),
        reserva('r2', 'otra', TARDE_MIE, HOY),
        reserva('r3', 'otra', JUEVES_7, JUEVES),
      ]);
      const { hoy, dias } = await servicio.disponibilidad('yo', AHORA);

      expect(hoy).toBe(HOY);
      expect(dias.map((d) => d.fecha)).toEqual([
        HOY,
        JUEVES,
        '2026-11-13',
        '2026-11-14',
        '2026-11-15',
        '2026-11-16',
        '2026-11-17',
      ]);
      expect(dias[0].franjas).toEqual([
        {
          id: MANANA_MIE,
          horaInicio: '06:00',
          horaFin: '07:00',
          cupoMaximo: 30,
          libres: 30,
          estado: 'PASADA',
        },
        {
          id: TARDE_MIE,
          horaInicio: '18:00',
          horaFin: '19:00',
          cupoMaximo: 2,
          libres: 0,
          estado: 'TUYA',
          reservaId: 'r1',
        },
      ]);
      expect(dias[1].franjas[0]).toMatchObject({ libres: 0, estado: 'LLENA' });
      // El martes 17 no tiene franjas habilitadas.
      expect(dias[6]).toEqual({
        fecha: '2026-11-17',
        diaSemana: 2,
        franjas: [],
      });
    });

    it('una franja con cupos libres está disponible', async () => {
      const { servicio } = montar([reserva('r1', 'otra', TARDE_MIE, HOY)]);
      const { dias } = await servicio.disponibilidad('yo', AHORA);
      expect(dias[0].franjas[1]).toMatchObject({
        libres: 1,
        estado: 'DISPONIBLE',
      });
    });
  });

  describe('reservar', () => {
    it('bloquea la franja antes de contar sus cupos', async () => {
      const { db, servicio } = montar();
      await expect(
        servicio.reservar('yo', { franjaId: JUEVES_7, fecha: JUEVES }, AHORA),
      ).resolves.toEqual({
        id: expect.any(String),
        fecha: JUEVES,
        diaSemana: 4,
        horaInicio: '07:00',
        horaFin: '08:00',
      });
      expect(db.bloqueos()).toEqual([JUEVES_7]);
    });

    it('no deja reservar una franja llena', async () => {
      const { servicio } = montar([reserva('r1', 'otra', JUEVES_7, JUEVES)]);
      await expect(
        servicio.reservar('yo', { franjaId: JUEVES_7, fecha: JUEVES }, AHORA),
      ).rejects.toThrow(
        new ConflictException('Esa franja se llenó. Elige otra hora.'),
      );
    });

    it('un cupo cancelado vuelve a estar libre', async () => {
      const { servicio } = montar([
        { ...reserva('r1', 'otra', JUEVES_7, JUEVES), estado: 'CANCELADA' },
      ]);
      await expect(
        servicio.reservar('yo', { franjaId: JUEVES_7, fecha: JUEVES }, AHORA),
      ).resolves.toMatchObject({ fecha: JUEVES });
    });

    it('no deja reservar dos veces la misma franja', async () => {
      const { servicio } = montar([reserva('r1', 'yo', TARDE_MIE, HOY)]);
      await expect(
        servicio.reservar('yo', { franjaId: TARDE_MIE, fecha: HOY }, AHORA),
      ).rejects.toThrow(
        new ConflictException('Ya tienes un cupo reservado en esa franja.'),
      );
    });

    it('deja reservar una franja que ya empezó, pero no una que ya terminó', async () => {
      const { servicio } = montar();
      const enCurso = new Date('2026-11-11T23:20:00Z'); // 6:20 p. m.
      await expect(
        servicio.reservar('yo', { franjaId: TARDE_MIE, fecha: HOY }, enCurso),
      ).resolves.toMatchObject({ horaInicio: '18:00' });
      await expect(
        servicio.reservar('yo', { franjaId: MANANA_MIE, fecha: HOY }, AHORA),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza fechas fuera de plazo, inexistentes o de otro día de la semana', async () => {
      const { servicio } = montar();
      const errores = async (fecha: string, franjaId = JUEVES_7) => {
        const error = await servicio
          .reservar('yo', { franjaId, fecha }, AHORA)
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        return (error as BadRequestException).message;
      };
      expect(await errores('2026-11-19')).toBe(
        'Puedes reservar desde hoy hasta 6 días adelante.',
      );
      expect(await errores('2026-11-10')).toBe(
        'Puedes reservar desde hoy hasta 6 días adelante.',
      );
      expect(await errores('2026-11-31')).toBe(
        'La fecha debe tener el formato AAAA-MM-DD.',
      );
      expect(await errores('2026-11-13')).toBe(
        'Esa franja no es de ese día de la semana.',
      );
    });
  });

  describe('cancelar', () => {
    it('libera el cupo; otra persona no puede cancelarla, el personal de deportes sí', async () => {
      const { db, servicio } = montar([
        reserva('r1', 'yo', JUEVES_7, JUEVES),
        reserva('r2', 'otra', TARDE_MIE, HOY),
      ]);
      await expect(
        servicio.cancelar('r1', { id: 'otra', rol: 'DEPORTISTA' }, AHORA),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await servicio.cancelar('r1', { id: 'yo', rol: 'DEPORTISTA' }, AHORA);
      await servicio.cancelar('r1', { id: 'yo', rol: 'DEPORTISTA' }, AHORA);
      await servicio.cancelar(
        'r2',
        { id: 'p', rol: 'PERSONAL_DEPORTES' },
        AHORA,
      );
      expect(db.reservas().map((r) => [r.id, r.estado])).toEqual([
        ['r1', 'CANCELADA'],
        ['r2', 'CANCELADA'],
      ]);
    });

    it('no deja cancelar cuando la franja ya empezó', async () => {
      const { servicio } = montar([reserva('r1', 'yo', TARDE_MIE, HOY)]);
      const enCurso = new Date('2026-11-11T23:20:00Z');
      await expect(
        servicio.cancelar('r1', { id: 'yo', rol: 'DEPORTISTA' }, enCurso),
      ).rejects.toThrow(
        new ConflictException(
          'Esa franja ya empezó, así que la reserva no se puede cancelar.',
        ),
      );
    });
  });

  it('mis reservas: solo las que no han terminado, de la más próxima a la más lejana', async () => {
    const { servicio } = montar([
      reserva('r1', 'yo', JUEVES_7, JUEVES),
      reserva('r2', 'yo', MANANA_MIE, HOY),
      reserva('r3', 'yo', TARDE_MIE, HOY),
      reserva('r4', 'otra', TARDE_MIE, HOY),
    ]);
    const mias = await servicio.misReservas('yo', AHORA);
    expect(mias.map((r) => r.id)).toEqual(['r3', 'r1']);
  });
});
