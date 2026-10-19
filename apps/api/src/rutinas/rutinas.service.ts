import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Ejercicio,
  Rutina,
  RutinaEjercicio,
  Usuario,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearRutinaDto } from './rutinas.dto';

export interface EjercicioEnRutina {
  id: string;
  orden: number;
  ejercicio: Pick<Ejercicio, 'id' | 'nombre' | 'grupoMuscular'>;
  series: number;
  repeticionesObjetivo: string;
  metodo: RutinaEjercicio['metodo'];
  descansoSegundos: number | null;
  notas: string | null;
}

export interface DiaRutina {
  dia: number;
  ejercicios: EjercicioEnRutina[];
}

export interface RutinaVista {
  id: string;
  nombre: string;
  descripcion: string | null;
  vigente: boolean;
  fechaAsignacion: string;
  instructor: { id: string; nombres: string; apellidos: string };
  /** Días en orden (Día 1, Día 2…), cada uno con sus ejercicios en el orden en que se hacen. */
  dias: DiaRutina[];
}

const INCLUIR = {
  instructor: { select: { id: true, nombres: true, apellidos: true } },
  ejercicios: {
    orderBy: { orden: 'asc' },
    include: {
      ejercicio: { select: { id: true, nombre: true, grupoMuscular: true } },
    },
  },
} as const;

type RutinaCompleta = Rutina & {
  instructor: Pick<Usuario, 'id' | 'nombres' | 'apellidos'>;
  ejercicios: (RutinaEjercicio & {
    ejercicio: Pick<Ejercicio, 'id' | 'nombre' | 'grupoMuscular'>;
  })[];
};

function aVista(r: RutinaCompleta): RutinaVista {
  const dias = new Map<number, EjercicioEnRutina[]>();
  for (const e of [...r.ejercicios].sort((a, b) => a.orden - b.orden)) {
    const lista = dias.get(e.dia) ?? [];
    lista.push({
      id: e.id,
      orden: e.orden,
      ejercicio: e.ejercicio,
      series: e.series,
      repeticionesObjetivo: e.repeticionesObjetivo,
      metodo: e.metodo,
      descansoSegundos: e.descansoSegundos,
      notas: e.notas,
    });
    dias.set(e.dia, lista);
  }
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    vigente: r.vigente,
    fechaAsignacion: r.fechaAsignacion.toISOString(),
    instructor: r.instructor,
    dias: [...dias.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dia, ejercicios]) => ({ dia, ejercicios })),
  };
}

const esErrorPrisma = (error: unknown, codigo: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === codigo;

@Injectable()
export class RutinasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rutinas del deportista: primero la vigente y luego las anteriores, de la más reciente a la más antigua. */
  async historial(deportistaId: string): Promise<RutinaVista[]> {
    await this.verificarDeportista(deportistaId);
    const rutinas = await this.prisma.rutina.findMany({
      where: { usuarioId: deportistaId },
      orderBy: [{ vigente: 'desc' }, { fechaAsignacion: 'desc' }],
      include: INCLUIR,
    });
    return rutinas.map(aVista);
  }

  /** La rutina vigente del usuario (la que ve en su celular). */
  async vigente(usuarioId: string): Promise<RutinaVista> {
    const rutina = await this.prisma.rutina.findFirst({
      where: { usuarioId, vigente: true },
      include: INCLUIR,
    });
    if (!rutina) {
      throw new NotFoundException(
        'Aún no tienes una rutina asignada. Pídesela a tu instructor.',
      );
    }
    return aVista(rutina);
  }

  /**
   * Crea la rutina y se la asigna al deportista. En la misma transacción la rutina
   * que tenía deja de estar vigente (GYMM-21); el índice único parcial
   * `rutina_una_vigente_por_usuario` lo garantiza aunque dos instructores asignen a la vez.
   */
  async asignar(
    deportistaId: string,
    instructorId: string,
    dto: CrearRutinaDto,
  ): Promise<RutinaVista> {
    await this.verificarDeportista(deportistaId);

    const errores: Record<string, string> = {};
    const catalogo = await this.prisma.ejercicio.findMany({
      where: {
        id: { in: [...new Set(dto.ejercicios.map((e) => e.ejercicioId))] },
      },
      select: { id: true, nombre: true, activo: true },
    });
    const porId = new Map(catalogo.map((e) => [e.id, e]));
    const vistos = new Set<string>();
    dto.ejercicios.forEach((e, i) => {
      const ejercicio = porId.get(e.ejercicioId);
      const campo = `ejercicios.${i}.ejercicioId`;
      if (!ejercicio) {
        errores[campo] = 'Ese ejercicio no existe en el catálogo.';
      } else if (!ejercicio.activo) {
        errores[campo] =
          `"${ejercicio.nombre}" está desactivado en el catálogo.`;
      } else if (vistos.has(`${e.dia}:${e.ejercicioId}`)) {
        errores[campo] = `"${ejercicio.nombre}" ya está en el día ${e.dia}.`;
      }
      vistos.add(`${e.dia}:${e.ejercicioId}`);
    });

    const dias = new Set(dto.ejercicios.map((e) => e.dia));
    for (let dia = 1; dia < Math.max(...dias); dia++) {
      if (!dias.has(dia)) {
        errores.ejercicios = `El día ${dia} no tiene ejercicios: los días van seguidos desde el día 1.`;
        break;
      }
    }

    if (Object.keys(errores).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errores).join(' '),
        errores,
      });
    }

    try {
      const [, creada] = await this.prisma.$transaction([
        this.prisma.rutina.updateMany({
          where: { usuarioId: deportistaId, vigente: true },
          data: { vigente: false },
        }),
        this.prisma.rutina.create({
          data: {
            nombre: dto.nombre,
            descripcion: dto.descripcion ?? null,
            usuarioId: deportistaId,
            instructorId,
            vigente: true,
            ejercicios: {
              create: dto.ejercicios.map((e, i) => ({
                ejercicioId: e.ejercicioId,
                dia: e.dia,
                orden: i + 1,
                series: e.series,
                repeticionesObjetivo: e.repeticionesObjetivo,
                metodo: e.metodo,
                descansoSegundos: e.descansoSegundos ?? null,
                notas: e.notas ?? null,
              })),
            },
          },
          include: INCLUIR,
        }),
      ]);
      return aVista(creada);
    } catch (error) {
      if (esErrorPrisma(error, 'P2002')) {
        throw new ConflictException(
          'Otra persona le asignó una rutina a este deportista al mismo tiempo. Recarga y revisa su rutina vigente.',
        );
      }
      throw error;
    }
  }

  private async verificarDeportista(id: string): Promise<void> {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || u.rol !== 'DEPORTISTA' || !u.activo) {
      throw new NotFoundException('Ese deportista no existe o no está activo.');
    }
  }
}
