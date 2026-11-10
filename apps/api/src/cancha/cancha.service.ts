import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Cancha,
  FranjaCancha,
  ReservaCancha,
} from '../generated/prisma/client';
import type { Rol } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ActualizarFranjaDto,
  CrearFranjaDto,
  CrearReservaDto,
} from './cancha.dto';
import {
  diaSemanaIso,
  fechaEnColombia,
  horaDeTime,
  horaEnColombia,
  instanteEnColombia,
  lunesDe,
  minutosDe,
  sumarDias,
  timeDeHora,
} from './cancha.horario';

/** TUYA: la reservó quien consulta (GYMM-28); RESERVADA: otra persona. */
export type EstadoFranja = 'DISPONIBLE' | 'RESERVADA' | 'TUYA' | 'PASADA';

export interface CanchaResumen {
  id: string;
  nombre: string;
  descripcion: string | null;
}

/** Quienes definen el horario de la cancha (GYMM-20) y cancelan reservas ajenas (GYMM-29). */
export const GESTORES_CANCHA: readonly Rol[] = ['PERSONAL_DEPORTES', 'ADMIN'];

export const esGestorCancha = (rol: Rol) => GESTORES_CANCHA.includes(rol);

export interface FranjaDelDia {
  id: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoFranja;
}

export interface DiaDisponible {
  /** AAAA-MM-DD en hora de Colombia. */
  fecha: string;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  franjas: FranjaDelDia[];
}

export interface DisponibilidadSemana {
  cancha: CanchaResumen;
  /** Fecha de hoy en Colombia, para que la app sepa qué semana es la actual. */
  hoy: string;
  semana: { desde: string; hasta: string };
  dias: DiaDisponible[];
}

export interface FranjaVista {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activa: boolean;
}

export interface FranjasCancha {
  cancha: CanchaResumen;
  franjas: FranjaVista[];
}

/** Reserva de la cancha tal como la ve quien la hizo (GYMM-28). */
export interface ReservaVista {
  id: string;
  cancha: string;
  /** AAAA-MM-DD en hora de Colombia. */
  fecha: string;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

const aResumen = (c: Cancha): CanchaResumen => ({
  id: c.id,
  nombre: c.nombre,
  descripcion: c.descripcion,
});

const aVista = (f: FranjaCancha): FranjaVista => ({
  id: f.id,
  diaSemana: f.diaSemana,
  horaInicio: horaDeTime(f.horaInicio),
  horaFin: horaDeTime(f.horaFin),
  activa: f.activa,
});

const NOMBRE_DIA = [
  '',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

const esErrorPrisma = (error: unknown, codigo: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === codigo;

/**
 * true si Postgres rechazó la fila por la restricción de exclusión
 * `reserva_cancha_sin_solapamiento` (SQLSTATE 23P01). Prisma no tiene un código
 * propio para eso: la entrega como P2039 con el error original del driver.
 */
function esExclusionViolada(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return false;
  }
  const meta = error.meta as
    { driverAdapterError?: { cause?: { originalCode?: unknown } } } | undefined;
  return meta?.driverAdapterError?.cause?.originalCode === '23P01';
}

const aReserva = (r: ReservaCancha, cancha: string): ReservaVista => {
  const fecha = fechaEnColombia(r.inicio);
  return {
    id: r.id,
    cancha,
    fecha,
    diaSemana: diaSemanaIso(fecha),
    horaInicio: horaEnColombia(r.inicio),
    horaFin: horaEnColombia(r.fin),
  };
};

/** Dos intervalos [a, b) y [c, d) se cruzan si cada uno empieza antes de que termine el otro. */
const seCruzan = (a: number, b: number, c: number, d: number) => a < d && c < b;

@Injectable()
export class CanchaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Disponibilidad de la semana (GYMM-20): cada franja habilitada, día por día,
   * con su estado. Una franja está RESERVADA si alguna reserva confirmada se cruza
   * con ella (TUYA si esa reserva es de `usuarioId`), y PASADA si ya empezó.
   */
  async disponibilidad(
    semana?: string,
    ahora = new Date(),
    usuarioId?: string,
  ): Promise<DisponibilidadSemana> {
    const cancha = await this.canchaHabilitada();
    const hoy = fechaEnColombia(ahora);
    const desde = lunesDe(semana ?? hoy);
    const hasta = sumarDias(desde, 6);

    const [franjas, reservas] = await Promise.all([
      this.prisma.franjaCancha.findMany({
        where: { canchaId: cancha.id, activa: true },
        orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      }),
      this.prisma.reservaCancha.findMany({
        where: {
          canchaId: cancha.id,
          estado: 'CONFIRMADA',
          inicio: { lt: instanteEnColombia(sumarDias(desde, 7), '00:00') },
          fin: { gt: instanteEnColombia(desde, '00:00') },
        },
        select: { inicio: true, fin: true, usuarioId: true },
      }),
    ]);

    const dias: DiaDisponible[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = sumarDias(desde, i);
      const diaSemana = diaSemanaIso(fecha);
      dias.push({
        fecha,
        diaSemana,
        franjas: franjas
          .filter((f) => f.diaSemana === diaSemana)
          .map((f) => {
            const horaInicio = horaDeTime(f.horaInicio);
            const horaFin = horaDeTime(f.horaFin);
            const inicio = instanteEnColombia(fecha, horaInicio).getTime();
            const fin = instanteEnColombia(fecha, horaFin).getTime();
            const cruces = reservas.filter((r) =>
              seCruzan(inicio, fin, r.inicio.getTime(), r.fin.getTime()),
            );
            const estado: EstadoFranja =
              inicio <= ahora.getTime()
                ? 'PASADA'
                : cruces.some((r) => r.usuarioId === usuarioId)
                  ? 'TUYA'
                  : cruces.length > 0
                    ? 'RESERVADA'
                    : 'DISPONIBLE';
            return { id: f.id, horaInicio, horaFin, estado };
          }),
      });
    }

    return { cancha: aResumen(cancha), hoy, semana: { desde, hasta }, dias };
  }

  /**
   * Reserva una franja en una fecha (GYMM-28). Quien decide si dos reservas
   * chocan es Postgres (restricción de exclusión), no una consulta previa: así,
   * si dos personas reservan la misma franja al mismo tiempo, solo una queda.
   */
  async reservar(
    usuarioId: string,
    dto: CrearReservaDto,
    ahora = new Date(),
  ): Promise<ReservaVista> {
    const cancha = await this.canchaHabilitada();
    const franja = await this.prisma.franjaCancha.findUnique({
      where: { id: dto.franjaId },
    });
    if (!franja || franja.canchaId !== cancha.id) {
      throw new NotFoundException('Esa franja no existe.');
    }
    if (franja.diaSemana !== diaSemanaIso(dto.fecha)) {
      const mensaje = `Esa franja es del ${NOMBRE_DIA[franja.diaSemana]}, no del ${NOMBRE_DIA[diaSemanaIso(dto.fecha)]}.`;
      throw new BadRequestException({
        statusCode: 400,
        message: mensaje,
        errores: { fecha: mensaje },
      });
    }
    if (!franja.activa) {
      throw new ConflictException(
        'Esa franja ya no está habilitada. Elige otra.',
      );
    }

    const inicio = instanteEnColombia(dto.fecha, horaDeTime(franja.horaInicio));
    const fin = instanteEnColombia(dto.fecha, horaDeTime(franja.horaFin));
    if (inicio <= ahora) {
      throw new ConflictException(
        'Esa franja ya empezó. Elige una que no haya pasado.',
      );
    }

    try {
      const reserva = await this.prisma.reservaCancha.create({
        data: { canchaId: cancha.id, usuarioId, inicio, fin },
      });
      return aReserva(reserva, cancha.nombre);
    } catch (error) {
      if (!esExclusionViolada(error)) throw error;
      const otra = await this.prisma.reservaCancha.findFirst({
        where: {
          canchaId: cancha.id,
          estado: 'CONFIRMADA',
          inicio: { lt: fin },
          fin: { gt: inicio },
        },
        select: { usuarioId: true },
      });
      throw new ConflictException(
        otra?.usuarioId === usuarioId
          ? 'Ya tienes reservada la cancha en ese horario.'
          : 'Otra persona acaba de reservar esa franja. Elige otra.',
      );
    }
  }

  /**
   * Cancela una reserva (GYMM-29): la marca CANCELADA, así que la restricción de
   * exclusión y la disponibilidad dejan de contarla y la franja queda libre al
   * instante. Puede hacerlo quien la hizo o el personal de deportes, y solo antes
   * de que empiece. Cancelar dos veces no es un error.
   */
  async cancelarReserva(
    id: string,
    usuario: { id: string; rol: Rol },
    ahora = new Date(),
  ): Promise<void> {
    const reserva = await this.prisma.reservaCancha.findUnique({
      where: { id },
    });
    if (!reserva) throw new NotFoundException('Esa reserva no existe.');
    if (reserva.usuarioId !== usuario.id && !esGestorCancha(usuario.rol)) {
      throw new ForbiddenException(
        'Solo quien hizo la reserva o el personal de deportes puede cancelarla.',
      );
    }
    if (reserva.estado === 'CANCELADA') return;
    if (reserva.inicio <= ahora) {
      throw new ConflictException(
        'Esa reserva ya empezó, así que no se puede cancelar.',
      );
    }
    // El filtro por estado evita pisar `canceladaEn` si dos cancelaciones llegan juntas.
    await this.prisma.reservaCancha.updateMany({
      where: { id, estado: 'CONFIRMADA' },
      data: { estado: 'CANCELADA', canceladaEn: ahora },
    });
  }

  /** Reservas confirmadas de la persona que todavía no terminan, de la más próxima a la más lejana. */
  async misReservas(
    usuarioId: string,
    ahora = new Date(),
  ): Promise<ReservaVista[]> {
    const reservas = await this.prisma.reservaCancha.findMany({
      where: { usuarioId, estado: 'CONFIRMADA', fin: { gt: ahora } },
      orderBy: { inicio: 'asc' },
      include: { cancha: { select: { nombre: true } } },
    });
    return reservas.map((r) => aReserva(r, r.cancha.nombre));
  }

  /** Todas las franjas de la cancha, también las deshabilitadas (personal de deportes). */
  async listarFranjas(): Promise<FranjasCancha> {
    const cancha = await this.canchaHabilitada();
    const franjas = await this.prisma.franjaCancha.findMany({
      where: { canchaId: cancha.id },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
    return { cancha: aResumen(cancha), franjas: franjas.map(aVista) };
  }

  async crearFranja(dto: CrearFranjaDto): Promise<FranjaVista> {
    const inicio = minutosDe(dto.horaInicio);
    const fin = minutosDe(dto.horaFin);
    if (fin <= inicio) {
      const mensaje = 'La hora de fin debe ser posterior a la de inicio.';
      throw new BadRequestException({
        statusCode: 400,
        message: mensaje,
        errores: { horaFin: mensaje },
      });
    }

    const cancha = await this.canchaHabilitada();
    // La base solo impide dos franjas que empiecen a la misma hora; aquí se
    // impide además que se crucen, incluso con una deshabilitada.
    const delDia = await this.prisma.franjaCancha.findMany({
      where: { canchaId: cancha.id, diaSemana: dto.diaSemana },
    });
    const cruce = delDia.find((f) =>
      seCruzan(
        inicio,
        fin,
        minutosDe(horaDeTime(f.horaInicio)),
        minutosDe(horaDeTime(f.horaFin)),
      ),
    );
    if (cruce) throw this.conflictoDeCruce(aVista(cruce));

    try {
      return aVista(
        await this.prisma.franjaCancha.create({
          data: {
            canchaId: cancha.id,
            diaSemana: dto.diaSemana,
            horaInicio: timeDeHora(dto.horaInicio),
            horaFin: timeDeHora(dto.horaFin),
          },
        }),
      );
    } catch (error) {
      if (esErrorPrisma(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe una franja ese día que empieza a esa hora.',
        );
      }
      throw error;
    }
  }

  async actualizarFranja(
    id: string,
    dto: ActualizarFranjaDto,
  ): Promise<FranjaVista> {
    await this.obtenerFranja(id);
    return aVista(
      await this.prisma.franjaCancha.update({
        where: { id },
        data: { activa: dto.activa },
      }),
    );
  }

  /**
   * Borra la franja. Las reservas no apuntan a franjas (guardan su propio inicio
   * y fin), así que borrarla no toca reservas ya hechas.
   */
  async eliminarFranja(id: string): Promise<void> {
    await this.obtenerFranja(id);
    await this.prisma.franjaCancha.delete({ where: { id } });
  }

  private async obtenerFranja(id: string): Promise<FranjaCancha> {
    const franja = await this.prisma.franjaCancha.findUnique({
      where: { id },
    });
    if (!franja) throw new NotFoundException('Esa franja no existe.');
    return franja;
  }

  /** Por ahora el gimnasio tiene una sola cancha: la primera habilitada. */
  private async canchaHabilitada(): Promise<Cancha> {
    const cancha = await this.prisma.cancha.findFirst({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
    });
    if (!cancha) {
      throw new NotFoundException(
        'La cancha no está habilitada en este momento.',
      );
    }
    return cancha;
  }

  private conflictoDeCruce(f: FranjaVista) {
    const mensaje = `Se cruza con la franja del ${NOMBRE_DIA[f.diaSemana]} de ${f.horaInicio} a ${f.horaFin}${
      f.activa ? '' : ' (deshabilitada)'
    }.`;
    return new ConflictException({
      statusCode: 409,
      message: mensaje,
      errores: { horaInicio: mensaje },
    });
  }
}
