import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { crearCanchaEnMemoria } from '../../test/cancha-en-memoria';
import { CanchaService, type DisponibilidadSemana } from './cancha.service';

/** Miércoles 21 de octubre de 2026, 3:00 p. m. en Colombia. */
const AHORA = new Date('2026-10-21T20:00:00Z');

const DUENA = { id: 'u-duena', rol: 'DEPORTISTA' } as const;

function montar() {
  const db = crearCanchaEnMemoria({
    franjas: [
      { diaSemana: 1, inicio: '14:00', fin: '15:00' },
      { diaSemana: 3, inicio: '14:00', fin: '15:00' },
    ],
    reservas: [
      // Lunes 26, 2 a 3 p. m.: todavía no empieza.
      {
        inicio: '2026-10-26T19:00:00Z',
        fin: '2026-10-26T20:00:00Z',
        usuarioId: DUENA.id,
      },
      // Hoy de 2 a 3 p. m.: ya empezó.
      {
        inicio: '2026-10-21T19:00:00Z',
        fin: '2026-10-21T20:00:00Z',
        usuarioId: DUENA.id,
      },
    ],
  });
  const [futura, enCurso] = db.reservas();
  return {
    db,
    futura,
    enCurso,
    servicio: new CanchaService(db.prisma as never),
  };
}

const lunes = (d: DisponibilidadSemana) => d.dias[0].franjas[0];

describe('CanchaService.cancelarReserva (GYMM-29)', () => {
  it('la dueña cancela y la franja vuelve a estar disponible de inmediato', async () => {
    const { db, futura, servicio } = montar();
    await servicio.cancelarReserva(futura.id, DUENA, AHORA);

    expect(futura).toMatchObject({ estado: 'CANCELADA', canceladaEn: AHORA });
    const semana = await servicio.disponibilidad('2026-10-26', AHORA, 'u-luis');
    expect(lunes(semana).estado).toBe('DISPONIBLE');
    // Y otra persona ya la puede reservar.
    await servicio.reservar(
      'u-luis',
      { franjaId: db.idDe(1, '14:00'), fecha: '2026-10-26' },
      AHORA,
    );
    expect(db.reservas().filter((r) => r.estado === 'CONFIRMADA')).toHaveLength(
      2,
    );
  });

  it.each(['PERSONAL_DEPORTES', 'ADMIN'] as const)(
    '%s cancela la reserva de otra persona',
    async (rol) => {
      const { futura, servicio } = montar();
      await servicio.cancelarReserva(futura.id, { id: 'u-gestor', rol }, AHORA);
      expect(futura.estado).toBe('CANCELADA');
    },
  );

  it.each(['DEPORTISTA', 'INSTRUCTOR'] as const)(
    'un %s no puede cancelar una reserva ajena',
    async (rol) => {
      const { futura, servicio } = montar();
      await expect(
        servicio.cancelarReserva(futura.id, { id: 'u-intruso', rol }, AHORA),
      ).rejects.toThrow(ForbiddenException);
      expect(futura.estado).toBe('CONFIRMADA');
    },
  );

  it('no cancela una reserva que ya empezó', async () => {
    const { enCurso, servicio } = montar();
    await expect(
      servicio.cancelarReserva(enCurso.id, DUENA, AHORA),
    ).rejects.toThrow(ConflictException);
    expect(enCurso.estado).toBe('CONFIRMADA');
  });

  it('cancelar dos veces no es un error ni cambia la hora de cancelación', async () => {
    const { futura, servicio } = montar();
    await servicio.cancelarReserva(futura.id, DUENA, AHORA);
    const despues = new Date(AHORA.getTime() + 60_000);
    await expect(
      servicio.cancelarReserva(futura.id, DUENA, despues),
    ).resolves.toBeUndefined();
    expect(futura.canceladaEn).toEqual(AHORA);
  });

  it('responde 404 si la reserva no existe', async () => {
    const { servicio } = montar();
    await expect(
      servicio.cancelarReserva(
        '00000000-0000-4000-8000-000000000000',
        DUENA,
        AHORA,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('CanchaService.disponibilidad: reservas para el personal de deportes', () => {
  it('dice de quién es cada franja ocupada solo si se pide', async () => {
    const { futura, servicio } = montar();
    const gestor = await servicio.disponibilidad(
      '2026-10-26',
      AHORA,
      'u-gestor',
      true,
    );
    expect(lunes(gestor).reserva).toEqual({
      id: futura.id,
      nombre: 'Usuario Prueba',
    });
    const deportista = await servicio.disponibilidad(
      '2026-10-26',
      AHORA,
      'u-luis',
    );
    expect(lunes(deportista)).not.toHaveProperty('reserva');
  });

  it('no ofrece cancelar una franja que ya pasó', async () => {
    const { servicio } = montar();
    const semana = await servicio.disponibilidad(
      '2026-10-21',
      AHORA,
      'u-gestor',
      true,
    );
    const miercoles = semana.dias[2].franjas[0];
    expect(miercoles.estado).toBe('PASADA');
    expect(miercoles).not.toHaveProperty('reserva');
  });
});
