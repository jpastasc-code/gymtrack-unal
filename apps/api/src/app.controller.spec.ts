import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { parseCorsOrigins } from './app.setup';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('devuelve el mensaje de bienvenida', () => {
    expect(appController.getWelcome()).toEqual({
      message: '¡Hola desde GymTrack UNAL API!',
    });
  });

  it('reporta el estado de salud', () => {
    const health = appController.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('gymtrack-api');
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });
});

describe('parseCorsOrigins', () => {
  it('permite cualquier origen si la variable está vacía', () => {
    expect(parseCorsOrigins(undefined)).toBe(true);
    expect(parseCorsOrigins('  ')).toBe(true);
  });

  it('separa y limpia la lista de orígenes', () => {
    expect(
      parseCorsOrigins('https://gymtrack.vercel.app, http://localhost:5173'),
    ).toEqual(['https://gymtrack.vercel.app', 'http://localhost:5173']);
  });
});
