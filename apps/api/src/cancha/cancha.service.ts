import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cancha, FranjaCancha } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ActualizarFranjaDto, CrearFranjaDto } from './cancha.dto';
import {
  diaSemanaIso,
  fechaEnColombia,
  horaDeTime,
  instanteEnColombia,
  lunesDe,
  minutosDe,
  sumarDias,
  timeDeHora,
} from './cancha.horario';

export type EstadoFranja = 'DISPONIBLE' | 'RESERVADA' | 'PASADA';

export interface CanchaResumen {
  id: string;
  nombre: string;
  descripcion: string | null;
}

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

/** Dos intervalos [a, b) y [c, d) se cruzan si cada uno empieza antes de que termine el otro. */
const seCruzan = (a: number, b: number, c: number, d: number) => a < d && c < b;

@Injectable()
export class CanchaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Disponibilidad de la semana (GYMM-20): cada franja habilitada, día por día,
   * con su estado. Una franja está RESERVADA si alguna reserva confirmada se cruza
   * con ella (GYMM-28 crea las reservas), y PASADA si ya empezó.
   */
  async disponibilidad(
    semana?: string,
    ahora = new Date(),
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
        select: { inicio: true, fin: true },
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
            const reservada = reservas.some((r) =>
              seCruzan(inicio, fin, r.inicio.getTime(), r.fin.getTime()),
            );
            const estado: EstadoFranja =
              inicio <= ahora.getTime()
                ? 'PASADA'
                : reservada
                  ? 'RESERVADA'
                  : 'DISPONIBLE';
            return { id: f.id, horaInicio, horaFin, estado };
          }),
      });
    }

    return { cancha: aResumen(cancha), hoy, semana: { desde, hasta }, dias };
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
