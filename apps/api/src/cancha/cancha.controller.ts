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
  ApiBadRequestResponse,
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
import {
  ActualizarFranjaDto,
  ConsultaDisponibilidadDto,
  CrearFranjaDto,
} from './cancha.dto';
import {
  CanchaService,
  type DisponibilidadSemana,
  type FranjasCancha,
  type FranjaVista,
} from './cancha.service';

/** Quienes definen el horario de la cancha (GYMM-20). */
const GESTORES = ['PERSONAL_DEPORTES', 'ADMIN'] as const;
/** Un id que no es UUID no puede existir: se responde 404 en vez de un error de formato. */
const uuid = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Esa franja no existe.'),
});

@ApiTags('Cancha')
@ApiBearerAuth()
@Controller('cancha')
export class CanchaController {
  constructor(private readonly cancha: CanchaService) {}

  @Get('disponibilidad')
  @ApiOperation({
    summary: 'Disponibilidad semanal de la cancha sintética',
    description:
      'Cualquier usuario con sesión. Devuelve los 7 días (lunes a domingo, hora de Colombia) con cada franja habilitada y su estado: DISPONIBLE, RESERVADA o PASADA (ya empezó).',
  })
  @ApiOkResponse({ description: 'La semana pedida, día por día.' })
  @ApiNotFoundResponse({ description: 'No hay una cancha habilitada.' })
  disponibilidad(
    @Query() consulta: ConsultaDisponibilidadDto,
  ): Promise<DisponibilidadSemana> {
    return this.cancha.disponibilidad(consulta.semana);
  }

  @Get('franjas')
  @Roles(...GESTORES)
  @ApiOperation({
    summary: 'Franjas semanales de la cancha (personal de deportes)',
    description: 'Incluye las deshabilitadas.',
  })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  listarFranjas(): Promise<FranjasCancha> {
    return this.cancha.listarFranjas();
  }

  @Post('franjas')
  @Roles(...GESTORES)
  @ApiOperation({
    summary: 'Habilitar una franja semanal (personal de deportes)',
  })
  @ApiCreatedResponse({ description: 'Franja creada y habilitada.' })
  @ApiBadRequestResponse({
    description: 'Datos no válidos o la hora de fin no es posterior.',
  })
  @ApiConflictResponse({
    description: 'Se cruza con otra franja del mismo día.',
  })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  crearFranja(@Body() dto: CrearFranjaDto): Promise<FranjaVista> {
    return this.cancha.crearFranja(dto);
  }

  @Patch('franjas/:id')
  @Roles(...GESTORES)
  @ApiOperation({
    summary:
      'Deshabilitar o volver a habilitar una franja (personal de deportes)',
  })
  @ApiNotFoundResponse({ description: 'La franja no existe.' })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  actualizarFranja(
    @Param('id', uuid) id: string,
    @Body() dto: ActualizarFranjaDto,
  ): Promise<FranjaVista> {
    return this.cancha.actualizarFranja(id, dto);
  }

  @Delete('franjas/:id')
  @HttpCode(204)
  @Roles(...GESTORES)
  @ApiOperation({
    summary: 'Eliminar una franja (personal de deportes)',
    description: 'Las reservas ya hechas en ese horario se conservan.',
  })
  @ApiNoContentResponse({ description: 'Eliminada.' })
  @ApiNotFoundResponse({ description: 'La franja no existe.' })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  eliminarFranja(@Param('id', uuid) id: string): Promise<void> {
    return this.cancha.eliminarFranja(id);
  }
}
