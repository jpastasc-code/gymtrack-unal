import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import type { HealthResponse, WelcomeResponse } from './app.service';

@ApiTags('Sistema')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Mensaje de bienvenida ("hola mundo")' })
  @ApiOkResponse({ description: 'La API está en línea.' })
  getWelcome(): WelcomeResponse {
    return this.appService.getWelcome();
  }

  @Get('health')
  @ApiOperation({ summary: 'Chequeo de salud del API y de la base de datos' })
  @ApiOkResponse({ description: 'El API y la base de datos responden.' })
  @ApiServiceUnavailableResponse({
    description: 'La base de datos no responde.',
  })
  async getHealth(): Promise<HealthResponse> {
    const health = await this.appService.getHealth();
    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
