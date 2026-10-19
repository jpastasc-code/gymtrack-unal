import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const METODOS = [
  'TRADICIONAL',
  'PIRAMIDE',
  'PIRAMIDE_INVERSA',
  'SERIES_DESCENDENTES',
  'SUPERSERIE',
  'CIRCUITO',
] as const;
export type Metodo = (typeof METODOS)[number];

/** Cualquier UUID que acepte PostgreSQL (sin exigir versión ni variante). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Una rutina se reparte en máximo 7 días (Día 1 … Día 7). */
export const MAX_DIAS = 7;

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const textoOpcional = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const vacioANulo = ({ value }: { value: unknown }) =>
  value === '' ? null : value;

export class EjercicioRutinaDto {
  @ApiProperty({ format: 'uuid', description: 'Ejercicio del catálogo.' })
  @Matches(UUID, { message: 'Elige un ejercicio del catálogo.' })
  ejercicioId: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_DIAS })
  @IsInt({ message: 'El día debe ser un número entero.' })
  @Min(1, { message: `El día debe estar entre 1 y ${MAX_DIAS}.` })
  @Max(MAX_DIAS, { message: `El día debe estar entre 1 y ${MAX_DIAS}.` })
  dia: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 20 })
  @IsInt({ message: 'Las series deben ser un número entero.' })
  @Min(1, { message: 'Las series deben estar entre 1 y 20.' })
  @Max(20, { message: 'Las series deben estar entre 1 y 20.' })
  series: number;

  @ApiProperty({
    example: '10-12',
    maxLength: 30,
    description: 'Texto libre: "12", "10-12", "12-10-8" (pirámide) o "45 s".',
  })
  @Transform(recortar)
  @IsString({ message: 'Las repeticiones deben ser texto.' })
  @MinLength(1, { message: 'Indica las repeticiones objetivo.' })
  @MaxLength(30, {
    message: 'Las repeticiones pueden tener máximo 30 caracteres.',
  })
  repeticionesObjetivo: string;

  @ApiProperty({ enum: METODOS, example: 'TRADICIONAL' })
  @IsIn(METODOS, { message: 'Elige un método de la lista.' })
  metodo: Metodo;

  @ApiPropertyOptional({
    example: 60,
    minimum: 0,
    maximum: 600,
    nullable: true,
  })
  @IsOptional()
  @Transform(vacioANulo)
  @IsInt({ message: 'El descanso debe ser un número entero de segundos.' })
  @Min(0, { message: 'El descanso debe estar entre 0 y 600 segundos.' })
  @Max(600, { message: 'El descanso debe estar entre 0 y 600 segundos.' })
  descansoSegundos?: number | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @Transform(textoOpcional)
  @IsString({ message: 'Las notas deben ser texto.' })
  @MaxLength(300, { message: 'Las notas pueden tener máximo 300 caracteres.' })
  notas?: string | null;
}

/**
 * Rutina que el instructor arma y asigna a un deportista (GYMM-21). El orden de
 * `ejercicios` es el orden en que se hacen; `dia` los reparte en días.
 */
export class CrearRutinaDto {
  @ApiProperty({ example: 'Fase 1 – 3 días', minLength: 3, maxLength: 100 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El nombre puede tener máximo 100 caracteres.' })
  nombre: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @Transform(textoOpcional)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(1000, {
    message: 'La descripción puede tener máximo 1000 caracteres.',
  })
  descripcion?: string | null;

  @ApiProperty({ type: [EjercicioRutinaDto] })
  @IsArray({ message: 'Los ejercicios deben ser una lista.' })
  @ArrayMinSize(1, { message: 'Agrega al menos un ejercicio a la rutina.' })
  @ArrayMaxSize(80, { message: 'Máximo 80 ejercicios por rutina.' })
  @ValidateNested({ each: true })
  @Type(() => EjercicioRutinaDto)
  ejercicios: EjercicioRutinaDto[];
}
