import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  calcularRequerimientoCalorico,
  datosFaltantes,
  type DatoFaltante,
  type DatosRequerimiento,
  type RequerimientoCalorico,
} from '@gymtrack/shared';
import type { Usuario } from '../generated/prisma/client';
import { calcularEdad } from '../perfil/perfil.service';
import { PrismaService } from '../prisma/prisma.service';

/** Respuesta de GET /api/perfil/requerimiento-calorico. */
export interface MiRequerimiento extends RequerimientoCalorico {
  /** Los datos con los que se calculó, para mostrarlos en la pantalla. */
  datos: DatosRequerimiento & {
    /** Fecha de la evaluación de la que salen peso, talla y % de grasa. */
    fechaEvaluacion: string;
  };
}

@Injectable()
export class NutricionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Requerimiento calórico del usuario (GYMM-25, DT-07). Peso, talla y % de grasa salen de su
   * evaluación más reciente; edad, sexo, objetivo y nivel de actividad, de su perfil. Si el
   * perfil aún no tiene nivel de actividad, se usa el que anotó el instructor en la evaluación.
   * Si falta algún dato responde 422 con la lista `faltantes`, en lugar de adivinarlo.
   */
  async miRequerimiento(
    usuario: Usuario,
    hoy = new Date(),
  ): Promise<MiRequerimiento> {
    const evaluacion = await this.prisma.evaluacion.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { fecha: 'desc' },
      select: {
        fecha: true,
        pesoKg: true,
        tallaCm: true,
        porcentajeGrasa: true,
        nivelActividad: true,
      },
    });

    const datos: DatosRequerimiento = {
      pesoKg: evaluacion ? Number(evaluacion.pesoKg) : null,
      tallaCm: evaluacion ? Number(evaluacion.tallaCm) : null,
      porcentajeGrasa:
        evaluacion?.porcentajeGrasa != null
          ? Number(evaluacion.porcentajeGrasa)
          : null,
      edad: usuario.fechaNacimiento
        ? calcularEdad(usuario.fechaNacimiento, hoy)
        : null,
      sexo: usuario.sexo,
      nivelActividad:
        usuario.nivelActividad ?? evaluacion?.nivelActividad ?? null,
      objetivo: usuario.objetivo,
    };

    const faltantes = datosFaltantes(datos);
    if (!evaluacion || faltantes.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: mensajeFaltantes(faltantes),
        faltantes,
      });
    }

    return {
      ...calcularRequerimientoCalorico(datos),
      datos: { ...datos, fechaEvaluacion: evaluacion.fecha.toISOString() },
    };
  }
}

const NOMBRE_DATO: Record<DatoFaltante, string> = {
  pesoKg: 'tu peso',
  tallaCm: 'tu talla',
  edad: 'tu fecha de nacimiento',
  sexo: 'tu sexo',
  nivelActividad: 'tu nivel de actividad',
  objetivo: 'tu objetivo',
};

function mensajeFaltantes(faltantes: DatoFaltante[]): string {
  const nombres = faltantes.map((f) => NOMBRE_DATO[f]);
  const lista =
    nombres.length > 1
      ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
      : nombres[0];
  const verbo = nombres.length > 1 ? 'faltan' : 'falta';
  return `Para calcular tu requerimiento calórico ${verbo} ${lista}.`;
}
