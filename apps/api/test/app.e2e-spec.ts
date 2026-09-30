import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  // Las pruebas e2e no dependen de una base de datos real.
  const prisma = {
    estaDisponible: jest.fn<Promise<boolean>, []>(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    prisma.estaDisponible.mockResolvedValue(true);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api responde el hola mundo', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ message: '¡Hola desde GymTrack UNAL API!' });
  });

  it('GET /api/health responde ok con la base de datos disponible', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'gymtrack-api',
      database: 'ok',
    });
  });

  it('GET /api/health responde 503 si la base de datos no responde', async () => {
    prisma.estaDisponible.mockResolvedValue(false);
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect(res.body).toMatchObject({ status: 'error', database: 'error' });
  });

  it('GET /api/docs-json expone la especificación OpenAPI', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const spec = res.body as { info: { title: string }; paths: object };
    expect(spec.info.title).toBe('GymTrack UNAL API');
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/api', '/api/health']),
    );
  });
});
