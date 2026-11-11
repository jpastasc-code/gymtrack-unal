import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  ActualizarFranjaGimnasioDto,
  CrearReservaGimnasioDto,
} from './gimnasio.dto';
import {
  GESTORES_GIMNASIO,
  GimnasioService,
  type DisponibilidadGimnasio,
  type FranjaGimnasioVista,
  type ReservaGimnasioVista,
} from './gimnasio.service';

const uuidFranja = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Esa franja no existe.'),
});
const uuidReserva = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Esa reserva no existe.'),
});

/** Reserva de cupo por franja horaria en el gimnasio (GYMM-27). */
@ApiTags('Gimnasio')
@ApiBearerAuth()
@Controller('gimnasio')
export class GimnasioController {
  constructor(private readonly gimnasio: GimnasioService) {}

  @Get('disponibilidad')
  @ApiOperation({
    summary: 'Cupos del gimnasio de hoy y los próximos días',
    description:
      'Cada franja habilitada con su cupo máximo, los cupos libres y su estado para quien consulta: DISPONIBLE, LLENA, TUYA (ya tienes cupo) o PASADA (ya terminó). Horas de Colombia.',
  })
  @ApiOkResponse({ description: 'Hoy y los 6 días siguientes.' })
  disponibilidad(
    @UsuarioActual() usuario: Usuario,
  ): Promise<DisponibilidadGimnasio> {
    return this.gimnasio.disponibilidad(usuario.id);
  }

  @Post('reservas')
  @ApiOperation({
    summary: 'Reservar un cupo en una franja',
    description:
      'Se puede reservar desde hoy hasta 6 días adelante, mientras la franja no haya terminado y queden cupos.',
  })
  @ApiCreatedResponse({ description: 'Cupo reservado.' })
  @ApiBadRequestResponse({
    description:
      'Fecha no válida, fuera de plazo o la franja no es de ese día.',
  })
  @ApiNotFoundResponse({
    description: 'La franja no existe o está deshabilitada.',
  })
  @ApiConflictResponse({
    description:
      'La franja está llena, ya terminó o ya tienes un cupo en ella.',
  })
  reservar(
    @Body() dto: CrearReservaGimnasioDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<ReservaGimnasioVista> {
    return this.gimnasio.reservar(usuario.id, dto);
  }

  @Get('reservas/mias')
  @ApiOperation({
    summary: 'Mis reservas de cupo que todavía no terminan',
  })
  @ApiOkResponse({ description: 'Puede ser una lista vacía.' })
  misReservas(
    @UsuarioActual() usuario: Usuario,
  ): Promise<ReservaGimnasioVista[]> {
    return this.gimnasio.misReservas(usuario.id);
  }

  @Post('reservas/:id/cancelar')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancelar una reserva de cupo',
    description:
      'Quien la hizo o el personal de deportes, antes de que empiece la franja. El cupo queda libre de inmediato.',
  })
  @ApiNoContentResponse({ description: 'Cancelada.' })
  @ApiNotFoundResponse({ description: 'La reserva no existe.' })
  @ApiForbiddenResponse({
    description: 'No es tu reserva y no eres personal de deportes.',
  })
  @ApiConflictResponse({ description: 'La franja ya empezó.' })
  cancelar(
    @Param('id', uuidReserva) id: string,
    @UsuarioActual() usuario: Usuario,
  ): Promise<void> {
    return this.gimnasio.cancelar(id, usuario);
  }

  @Get('franjas')
  @Roles(...GESTORES_GIMNASIO)
  @ApiOperation({
    summary: 'Franjas del gimnasio con su cupo (personal de deportes)',
    description: 'Incluye las deshabilitadas.',
  })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  franjas(): Promise<FranjaGimnasioVista[]> {
    return this.gimnasio.franjas();
  }

  @Patch('franjas/:id')
  @Roles(...GESTORES_GIMNASIO)
  @ApiOperation({
    summary: 'Cambiar el cupo de una franja (personal de deportes)',
    description:
      'También la habilita o deshabilita. Bajar el cupo no cancela reservas ya hechas.',
  })
  @ApiOkResponse({ description: 'La franja actualizada.' })
  @ApiBadRequestResponse({ description: 'Cupo no válido.' })
  @ApiNotFoundResponse({ description: 'La franja no existe.' })
  @ApiForbiddenResponse({
    description: 'Solo personal de deportes y administradores.',
  })
  actualizarFranja(
    @Param('id', uuidFranja) id: string,
    @Body() dto: ActualizarFranjaGimnasioDto,
  ): Promise<FranjaGimnasioVista> {
    return this.gimnasio.actualizarFranja(id, dto);
  }
}
