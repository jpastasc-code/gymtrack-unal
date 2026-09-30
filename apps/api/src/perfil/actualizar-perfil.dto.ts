import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmpty,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const SEXOS = ['MASCULINO', 'FEMENINO'] as const;
export const OBJETIVOS = [
  'MANTENER',
  'GANAR_MASA_MUSCULAR',
  'PERDER_GRASA',
] as const;
export const NIVELES_ACTIVIDAD = [
  'SEDENTARIO',
  'LIGERO',
  'MODERADO',
  'ALTO',
  'MUY_ALTO',
] as const;

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const vacioANulo = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : recortar({ value });

/**
 * Datos que el usuario puede cambiar de su propio perfil (GYMM-11).
 * Todos son opcionales: solo se actualiza lo que llega. Los datos institucionales
 * (documento, correo) y el rol no se pueden cambiar desde aquí.
 */
export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: 'Daniela', maxLength: 100 })
  @ValidateIf((o: ActualizarPerfilDto) => o.nombres !== undefined)
  @Transform(recortar)
  @IsString({ message: 'Los nombres deben ser texto.' })
  @MinLength(1, { message: 'Escribe tus nombres.' })
  @MaxLength(100, {
    message: 'Los nombres pueden tener máximo 100 caracteres.',
  })
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez', maxLength: 100 })
  @ValidateIf((o: ActualizarPerfilDto) => o.apellidos !== undefined)
  @Transform(recortar)
  @IsString({ message: 'Los apellidos deben ser texto.' })
  @MinLength(1, { message: 'Escribe tus apellidos.' })
  @MaxLength(100, {
    message: 'Los apellidos pueden tener máximo 100 caracteres.',
  })
  apellidos?: string;

  @ApiPropertyOptional({
    example: '+57 300 123 4567',
    nullable: true,
    description: 'Vacío o null lo borra.',
  })
  @IsOptional()
  @Transform(vacioANulo)
  @Matches(/^\+?[0-9 ]{7,20}$/, {
    message:
      'El teléfono solo puede tener números, espacios y un + inicial (de 7 a 20 caracteres).',
  })
  telefono?: string | null;

  @ApiPropertyOptional({
    example: '2003-05-14',
    nullable: true,
    description: 'Fecha en formato AAAA-MM-DD.',
  })
  @IsOptional()
  @Transform(vacioANulo)
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'La fecha de nacimiento no es válida.' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
  })
  fechaNacimiento?: string | null;

  @ApiPropertyOptional({ enum: SEXOS, nullable: true })
  @IsOptional()
  @IsIn(SEXOS, { message: 'El sexo debe ser MASCULINO o FEMENINO.' })
  sexo?: (typeof SEXOS)[number] | null;

  @ApiPropertyOptional({ enum: OBJETIVOS, nullable: true })
  @IsOptional()
  @IsIn(OBJETIVOS, {
    message:
      'El objetivo debe ser mantener, ganar masa muscular o perder grasa.',
  })
  objetivo?: (typeof OBJETIVOS)[number] | null;

  @ApiPropertyOptional({ enum: NIVELES_ACTIVIDAD, nullable: true })
  @IsOptional()
  @IsIn(NIVELES_ACTIVIDAD, { message: 'El nivel de actividad no es válido.' })
  nivelActividad?: (typeof NIVELES_ACTIVIDAD)[number] | null;

  // Campos que existen en el perfil pero NO se pueden editar desde aquí.
  @IsEmpty({
    message: 'El documento es un dato institucional y no se puede editar.',
  })
  documento?: never;

  @IsEmpty({
    message: 'El correo es un dato institucional y no se puede editar.',
  })
  correo?: never;

  @IsEmpty({ message: 'El rol no se puede cambiar desde el perfil.' })
  rol?: never;
}
