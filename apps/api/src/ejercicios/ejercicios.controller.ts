import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/auth.decorators';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import {
  ActualizarEjercicioDto,
  CrearEjercicioDto,
  FiltroEjerciciosDto,
} from './ejercicios.dto';
import { EjerciciosService, type EjercicioVista } from './ejercicios.service';

const EDITORES = ['INSTRUCTOR', 'ADMIN'] as const;
/** Un id que no es UUID no puede existir: se responde 404 en vez de un error de formato. */
const uuid = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Ese ejercicio no existe.'),
});

@ApiTags('Ejercicios')
@ApiBearerAuth()
@Controller('ejercicios')
export class EjerciciosController {
  constructor(private readonly ejercicios: EjerciciosService) {}

  @Get()
  @ApiOperation({
    summary: 'Catálogo de ejercicios',
    description:
      'Cualquier usuario con sesión puede consultarlo. Búsqueda por texto (sin importar tildes) y filtro por grupo muscular.',
  })
  @ApiOkResponse({ description: 'Ejercicios ordenados por nombre.' })
  listar(
    @Query() filtro: FiltroEjerciciosDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<EjercicioVista[]> {
    return this.ejercicios.listar(
      filtro,
      (EDITORES as readonly string[]).includes(usuario.rol),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un ejercicio' })
  @ApiNotFoundResponse({ description: 'El ejercicio no existe.' })
  obtener(@Param('id', uuid) id: string): Promise<EjercicioVista> {
    return this.ejercicios.obtener(id);
  }

  @Post()
  @Roles(...EDITORES)
  @ApiOperation({ summary: 'Agregar un ejercicio (instructores)' })
  @ApiCreatedResponse({ description: 'Ejercicio creado.' })
  @ApiConflictResponse({
    description: 'Ya existe un ejercicio con ese nombre.',
  })
  @ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
  crear(
    @Body() dto: CrearEjercicioDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<EjercicioVista> {
    return this.ejercicios.crear(dto, usuario.id);
  }

  @Patch(':id')
  @Roles(...EDITORES)
  @ApiOperation({
    summary: 'Editar, desactivar o reactivar un ejercicio (instructores)',
  })
  @ApiConflictResponse({
    description: 'Ya existe un ejercicio con ese nombre.',
  })
  @ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
  actualizar(
    @Param('id', uuid) id: string,
    @Body() dto: ActualizarEjercicioDto,
  ): Promise<EjercicioVista> {
    return this.ejercicios.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...EDITORES)
  @ApiOperation({
    summary: 'Eliminar un ejercicio que nadie usa (instructores)',
    description:
      'Si el ejercicio está en alguna rutina o registro, responde 409: en ese caso se desactiva con PATCH { activo: false }.',
  })
  @ApiNoContentResponse({ description: 'Eliminado.' })
  @ApiConflictResponse({ description: 'El ejercicio está en uso.' })
  @ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
  eliminar(@Param('id', uuid) id: string): Promise<void> {
    return this.ejercicios.eliminar(id);
  }
}
