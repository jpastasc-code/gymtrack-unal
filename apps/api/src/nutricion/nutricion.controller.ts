import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import { NutricionService, type MiRequerimiento } from './nutricion.service';

@ApiTags('Perfil')
@ApiBearerAuth()
@Controller('perfil')
export class NutricionController {
  constructor(private readonly nutricion: NutricionService) {}

  @Get('requerimiento-calorico')
  @ApiOperation({
    summary: 'Mi requerimiento calórico diario',
    description:
      'Calcula la TMB con Katch-McArdle si la evaluación más reciente tiene % de grasa, o con ' +
      'Mifflin-St Jeor si no; la multiplica por el factor de actividad y la ajusta según el ' +
      'objetivo (DT-07). Siempre es del usuario del token: no recibe ningún id.',
  })
  @ApiOkResponse({
    description:
      '`formula`, `tmb`, `factorActividad`, `gastoDiario`, `ajusteObjetivo`, `calorias` (kcal/día) y los `datos` usados.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Faltan datos para calcularlo. `faltantes` dice cuáles: `pesoKg` y `tallaCm` (necesita una evaluación), ' +
      '`edad`, `sexo`, `nivelActividad` u `objetivo` (se completan en el perfil).',
  })
  miRequerimiento(@UsuarioActual() usuario: Usuario): Promise<MiRequerimiento> {
    return this.nutricion.miRequerimiento(usuario);
  }
}
