import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const GRUPOS_MUSCULARES = [
  'PECHO',
  'ESPALDA',
  'HOMBROS',
  'BICEPS',
  'TRICEPS',
  'ANTEBRAZOS',
  'CUADRICEPS',
  'ISQUIOTIBIALES',
  'GLUTEOS',
  'PANTORRILLAS',
  'ABDOMEN',
  'CUERPO_COMPLETO',
  'CARDIO',
] as const;
export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number];

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const vacioANulo = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class CrearEjercicioDto {
  @ApiProperty({ example: 'Sentadilla búlgara', minLength: 3, maxLength: 100 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El nombre puede tener máximo 100 caracteres.' })
  nombre: string;

  @ApiProperty({ enum: GRUPOS_MUSCULARES })
  @IsIn(GRUPOS_MUSCULARES, { message: 'Elige un grupo muscular de la lista.' })
  grupoMuscular: GrupoMuscular;

  @ApiPropertyOptional({
    example:
      'Un pie atrás sobre un banco; baja la rodilla trasera hacia el piso.',
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(vacioANulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(1000, {
    message: 'La descripción puede tener máximo 1000 caracteres.',
  })
  descripcion?: string | null;
}

export class ActualizarEjercicioDto extends PartialType(CrearEjercicioDto) {
  @ApiPropertyOptional({
    description:
      'false oculta el ejercicio del catálogo sin borrarlo (sigue en las rutinas y el histórico).',
  })
  @ValidateIf((o: ActualizarEjercicioDto) => o.activo !== undefined)
  @IsBoolean({ message: 'activo debe ser true o false.' })
  activo?: boolean;
}

export class FiltroEjerciciosDto {
  @ApiPropertyOptional({
    description:
      'Texto a buscar en nombre y descripción (sin importar tildes ni mayúsculas).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La búsqueda puede tener máximo 100 caracteres.' })
  q?: string;

  @ApiPropertyOptional({ enum: GRUPOS_MUSCULARES })
  @IsOptional()
  @IsIn(GRUPOS_MUSCULARES, { message: 'El grupo muscular no es válido.' })
  grupo?: GrupoMuscular;

  @ApiPropertyOptional({
    description: 'Solo instructores: incluir ejercicios desactivados.',
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  incluirInactivos?: boolean;
}
