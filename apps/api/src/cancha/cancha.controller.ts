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
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import {
  ActualizarFranjaDto,
  ConsultaDisponibilidadDto,
  CrearFranjaDto,
  CrearReservaDto,
} from './cancha.dto';
import {
  CanchaService,
  GESTORES_CANCHA,
  type DisponibilidadSemana,
  type FranjasCancha,
  type FranjaVista,
  type ReservaVista,
} from './cancha.service';

/** Un id que no es UUID no puede existir: se responde 404 en vez de un error de formato. */
const uuid = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Esa franja no existe.'),
});
const uuidReserva = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Esa reserva no existe.'),
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
      'Cualquier usuario con sesión. Devuelve los 7 días (lunes a domingo, hora de Colombia) con cada franja habilitada y su estado: DISPONIBLE, RESERVADA (por otra persona), TUYA (la reservaste tú) o PASADA (ya empezó).',
  })
  @ApiOkResponse({ description: 'La semana pedida, día por día.' })
  @ApiNotFoundResponse({ description: 'No hay una cancha habilitada.' })
  disponibilidad(
    @Query() consulta: ConsultaDisponibilidadDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<DisponibilidadSemana> {
    return this.cancha.disponibilidad(consulta.semana, new Date(), usuario.id);
  }

  @Post('reservas')
  @ApiOperation({
    summary: 'Reservar una franja de la cancha',
    description:
      'Cualquier usuario con sesión. La reserva queda a su nombre y confirmada. Si dos personas reservan la misma franja al mismo tiempo, la base de datos solo acepta una.',
  })
  @ApiCreatedResponse({ description: 'Reserva confirmada.' })
  @ApiBadRequestResponse({
    description: 'Datos no válidos o la franja no es de ese día.',
  })
  @ApiNotFoundResponse({ description: 'La franja no existe.' })
  @ApiConflictResponse({
    description: 'La franja ya está reservada, ya empezó o está deshabilitada.',
  })
  reservar(
    @Body() dto: CrearReservaDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<ReservaVista> {
    return this.cancha.reservar(usuario.id, dto);
  }

  @Post('reservas/:id/cancelar')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancelar una reserva de la cancha',
    description:
      'Quien hizo la reserva o el personal de deportes, antes de que empiece. La franja queda libre de inmediato. Cancelar una reserva ya cancelada no es un error.',
  })
  @ApiNoContentResponse({ description: 'Cancelada.' })
  @ApiNotFoundResponse({ description: 'La reserva no existe.' })
  @ApiForbiddenResponse({
    description: 'No es tu reserva y no eres personal de deportes.',
  })
  @ApiConflictResponse({ description: 'La reserva ya empezó.' })
  cancelarReserva(
    @Param('id', uuidReserva) id: string,
    @UsuarioActual() usuario: Usuario,
  ): Promise<void> {
    return this.cancha.cancelarReserva(id, usuario);
  }

  @Get('reservas/mias')
  @ApiOperation({
    summary: 'Mis reservas activas de la cancha',
    description:
      'Reservas confirmadas que todavía no terminan, de la más próxima a la más lejana.',
  })
  @ApiOkResponse({ description: 'Puede ser una lista vacía.' })
  misReservas(@UsuarioActual() usuario: Usuario): Promise<ReservaVista[]> {
    return this.cancha.misReservas(usuario.id);
  }

  @Get('franjas')
  @Roles(...GESTORES_CANCHA)
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
  @Roles(...GESTORES_CANCHA)
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
  @Roles(...GESTORES_CANCHA)
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
  @Roles(...GESTORES_CANCHA)
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
