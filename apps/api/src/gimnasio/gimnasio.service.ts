import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FranjaGimnasio, Rol } from '../generated/prisma/client';
import {
  diaSemanaIso,
  esFechaValida,
  fechaEnColombia,
  horaDeTime,
  instanteEnColombia,
  sumarDias,
} from '../cancha/cancha.horario';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ActualizarFranjaGimnasioDto,
  CrearReservaGimnasioDto,
} from './gimnasio.dto';

/** TUYA: tienes un cupo reservado; LLENA: no quedan cupos; PASADA: ya terminó. */
export type EstadoFranjaGimnasio = 'DISPONIBLE' | 'LLENA' | 'TUYA' | 'PASADA';

/** Días que se pueden reservar, contando hoy (DT-15). */
export const DIAS_PARA_RESERVAR = 7;

/** Quienes configuran el cupo de las franjas y cancelan reservas ajenas. */
export const GESTORES_GIMNASIO: readonly Rol[] = ['PERSONAL_DEPORTES', 'ADMIN'];

export interface FranjaConCupo {
  id: string;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  libres: number;
  estado: EstadoFranjaGimnasio;
  /** Solo si es TUYA: la reserva, para poder cancelarla. */
  reservaId?: string;
}

export interface DiaGimnasio {
  /** AAAA-MM-DD en hora de Colombia. */
  fecha: string;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  franjas: FranjaConCupo[];
}

export interface DisponibilidadGimnasio {
  hoy: string;
  /** Hoy y los días siguientes que se pueden reservar. */
  dias: DiaGimnasio[];
}

export interface ReservaGimnasioVista {
  id: string;
  fecha: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface FranjaGimnasioVista {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  activa: boolean;
}

/** Columna `date` de Prisma ↔ texto AAAA-MM-DD. */
const aDate = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);
const deDate = (fecha: Date) => fecha.toISOString().slice(0, 10);

const aFranja = (f: FranjaGimnasio): FranjaGimnasioVista => ({
  id: f.id,
  diaSemana: f.diaSemana,
  horaInicio: horaDeTime(f.horaInicio),
  horaFin: horaDeTime(f.horaFin),
  cupoMaximo: f.cupoMaximo,
  activa: f.activa,
});

const aReserva = (r: {
  id: string;
  fecha: Date;
  franja: FranjaGimnasio;
}): ReservaGimnasioVista => {
  const fecha = deDate(r.fecha);
  return {
    id: r.id,
    fecha,
    diaSemana: diaSemanaIso(fecha),
    horaInicio: horaDeTime(r.franja.horaInicio),
    horaFin: horaDeTime(r.franja.horaFin),
  };
};

const esErrorPrisma = (error: unknown, codigo: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === codigo;

const errorDeFecha = (mensaje: string) =>
  new BadRequestException({
    statusCode: 400,
    message: mensaje,
    errores: { fecha: mensaje },
  });

/** Cupos del gimnasio por franja horaria (GYMM-27). */
@Injectable()
export class GimnasioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hoy y los próximos días, cada uno con sus franjas habilitadas, los cupos
   * libres y el estado para quien consulta.
   */
  async disponibilidad(
    usuarioId: string,
    ahora = new Date(),
  ): Promise<DisponibilidadGimnasio> {
    const hoy = fechaEnColombia(ahora);
    const fechas = Array.from({ length: DIAS_PARA_RESERVAR }, (_, i) =>
      sumarDias(hoy, i),
    );

    const [franjas, reservas] = await Promise.all([
      this.prisma.franjaGimnasio.findMany({
        where: { activa: true },
        orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      }),
      this.prisma.reservaGimnasio.findMany({
        where: {
          estado: 'CONFIRMADA',
          fecha: { gte: aDate(hoy), lte: aDate(fechas.at(-1)!) },
        },
        select: { id: true, franjaId: true, fecha: true, usuarioId: true },
      }),
    ]);

    return {
      hoy,
      dias: fechas.map((fecha) => {
        const diaSemana = diaSemanaIso(fecha);
        const delDia = reservas.filter((r) => deDate(r.fecha) === fecha);
        return {
          fecha,
          diaSemana,
          franjas: franjas
            .filter((f) => f.diaSemana === diaSemana)
            .map((f) => {
              const horaInicio = horaDeTime(f.horaInicio);
              const horaFin = horaDeTime(f.horaFin);
              const deLaFranja = delDia.filter((r) => r.franjaId === f.id);
              const mia = deLaFranja.find((r) => r.usuarioId === usuarioId);
              const libres = Math.max(0, f.cupoMaximo - deLaFranja.length);
              const estado: EstadoFranjaGimnasio =
                instanteEnColombia(fecha, horaFin) <= ahora
                  ? 'PASADA'
                  : mia
                    ? 'TUYA'
                    : libres === 0
                      ? 'LLENA'
                      : 'DISPONIBLE';
              return {
                id: f.id,
                horaInicio,
                horaFin,
                cupoMaximo: f.cupoMaximo,
                libres,
                estado,
                ...(mia && estado === 'TUYA' ? { reservaId: mia.id } : {}),
              };
            }),
        };
      }),
    };
  }

  /**
   * Reserva un cupo. La franja se bloquea (`FOR UPDATE`) mientras se cuentan sus
   * reservas: si dos personas piden el último cupo a la vez, la segunda espera y
   * encuentra la franja llena.
   */
  async reservar(
    usuarioId: string,
    dto: CrearReservaGimnasioDto,
    ahora = new Date(),
  ): Promise<ReservaGimnasioVista> {
    if (!esFechaValida(dto.fecha)) {
      throw errorDeFecha('La fecha debe tener el formato AAAA-MM-DD.');
    }
    const hoy = fechaEnColombia(ahora);
    const ultimo = sumarDias(hoy, DIAS_PARA_RESERVAR - 1);
    if (dto.fecha < hoy || dto.fecha > ultimo) {
      throw errorDeFecha(
        `Puedes reservar desde hoy hasta ${DIAS_PARA_RESERVAR - 1} días adelante.`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM franja_gimnasio WHERE id = ${dto.franjaId}::uuid FOR UPDATE`;
        const franja = await tx.franjaGimnasio.findUnique({
          where: { id: dto.franjaId },
        });
        if (!franja || !franja.activa) {
          throw new NotFoundException(
            'Esa franja no existe o no está habilitada.',
          );
        }
        if (franja.diaSemana !== diaSemanaIso(dto.fecha)) {
          throw errorDeFecha('Esa franja no es de ese día de la semana.');
        }
        if (
          instanteEnColombia(dto.fecha, horaDeTime(franja.horaFin)) <= ahora
        ) {
          throw new ConflictException(
            'Esa franja ya terminó. Elige una que no haya pasado.',
          );
        }

        const ocupados = await tx.reservaGimnasio.count({
          where: {
            franjaId: franja.id,
            fecha: aDate(dto.fecha),
            estado: 'CONFIRMADA',
          },
        });
        if (ocupados >= franja.cupoMaximo) {
          throw new ConflictException('Esa franja se llenó. Elige otra hora.');
        }

        const reserva = await tx.reservaGimnasio.create({
          data: { usuarioId, franjaId: franja.id, fecha: aDate(dto.fecha) },
          include: { franja: true },
        });
        return aReserva(reserva);
      });
    } catch (error) {
      // Índice único parcial: una sola reserva confirmada por persona, franja y fecha.
      if (esErrorPrisma(error, 'P2002')) {
        throw new ConflictException(
          'Ya tienes un cupo reservado en esa franja.',
        );
      }
      throw error;
    }
  }

  /** Mis reservas confirmadas que todavía no terminan, de la más próxima a la más lejana. */
  async misReservas(
    usuarioId: string,
    ahora = new Date(),
  ): Promise<ReservaGimnasioVista[]> {
    const reservas = await this.prisma.reservaGimnasio.findMany({
      where: {
        usuarioId,
        estado: 'CONFIRMADA',
        fecha: { gte: aDate(fechaEnColombia(ahora)) },
      },
      include: { franja: true },
    });
    return reservas
      .map(aReserva)
      .filter((r) => instanteEnColombia(r.fecha, r.horaFin) > ahora)
      .sort((a, b) =>
        `${a.fecha} ${a.horaInicio}`.localeCompare(
          `${b.fecha} ${b.horaInicio}`,
        ),
      );
  }

  /**
   * Cancela una reserva antes de que empiece la franja y libera el cupo. Puede
   * hacerlo quien la hizo o el personal de deportes. Cancelar dos veces no es un error.
   */
  async cancelar(
    id: string,
    usuario: { id: string; rol: Rol },
    ahora = new Date(),
  ): Promise<void> {
    const reserva = await this.prisma.reservaGimnasio.findUnique({
      where: { id },
      include: { franja: true },
    });
    if (!reserva) throw new NotFoundException('Esa reserva no existe.');
    if (
      reserva.usuarioId !== usuario.id &&
      !GESTORES_GIMNASIO.includes(usuario.rol)
    ) {
      throw new ForbiddenException(
        'Solo quien hizo la reserva o el personal de deportes puede cancelarla.',
      );
    }
    if (reserva.estado === 'CANCELADA') return;
    const inicio = instanteEnColombia(
      deDate(reserva.fecha),
      horaDeTime(reserva.franja.horaInicio),
    );
    if (inicio <= ahora) {
      throw new ConflictException(
        'Esa franja ya empezó, así que la reserva no se puede cancelar.',
      );
    }
    await this.prisma.reservaGimnasio.updateMany({
      where: { id, estado: 'CONFIRMADA' },
      data: { estado: 'CANCELADA', canceladaEn: ahora },
    });
  }

  /** Todas las franjas, también las deshabilitadas (personal de deportes). */
  async franjas(): Promise<FranjaGimnasioVista[]> {
    const franjas = await this.prisma.franjaGimnasio.findMany({
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
    return franjas.map(aFranja);
  }

  /**
   * Cambia el cupo o habilita/deshabilita una franja. Bajar el cupo no cancela
   * reservas ya hechas: solo impide nuevas hasta que haya espacio.
   */
  async actualizarFranja(
    id: string,
    dto: ActualizarFranjaGimnasioDto,
  ): Promise<FranjaGimnasioVista> {
    const existe = await this.prisma.franjaGimnasio.findUnique({
      where: { id },
    });
    if (!existe) throw new NotFoundException('Esa franja no existe.');
    return aFranja(
      await this.prisma.franjaGimnasio.update({
        where: { id },
        data: { cupoMaximo: dto.cupoMaximo, activa: dto.activa },
      }),
    );
  }
}
