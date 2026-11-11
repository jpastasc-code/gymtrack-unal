import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import { CrearReservaGimnasioDto } from './gimnasio.dto';
import {
  GimnasioService,
  type DisponibilidadGimnasio,
  type ReservaGimnasioVista,
} from './gimnasio.service';

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
}
