import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Ejercicio } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ActualizarEjercicioDto,
  CrearEjercicioDto,
  FiltroEjerciciosDto,
} from './ejercicios.dto';

export interface EjercicioVista {
  id: string;
  nombre: string;
  grupoMuscular: Ejercicio['grupoMuscular'];
  descripcion: string | null;
  activo: boolean;
}

const aVista = (e: Ejercicio): EjercicioVista => ({
  id: e.id,
  nombre: e.nombre,
  grupoMuscular: e.grupoMuscular,
  descripcion: e.descripcion,
  activo: e.activo,
});

/** Minúsculas, sin tildes y con espacios simples: "  Jalón  al pecho" → "jalon al pecho". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const esErrorPrisma = (error: unknown, codigo: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === codigo;

@Injectable()
export class EjerciciosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catálogo ordenado por nombre. El filtro por grupo se hace en la base de datos;
   * la búsqueda de texto se hace aquí para ignorar tildes y mayúsculas (el catálogo
   * es de decenas o pocos cientos de ejercicios).
   */
  async listar(
    filtro: FiltroEjerciciosDto,
    puedeVerInactivos: boolean,
  ): Promise<EjercicioVista[]> {
    const ejercicios = await this.prisma.ejercicio.findMany({
      where: {
        grupoMuscular: filtro.grupo,
        activo: filtro.incluirInactivos && puedeVerInactivos ? undefined : true,
      },
      orderBy: { nombre: 'asc' },
    });
    const terminos = normalizar(filtro.q ?? '')
      .split(' ')
      .filter(Boolean);
    return ejercicios
      .filter((e) => {
        if (terminos.length === 0) return true;
        const texto = normalizar(`${e.nombre} ${e.descripcion ?? ''}`);
        return terminos.every((t) => texto.includes(t));
      })
      .map(aVista);
  }

  async obtener(id: string): Promise<EjercicioVista> {
    const ejercicio = await this.prisma.ejercicio.findUnique({ where: { id } });
    if (!ejercicio) throw new NotFoundException('Ese ejercicio no existe.');
    return aVista(ejercicio);
  }

  async crear(
    dto: CrearEjercicioDto,
    creadoPorId: string,
  ): Promise<EjercicioVista> {
    await this.verificarNombreLibre(dto.nombre);
    try {
      return aVista(
        await this.prisma.ejercicio.create({
          data: {
            nombre: dto.nombre,
            grupoMuscular: dto.grupoMuscular,
            descripcion: dto.descripcion ?? null,
            creadoPorId,
          },
        }),
      );
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async actualizar(
    id: string,
    dto: ActualizarEjercicioDto,
  ): Promise<EjercicioVista> {
    await this.obtener(id);
    if (dto.nombre !== undefined)
      await this.verificarNombreLibre(dto.nombre, id);
    try {
      return aVista(
        await this.prisma.ejercicio.update({
          where: { id },
          data: {
            nombre: dto.nombre,
            grupoMuscular: dto.grupoMuscular,
            descripcion: dto.descripcion,
            activo: dto.activo,
          },
        }),
      );
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  /** Borra el ejercicio si nadie lo usa; si está en rutinas o registros, pide desactivarlo. */
  async eliminar(id: string): Promise<void> {
    await this.obtener(id);
    try {
      await this.prisma.ejercicio.delete({ where: { id } });
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  /** Nombres únicos sin importar tildes ni mayúsculas ("Jalón" = "jalon"). */
  private async verificarNombreLibre(nombre: string, excepto?: string) {
    const buscado = normalizar(nombre);
    const existentes = await this.prisma.ejercicio.findMany({
      select: { id: true, nombre: true },
    });
    const repetido = existentes.find(
      (e) => e.id !== excepto && normalizar(e.nombre) === buscado,
    );
    if (repetido) {
      throw new ConflictException({
        statusCode: 409,
        message: `Ya existe un ejercicio llamado "${repetido.nombre}".`,
        errores: {
          nombre: `Ya existe un ejercicio llamado "${repetido.nombre}".`,
        },
      });
    }
  }

  private traducirError(error: unknown): unknown {
    if (esErrorPrisma(error, 'P2002')) {
      return new ConflictException({
        statusCode: 409,
        message: 'Ya existe un ejercicio con ese nombre.',
        errores: { nombre: 'Ya existe un ejercicio con ese nombre.' },
      });
    }
    if (esErrorPrisma(error, 'P2003')) {
      return new ConflictException(
        'Este ejercicio ya se usa en rutinas o registros de entrenamiento, así que no se puede eliminar. Desactívalo para ocultarlo del catálogo.',
      );
    }
    return error;
  }
}
