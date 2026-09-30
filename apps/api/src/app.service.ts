import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface WelcomeResponse {
  message: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  database: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getWelcome(): WelcomeResponse {
    return { message: '¡Hola desde GymTrack UNAL API!' };
  }

  async getHealth(): Promise<HealthResponse> {
    const baseDeDatosOk = await this.prisma.estaDisponible();
    return {
      status: baseDeDatosOk ? 'ok' : 'error',
      service: 'gymtrack-api',
      database: baseDeDatosOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
