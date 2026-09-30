import { BadRequestException, Injectable } from '@nestjs/common';
import type { Usuario } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ActualizarPerfilDto } from './actualizar-perfil.dto';

export interface Perfil {
  id: string;
  documento: string;
  correo: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  /** AAAA-MM-DD */
  fechaNacimiento: string | null;
  sexo: Usuario['sexo'];
  objetivo: Usuario['objetivo'];
  nivelActividad: Usuario['nivelActividad'];
  rol: Usuario['rol'];
}

const EDAD_MINIMA = 12;
const EDAD_MAXIMA = 100;

export function aPerfil(u: Usuario): Perfil {
  return {
    id: u.id,
    documento: u.documento,
    correo: u.correo,
    nombres: u.nombres,
    apellidos: u.apellidos,
    telefono: u.telefono,
    fechaNacimiento: u.fechaNacimiento
      ? u.fechaNacimiento.toISOString().slice(0, 10)
      : null,
    sexo: u.sexo,
    objetivo: u.objetivo,
    nivelActividad: u.nivelActividad,
    rol: u.rol,
  };
}

/** Edad cumplida en años a la fecha `hoy`. */
export function calcularEdad(nacimiento: Date, hoy: Date): number {
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
}

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  async actualizar(
    id: string,
    dto: ActualizarPerfilDto,
    hoy = new Date(),
  ): Promise<Perfil> {
    let fechaNacimiento: Date | null | undefined = undefined;
    if (dto.fechaNacimiento === null) fechaNacimiento = null;
    if (typeof dto.fechaNacimiento === 'string') {
      fechaNacimiento = new Date(`${dto.fechaNacimiento}T00:00:00Z`);
      const edad = calcularEdad(fechaNacimiento, hoy);
      if (edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
        throw new BadRequestException({
          statusCode: 400,
          message: `La fecha de nacimiento debe corresponder a una edad entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} años.`,
          errores: {
            fechaNacimiento: `Revisa la fecha: debe corresponder a una edad entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} años.`,
          },
        });
      }
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        telefono: dto.telefono,
        fechaNacimiento,
        sexo: dto.sexo,
        objetivo: dto.objetivo,
        nivelActividad: dto.nivelActividad,
      },
    });
    return aPerfil(actualizado);
  }
}
