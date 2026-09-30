import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { parseCorsOrigins } from './app.setup';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { estaDisponible: jest.fn<Promise<boolean>, []>() };

  beforeEach(async () => {
    prisma.estaDisponible.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('devuelve el mensaje de bienvenida', () => {
    expect(appController.getWelcome()).toEqual({
      message: '¡Hola desde GymTrack UNAL API!',
    });
  });

  it('reporta ok cuando la base de datos responde', async () => {
    prisma.estaDisponible.mockResolvedValue(true);
    const health = await appController.getHealth();
    expect(health).toMatchObject({
      status: 'ok',
      service: 'gymtrack-api',
      database: 'ok',
    });
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });

  it('responde 503 cuando la base de datos no responde', async () => {
    prisma.estaDisponible.mockResolvedValue(false);
    await expect(appController.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
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
