import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NIVELES_ACTIVIDAD } from '../perfil/actualizar-perfil.dto';
import {
  mensajeRango,
  RANGOS_BASICOS,
  TIPOS_MEDIDA,
  UNIDADES,
  type TipoMedida,
} from './rangos';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const vacioANulo = ({ value }: { value: unknown }) =>
  value === '' ? null : value;
const decimal = (nombre: string) => ({
  message: `${nombre} debe ser un número con máximo 2 decimales.`,
});

export class MedidaDto {
  @ApiProperty({ enum: TIPOS_MEDIDA })
  @IsIn(TIPOS_MEDIDA, { message: 'El tipo de medida no es válido.' })
  tipo: TipoMedida;

  @ApiProperty({ example: 'Cintura', maxLength: 60 })
  @Transform(recortar)
  @IsString({ message: 'El nombre de la medida debe ser texto.' })
  @MinLength(2, { message: 'Escribe el nombre de la medida.' })
  @MaxLength(60, {
    message: 'El nombre de la medida puede tener máximo 60 caracteres.',
  })
  nombre: string;

  @ApiProperty({ example: 72 })
  @IsNumber({ maxDecimalPlaces: 2 }, decimal('El valor'))
  valor: number;

  @ApiProperty({ enum: UNIDADES, example: 'cm' })
  @IsIn(UNIDADES, { message: 'La unidad no es válida.' })
  unidad: string;
}

/** Evaluación física registrada por un instructor (GYMM-13). */
export class CrearEvaluacionDto {
  @ApiPropertyOptional({
    example: '2026-09-29T15:00:00-05:00',
    description:
      'Momento de la evaluación. Por defecto, ahora. No puede ser futura.',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha de la evaluación no es válida.' })
  fecha?: string;

  @ApiProperty({ example: 62.5, minimum: 20, maximum: 350 })
  @IsNumber({ maxDecimalPlaces: 2 }, decimal('El peso'))
  @Min(RANGOS_BASICOS.pesoKg.min, {
    message: mensajeRango(
      'El peso',
      RANGOS_BASICOS.pesoKg.min,
      RANGOS_BASICOS.pesoKg.max,
      'kg',
    ),
  })
  @Max(RANGOS_BASICOS.pesoKg.max, {
    message: mensajeRango(
      'El peso',
      RANGOS_BASICOS.pesoKg.min,
      RANGOS_BASICOS.pesoKg.max,
      'kg',
    ),
  })
  pesoKg: number;

  @ApiProperty({ example: 165, minimum: 100, maximum: 250 })
  @IsNumber({ maxDecimalPlaces: 2 }, decimal('La talla'))
  @Min(RANGOS_BASICOS.tallaCm.min, {
    message: mensajeRango(
      'La talla',
      RANGOS_BASICOS.tallaCm.min,
      RANGOS_BASICOS.tallaCm.max,
      'cm',
    ),
  })
  @Max(RANGOS_BASICOS.tallaCm.max, {
    message: mensajeRango(
      'La talla',
      RANGOS_BASICOS.tallaCm.min,
      RANGOS_BASICOS.tallaCm.max,
      'cm',
    ),
  })
  tallaCm: number;

  @ApiPropertyOptional({
    example: 24.5,
    minimum: 2,
    maximum: 70,
    nullable: true,
  })
  @IsOptional()
  @Transform(vacioANulo)
  @IsNumber({ maxDecimalPlaces: 2 }, decimal('El porcentaje de grasa'))
  @Min(RANGOS_BASICOS.porcentajeGrasa.min, {
    message: mensajeRango(
      'El porcentaje de grasa',
      RANGOS_BASICOS.porcentajeGrasa.min,
      RANGOS_BASICOS.porcentajeGrasa.max,
      '%',
    ),
  })
  @Max(RANGOS_BASICOS.porcentajeGrasa.max, {
    message: mensajeRango(
      'El porcentaje de grasa',
      RANGOS_BASICOS.porcentajeGrasa.min,
      RANGOS_BASICOS.porcentajeGrasa.max,
      '%',
    ),
  })
  porcentajeGrasa?: number | null;

  @ApiPropertyOptional({ enum: NIVELES_ACTIVIDAD, nullable: true })
  @IsOptional()
  @IsIn(NIVELES_ACTIVIDAD, { message: 'El nivel de actividad no es válido.' })
  nivelActividad?: (typeof NIVELES_ACTIVIDAD)[number] | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  )
  @IsString({ message: 'Las observaciones deben ser texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones pueden tener máximo 1000 caracteres.',
  })
  observaciones?: string | null;

  @ApiPropertyOptional({
    type: [MedidaDto],
    description: 'Perímetros, pliegues y resultados de tests físicos.',
  })
  @IsOptional()
  @IsArray({ message: 'Las medidas deben ser una lista.' })
  @ArrayMaxSize(40, { message: 'Máximo 40 medidas por evaluación.' })
  @ValidateNested({ each: true })
  @Type(() => MedidaDto)
  medidas?: MedidaDto[];
}

export class BuscarDeportistasDto {
  @ApiPropertyOptional({
    description: 'Nombre, apellido, documento o correo (sin importar tildes).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La búsqueda puede tener máximo 100 caracteres.' })
  q?: string;
}
