import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Sesion, SerieRegistrada } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RegistrarSerieDto } from './sesiones.dto';

export interface SerieVista {
  ejercicioId: string;
  numeroSerie: number;
  cargaKg: number;
  repeticiones: number;
  registradaEn: string;
}

export interface SesionVista {
  id: string;
  rutinaId: string | null;
  inicio: string;
  fin: string | null;
  /** En el orden en que se registraron. */
  series: SerieVista[];
}

/** Lo que hizo el deportista en un ejercicio la última vez, para precargar el formulario. */
export interface PrecargaEjercicio {
  ejercicioId: string;
  /** Inicio de la sesión de donde salen los valores. */
  fecha: string;
  series: Pick<SerieVista, 'numeroSerie' | 'cargaKg' | 'repeticiones'>[];
}

/**
 * Una sesión abierta hace más de estas horas se da por terminada: la persona se fue
 * sin tocar "Terminar sesión" y la próxima vez que entrene empieza una nueva.
 */
export const HORAS_SESION_OLVIDADA = 6;

const CON_SERIES = {
  series: { orderBy: { registradaEn: 'asc' } },
} as const;

const aSerie = (s: SerieRegistrada): SerieVista => ({
  ejercicioId: s.ejercicioId,
  numeroSerie: s.numeroSerie,
  cargaKg: Number(s.cargaKg),
  repeticiones: s.repeticiones,
  registradaEn: s.registradaEn.toISOString(),
});

const aVista = (s: Sesion & { series: SerieRegistrada[] }): SesionVista => ({
  id: s.id,
  rutinaId: s.rutinaId,
  inicio: s.inicio.toISOString(),
  fin: s.fin?.toISOString() ?? null,
  series: s.series.map(aSerie),
});

const esErrorPrisma = (error: unknown, codigo: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === codigo;

/** Sesiones de entrenamiento y series registradas en el gimnasio (GYMM-26). */
@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** La sesión en la que el usuario está entrenando ahora. */
  async actual(usuarioId: string): Promise<SesionVista> {
    const sesion = await this.abierta(usuarioId);
    if (!sesion) {
      throw new NotFoundException(
        'No tienes una sesión de entrenamiento abierta.',
      );
    }
    return aVista(sesion);
  }

  /**
   * Empieza una sesión con la rutina vigente. Si ya hay una abierta, la devuelve:
   * un doble toque o un reintento sin señal no abren una segunda (el índice único
   * parcial `sesion_una_abierta_por_usuario` lo garantiza aunque lleguen a la vez).
   */
  async iniciar(usuarioId: string): Promise<SesionVista> {
    const abierta = await this.abierta(usuarioId);
    if (abierta) return aVista(abierta);

    const rutina = await this.prisma.rutina.findFirst({
      where: { usuarioId, vigente: true },
      select: { id: true },
    });
    if (!rutina) {
      throw new NotFoundException(
        'Aún no tienes una rutina asignada. Pídesela a tu instructor.',
      );
    }

    try {
      return aVista(
        await this.prisma.sesion.create({
          data: { usuarioId, rutinaId: rutina.id },
          include: CON_SERIES,
        }),
      );
    } catch (error) {
      if (esErrorPrisma(error, 'P2002')) return this.actual(usuarioId);
      throw error;
    }
  }

  /** Registra (o corrige) una serie de la sesión abierta. */
  async registrarSerie(
    usuarioId: string,
    sesionId: string,
    dto: RegistrarSerieDto,
  ): Promise<SerieVista> {
    const sesion = await this.propia(usuarioId, sesionId);
    if (sesion.fin) {
      throw new ConflictException(
        'Esta sesión ya terminó. Empieza una nueva para seguir registrando.',
      );
    }

    const enRutina = sesion.rutinaId
      ? await this.prisma.rutinaEjercicio.findMany({
          where: { rutinaId: sesion.rutinaId, ejercicioId: dto.ejercicioId },
          select: { series: true },
        })
      : [];
    if (enRutina.length === 0) {
      const mensaje = 'Ese ejercicio no está en la rutina de esta sesión.';
      throw new BadRequestException({
        statusCode: 400,
        message: mensaje,
        errores: { ejercicioId: mensaje },
      });
    }
    // Un ejercicio puede repetirse en otro día de la rutina con otras series.
    const series = Math.max(...enRutina.map((e) => e.series));
    if (dto.numeroSerie > series) {
      const mensaje = `Este ejercicio tiene ${series} series en tu rutina.`;
      throw new BadRequestException({
        statusCode: 400,
        message: mensaje,
        errores: { numeroSerie: mensaje },
      });
    }

    const valores = { cargaKg: dto.cargaKg, repeticiones: dto.repeticiones };
    const serie = await this.prisma.serieRegistrada.upsert({
      where: {
        sesionId_ejercicioId_numeroSerie: {
          sesionId,
          ejercicioId: dto.ejercicioId,
          numeroSerie: dto.numeroSerie,
        },
      },
      create: {
        sesionId,
        ejercicioId: dto.ejercicioId,
        numeroSerie: dto.numeroSerie,
        ...valores,
      },
      update: valores,
    });
    return aSerie(serie);
  }

  /** Termina la sesión. Si ya estaba terminada, la devuelve tal cual. */
  async cerrar(usuarioId: string, sesionId: string): Promise<SesionVista> {
    const sesion = await this.propia(usuarioId, sesionId);
    if (sesion.fin) return aVista(sesion);
    return aVista(
      await this.prisma.sesion.update({
        where: { id: sesionId },
        data: { fin: new Date() },
        include: CON_SERIES,
      }),
    );
  }

  /**
   * Por cada ejercicio de la rutina vigente, las series de la última sesión terminada
   * en que se hizo (GYMM-43). Los ejercicios que nunca ha hecho no aparecen.
   */
  async precarga(usuarioId: string): Promise<PrecargaEjercicio[]> {
    const rutina = await this.prisma.rutina.findFirst({
      where: { usuarioId, vigente: true },
      select: { ejercicios: { select: { ejercicioId: true } } },
    });
    const ids = [...new Set(rutina?.ejercicios.map((e) => e.ejercicioId))];
    if (ids.length === 0) return [];

    // La serie más reciente de cada ejercicio dice de qué sesión salen sus valores.
    const ultimas = await this.prisma.serieRegistrada.findMany({
      where: {
        ejercicioId: { in: ids },
        sesion: { usuarioId, fin: { not: null } },
      },
      orderBy: { registradaEn: 'desc' },
      distinct: ['ejercicioId'],
      select: { ejercicioId: true, sesionId: true },
    });
    if (ultimas.length === 0) return [];

    const series = await this.prisma.serieRegistrada.findMany({
      where: {
        OR: ultimas.map(({ ejercicioId, sesionId }) => ({
          ejercicioId,
          sesionId,
        })),
      },
      orderBy: { numeroSerie: 'asc' },
      include: { sesion: { select: { inicio: true } } },
    });

    return ultimas.map(({ ejercicioId }) => {
      const delEjercicio = series.filter((s) => s.ejercicioId === ejercicioId);
      return {
        ejercicioId,
        fecha: delEjercicio[0].sesion.inicio.toISOString(),
        series: delEjercicio.map((s) => ({
          numeroSerie: s.numeroSerie,
          cargaKg: Number(s.cargaKg),
          repeticiones: s.repeticiones,
        })),
      };
    });
  }

  /**
   * La sesión abierta del usuario, o null. Una abierta hace más de
   * HORAS_SESION_OLVIDADA se cierra en la hora de su última serie.
   */
  private async abierta(usuarioId: string) {
    const sesion = await this.prisma.sesion.findFirst({
      where: { usuarioId, fin: null },
      include: CON_SERIES,
    });
    if (!sesion) return null;

    const limite = Date.now() - HORAS_SESION_OLVIDADA * 60 * 60 * 1000;
    if (sesion.inicio.getTime() >= limite) return sesion;

    const ultima = sesion.series.at(-1)?.registradaEn ?? sesion.inicio;
    await this.prisma.sesion.update({
      where: { id: sesion.id },
      data: { fin: ultima },
    });
    return null;
  }

  private async propia(usuarioId: string, sesionId: string) {
    const sesion = await this.prisma.sesion.findUnique({
      where: { id: sesionId },
      include: CON_SERIES,
    });
    if (!sesion || sesion.usuarioId !== usuarioId) {
      throw new NotFoundException('Esa sesión de entrenamiento no existe.');
    }
    return sesion;
  }
}
