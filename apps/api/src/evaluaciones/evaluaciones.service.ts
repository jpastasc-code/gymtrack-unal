import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Evaluacion, Medida, Usuario } from '../generated/prisma/client';
import { normalizar } from '../ejercicios/ejercicios.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearEvaluacionDto } from './evaluaciones.dto';
import { mensajeRango, RANGOS_MEDIDA } from './rangos';

export interface DeportistaResumen {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  correo: string;
}

export interface MedidaVista {
  tipo: Medida['tipo'];
  nombre: string;
  valor: number;
  unidad: string;
}

export interface EvaluacionVista {
  id: string;
  fecha: string;
  pesoKg: number;
  tallaCm: number;
  porcentajeGrasa: number | null;
  /** Índice de masa corporal calculado (kg/m²), con un decimal. */
  imc: number;
  nivelActividad: Evaluacion['nivelActividad'];
  observaciones: string | null;
  instructor: { id: string; nombres: string; apellidos: string };
  medidas: MedidaVista[];
}

type EvaluacionCompleta = Evaluacion & {
  medidas: Medida[];
  instructor: Pick<Usuario, 'id' | 'nombres' | 'apellidos'>;
};

const ORDEN_TIPO = { PERIMETRO: 0, PLIEGUE: 1, TEST_FISICO: 2 } as const;

export function calcularImc(pesoKg: number, tallaCm: number): number {
  const metros = tallaCm / 100;
  return Math.round((pesoKg / (metros * metros)) * 10) / 10;
}

const aResumen = (u: Usuario): DeportistaResumen => ({
  id: u.id,
  nombres: u.nombres,
  apellidos: u.apellidos,
  documento: u.documento,
  correo: u.correo,
});

function aVista(e: EvaluacionCompleta): EvaluacionVista {
  const pesoKg = Number(e.pesoKg);
  const tallaCm = Number(e.tallaCm);
  return {
    id: e.id,
    fecha: e.fecha.toISOString(),
    pesoKg,
    tallaCm,
    porcentajeGrasa:
      e.porcentajeGrasa === null ? null : Number(e.porcentajeGrasa),
    imc: calcularImc(pesoKg, tallaCm),
    nivelActividad: e.nivelActividad,
    observaciones: e.observaciones,
    instructor: {
      id: e.instructor.id,
      nombres: e.instructor.nombres,
      apellidos: e.instructor.apellidos,
    },
    medidas: [...e.medidas]
      .sort((a, b) => ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo])
      .map((m) => ({
        tipo: m.tipo,
        nombre: m.nombre,
        valor: Number(m.valor),
        unidad: m.unidad,
      })),
  };
}

@Injectable()
export class EvaluacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Deportistas activos que coinciden con la búsqueda (máximo 20), por apellido. */
  async buscarDeportistas(q = ''): Promise<DeportistaResumen[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: 'DEPORTISTA', activo: true },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });
    const terminos = normalizar(q).split(' ').filter(Boolean);
    return usuarios
      .filter((u) => {
        const texto = normalizar(
          `${u.nombres} ${u.apellidos} ${u.documento} ${u.correo}`,
        );
        return terminos.every((t) => texto.includes(t));
      })
      .slice(0, 20)
      .map(aResumen);
  }

  async deportista(id: string): Promise<DeportistaResumen> {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || u.rol !== 'DEPORTISTA' || !u.activo) {
      throw new NotFoundException('Ese deportista no existe o no está activo.');
    }
    return aResumen(u);
  }

  /** Evaluaciones del deportista, de la más reciente a la más antigua. */
  async historial(deportistaId: string): Promise<EvaluacionVista[]> {
    await this.deportista(deportistaId);
    const evaluaciones = await this.prisma.evaluacion.findMany({
      where: { usuarioId: deportistaId },
      orderBy: { fecha: 'desc' },
      include: {
        medidas: true,
        instructor: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    return evaluaciones.map(aVista);
  }

  /**
   * Registra una evaluación nueva. Nunca modifica las anteriores: cada toma es
   * una fila con su fecha (GYMM-13).
   */
  async registrar(
    deportistaId: string,
    instructorId: string,
    dto: CrearEvaluacionDto,
    ahora = new Date(),
  ): Promise<EvaluacionVista> {
    await this.deportista(deportistaId);

    const errores: Record<string, string> = {};
    const fecha = dto.fecha ? new Date(dto.fecha) : ahora;
    // Un minuto de tolerancia por diferencias de reloj entre el celular y el servidor.
    if (fecha.getTime() > ahora.getTime() + 60_000) {
      errores.fecha = 'La fecha de la evaluación no puede ser futura.';
    }

    const medidas = dto.medidas ?? [];
    const vistas = new Set<string>();
    medidas.forEach((m, i) => {
      const rangos = RANGOS_MEDIDA[m.tipo];
      const rango = rangos[m.unidad];
      if (!rango) {
        errores[`medidas.${i}.unidad`] =
          `La unidad de "${m.nombre}" debe ser ${Object.keys(rangos).join(', ')}.`;
      } else if (m.valor < rango.min || m.valor > rango.max) {
        errores[`medidas.${i}.valor`] = mensajeRango(
          m.nombre,
          rango.min,
          rango.max,
          m.unidad,
        );
      }
      const clave = `${m.tipo}:${normalizar(m.nombre)}`;
      if (vistas.has(clave)) {
        errores[`medidas.${i}.nombre`] =
          `La medida "${m.nombre}" está repetida.`;
      }
      vistas.add(clave);
    });

    if (Object.keys(errores).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: Object.values(errores).join(' '),
        errores,
      });
    }

    const creada = await this.prisma.evaluacion.create({
      data: {
        usuarioId: deportistaId,
        instructorId,
        fecha,
        pesoKg: dto.pesoKg,
        tallaCm: dto.tallaCm,
        porcentajeGrasa: dto.porcentajeGrasa ?? null,
        nivelActividad: dto.nivelActividad ?? null,
        observaciones: dto.observaciones ?? null,
        medidas: {
          create: medidas.map((m) => ({
            tipo: m.tipo,
            nombre: m.nombre,
            valor: m.valor,
            unidad: m.unidad,
          })),
        },
      },
      include: {
        medidas: true,
        instructor: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    return aVista(creada);
  }
}
