import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('GET /api/health responde ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'gymtrack-api' });
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
