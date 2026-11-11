import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';

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
