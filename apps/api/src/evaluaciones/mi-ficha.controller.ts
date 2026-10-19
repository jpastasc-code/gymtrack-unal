import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import {
  EvaluacionesService,
  type EvaluacionVista,
} from './evaluaciones.service';

/** Ficha física del usuario con sesión iniciada (GYMM-23). */
@ApiTags('Perfil')
@ApiBearerAuth()
@Controller('perfil')
export class MiFichaController {
  constructor(private readonly evaluaciones: EvaluacionesService) {}

  @Get('evaluaciones')
  @ApiOperation({
    summary:
      'Mi ficha física: mis evaluaciones, de la más reciente a la más antigua',
    description:
      'Solo devuelve las evaluaciones del usuario del token; no recibe ningún id, así que nadie puede consultar la ficha de otra persona.',
  })
  @ApiOkResponse({
    description:
      'Evaluaciones con sus medidas. La última del listado es la evaluación inicial.',
  })
  @ApiUnauthorizedResponse({ description: 'Sin sesión iniciada.' })
  miFicha(@UsuarioActual() usuario: Usuario): Promise<EvaluacionVista[]> {
    return this.evaluaciones.miFicha(usuario.id);
  }
}
