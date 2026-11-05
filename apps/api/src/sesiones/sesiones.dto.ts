import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Matches, Max, Min } from 'class-validator';
import { UUID } from '../rutinas/rutinas.dto';

/** Carga máxima que se acepta por serie, en kilogramos. */
export const MAX_CARGA_KG = 500;
/** Repeticiones máximas que se aceptan por serie. */
export const MAX_REPETICIONES = 100;

/**
 * Serie hecha en el gimnasio (GYMM-26). Registrar otra vez la misma serie
 * (mismo ejercicio y número) la corrige: así un reintento sin señal no la duplica.
 */
export class RegistrarSerieDto {
  @ApiProperty({ format: 'uuid', description: 'Ejercicio de la rutina.' })
  @Matches(UUID, { message: 'Elige un ejercicio de tu rutina.' })
  ejercicioId: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 20 })
  @IsInt({ message: 'El número de serie debe ser un número entero.' })
  @Min(1, { message: 'El número de serie debe estar entre 1 y 20.' })
  @Max(20, { message: 'El número de serie debe estar entre 1 y 20.' })
  numeroSerie: number;

  @ApiProperty({ example: 42.5, minimum: 0, maximum: MAX_CARGA_KG })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La carga debe ser un número con máximo 2 decimales.' },
  )
  @Min(0, { message: `La carga debe estar entre 0 y ${MAX_CARGA_KG} kg.` })
  @Max(MAX_CARGA_KG, {
    message: `La carga debe estar entre 0 y ${MAX_CARGA_KG} kg.`,
  })
  cargaKg: number;

  @ApiProperty({ example: 10, minimum: 0, maximum: MAX_REPETICIONES })
  @IsInt({ message: 'Las repeticiones deben ser un número entero.' })
  @Min(0, {
    message: `Las repeticiones deben estar entre 0 y ${MAX_REPETICIONES}.`,
  })
  @Max(MAX_REPETICIONES, {
    message: `Las repeticiones deben estar entre 0 y ${MAX_REPETICIONES}.`,
  })
  repeticiones: number;
}
