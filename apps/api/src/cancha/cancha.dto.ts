import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { esFechaValida } from './cancha.horario';

/** Hora del día en 24 h: "06:00", "14:30", "23:59". */
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

@ValidatorConstraint({ name: 'fechaCalendario' })
class FechaCalendario implements ValidatorConstraintInterface {
  validate(valor: unknown) {
    return typeof valor === 'string' && esFechaValida(valor);
  }
  defaultMessage() {
    return 'La semana debe ser una fecha con formato AAAA-MM-DD.';
  }
}

export class ConsultaDisponibilidadDto {
  @ApiPropertyOptional({
    example: '2026-10-21',
    description:
      'Cualquier día de la semana que se quiere ver (hora de Colombia). Por defecto, la semana actual.',
  })
  @IsOptional()
  @Validate(FechaCalendario)
  semana?: string;
}

/** Franja semanal habilitada para reservar la cancha (GYMM-20). */
export class CrearFranjaDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 7,
    description: '1 = lunes … 7 = domingo.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Elige un día de la semana.' })
  @Min(1, { message: 'Elige un día de la semana.' })
  @Max(7, { message: 'Elige un día de la semana.' })
  diaSemana: number;

  @ApiProperty({ example: '14:00', description: 'Hora de Colombia, 24 h.' })
  @Matches(HORA, { message: 'La hora de inicio debe tener el formato HH:MM.' })
  horaInicio: string;

  @ApiProperty({ example: '15:00', description: 'Hora de Colombia, 24 h.' })
  @Matches(HORA, { message: 'La hora de fin debe tener el formato HH:MM.' })
  horaFin: string;
}

/** Reserva de una franja de la cancha en una fecha concreta (GYMM-28). */
export class CrearReservaDto {
  @ApiProperty({ description: 'Id de la franja que se quiere reservar.' })
  @IsUUID('all', { message: 'Elige una franja.' })
  franjaId: string;

  @ApiProperty({
    example: '2026-10-28',
    description: 'Día de la reserva (hora de Colombia).',
  })
  @Validate(FechaCalendario, {
    message: 'La fecha debe tener el formato AAAA-MM-DD.',
  })
  fecha: string;
}

export class ActualizarFranjaDto {
  @ApiProperty({
    description:
      'false deshabilita la franja (deja de verse en la disponibilidad) sin borrarla.',
  })
  @IsBoolean({ message: 'activa debe ser true o false.' })
  activa: boolean;
}
