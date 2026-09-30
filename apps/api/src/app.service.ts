import { Injectable } from '@nestjs/common';

export interface WelcomeResponse {
  message: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class AppService {
  getWelcome(): WelcomeResponse {
    return { message: '¡Hola desde GymTrack UNAL API!' };
  }

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'gymtrack-api',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
