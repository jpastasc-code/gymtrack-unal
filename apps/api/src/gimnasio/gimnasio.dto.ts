import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** Cupo máximo que se acepta por franja. */
export const MAX_CUPO = 200;

/** Reserva de un cupo en una franja del gimnasio para una fecha (GYMM-27). */
export class CrearReservaGimnasioDto {
  @ApiProperty({ description: 'Id de la franja que se quiere reservar.' })
  @IsUUID('all', { message: 'Elige una franja.' })
  franjaId: string;

  @ApiProperty({
    example: '2026-11-12',
    description: 'Día de la reserva (hora de Colombia).',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato AAAA-MM-DD.',
  })
  fecha: string;
}

/** Cambios a una franja del gimnasio (personal de deportes). */
export class ActualizarFranjaGimnasioDto {
  @ApiPropertyOptional({ example: 30, minimum: 1, maximum: MAX_CUPO })
  @IsOptional()
  @IsInt({ message: 'El cupo debe ser un número entero.' })
  @Min(1, { message: `El cupo debe estar entre 1 y ${MAX_CUPO} personas.` })
  @Max(MAX_CUPO, {
    message: `El cupo debe estar entre 1 y ${MAX_CUPO} personas.`,
  })
  cupoMaximo?: number;

  @ApiPropertyOptional({
    description:
      'false deshabilita la franja: deja de verse para reservar, sin borrarla.',
  })
  @IsOptional()
  @IsBoolean({ message: 'activa debe ser true o false.' })
  activa?: boolean;
}
