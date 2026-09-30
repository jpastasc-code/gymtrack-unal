import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Chequeo de salud para el despliegue' })
  @ApiOkResponse({ description: 'El servicio responde correctamente.' })
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
