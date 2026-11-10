import { Injectable, NotFoundException } from '@nestjs/common';
import { mejorMarca } from '@gymtrack/shared';
import type { GrupoMuscular } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EjercicioResumen {
  id: string;
  nombre: string;
  grupoMuscular: GrupoMuscular;
}

/** La serie con más carga del usuario en un ejercicio, y la fecha de la sesión en que la hizo. */
export interface MarcaVista {
  cargaKg: number;
  repeticiones: number;
  fecha: string;
}

/** Un ejercicio que el usuario ya ha hecho, para elegir cuál consultar. */
export interface EjercicioConHistorico {
  ejercicio: EjercicioResumen;
  /** Sesiones en que lo ha hecho. */
  sesiones: number;
  /** Inicio de la última sesión en que lo hizo. */
  ultimaFecha: string;
  mejorMarca: MarcaVista;
}

export interface SesionDelEjercicio {
  sesionId: string;
  /** Inicio de la sesión. */
  fecha: string;
  series: { numeroSerie: number; cargaKg: number; repeticiones: number }[];
}

export interface HistoricoEjercicio {
  ejercicio: EjercicioResumen;
  /** null si aún no lo ha hecho. */
  mejorMarca: (MarcaVista & { sesionId: string; numeroSerie: number }) | null;
  /** De la más reciente a la más antigua. */
  sesiones: SesionDelEjercicio[];
}

const EJERCICIO = { id: true, nombre: true, grupoMuscular: true } as const;

/** Histórico de cargas y repeticiones por ejercicio (GYMM-31). Solo del usuario del token. */
@Injectable()
export class ProgresoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los ejercicios que el usuario ha registrado, del último que hizo al primero. */
  async ejercicios(usuarioId: string): Promise<EjercicioConHistorico[]> {
    const series = await this.prisma.serieRegistrada.findMany({
      where: { sesion: { usuarioId } },
      select: {
        sesionId: true,
        cargaKg: true,
        repeticiones: true,
        sesion: { select: { inicio: true } },
        ejercicio: { select: EJERCICIO },
      },
    });

    const porEjercicio = new Map<
      string,
      {
        ejercicio: EjercicioResumen;
        series: (MarcaVista & { sesionId: string })[];
      }
    >();
    for (const s of series) {
      const grupo = porEjercicio.get(s.ejercicio.id) ?? {
        ejercicio: s.ejercicio,
        series: [],
      };
      grupo.series.push({
        sesionId: s.sesionId,
        cargaKg: Number(s.cargaKg),
        repeticiones: s.repeticiones,
        fecha: s.sesion.inicio.toISOString(),
      });
      porEjercicio.set(s.ejercicio.id, grupo);
    }

    return [...porEjercicio.values()]
      .map(({ ejercicio, series: delEjercicio }) => {
        const marca = mejorMarca(delEjercicio)!;
        return {
          ejercicio,
          sesiones: new Set(delEjercicio.map((s) => s.sesionId)).size,
          ultimaFecha: delEjercicio.reduce(
            (ultima, s) => (s.fecha > ultima ? s.fecha : ultima),
            delEjercicio[0].fecha,
          ),
          mejorMarca: {
            cargaKg: marca.cargaKg,
            repeticiones: marca.repeticiones,
            fecha: marca.fecha,
          },
        };
      })
      .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
  }

  /** Las series del usuario en un ejercicio, agrupadas por sesión, y su mejor marca. */
  async historico(
    usuarioId: string,
    ejercicioId: string,
  ): Promise<HistoricoEjercicio> {
    const ejercicio = await this.prisma.ejercicio.findUnique({
      where: { id: ejercicioId },
      select: EJERCICIO,
    });
    if (!ejercicio) {
      throw new NotFoundException('Ese ejercicio no existe.');
    }

    const series = await this.prisma.serieRegistrada.findMany({
      where: { ejercicioId, sesion: { usuarioId } },
      orderBy: [{ sesion: { inicio: 'desc' } }, { numeroSerie: 'asc' }],
      select: {
        sesionId: true,
        numeroSerie: true,
        cargaKg: true,
        repeticiones: true,
        sesion: { select: { inicio: true } },
      },
    });

    const sesiones: SesionDelEjercicio[] = [];
    for (const s of series) {
      let sesion = sesiones.at(-1);
      if (sesion?.sesionId !== s.sesionId) {
        sesion = {
          sesionId: s.sesionId,
          fecha: s.sesion.inicio.toISOString(),
          series: [],
        };
        sesiones.push(sesion);
      }
      sesion.series.push({
        numeroSerie: s.numeroSerie,
        cargaKg: Number(s.cargaKg),
        repeticiones: s.repeticiones,
      });
    }

    const marca = mejorMarca(
      sesiones.flatMap((sesion) =>
        sesion.series.map((serie) => ({
          ...serie,
          sesionId: sesion.sesionId,
          fecha: sesion.fecha,
        })),
      ),
    );
    return { ejercicio, mejorMarca: marca, sesiones };
  }
}
