import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

const DANIELA = {
  id: 'u-1',
  documento: '1000000001',
  correo: 'deportista@gymtrack.test',
  nombres: 'Daniela',
  apellidos: 'Deportista Prueba',
  telefono: null,
  fechaNacimiento: new Date('2003-05-14T00:00:00Z'),
  sexo: 'FEMENINO',
  rol: 'DEPORTISTA',
  objetivo: 'GANAR_MASA_MUSCULAR',
  nivelActividad: 'MODERADO',
  activo: true,
};

// Prisma devuelve los Decimal como objetos; el servicio los pasa a número con Number().
const EVALUACION = {
  fecha: new Date('2026-09-22T15:00:00Z'),
  pesoKg: '62.5',
  tallaCm: '165',
  porcentajeGrasa: '24.5',
  nivelActividad: 'MODERADO',
};

describe('Requerimiento calórico (e2e)', () => {
  let app: INestApplication<App>;
  let usuario: Record<string, unknown> = DANIELA;
  let evaluacion: Record<string, unknown> | null = EVALUACION;
  const prisma = {
    estaDisponible: jest.fn(() => Promise.resolve(true)),
    $disconnect: jest.fn(),
    usuario: { findUnique: jest.fn(() => Promise.resolve(usuario)) },
    evaluacion: { findFirst: jest.fn(() => Promise.resolve(evaluacion)) },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(VerificadorToken)
      .useValue({ verificar: () => Promise.resolve({ sub: 'u-1' }) })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usuario = DANIELA;
    evaluacion = EVALUACION;
    prisma.evaluacion.findFirst.mockClear();
  });

  const pedir = () =>
    request(app.getHttpServer())
      .get('/api/perfil/requerimiento-calorico')
      .set('Authorization', 'Bearer token');

  it('exige sesión', async () => {
    await request(app.getHttpServer())
      .get('/api/perfil/requerimiento-calorico')
      .expect(401);
  });

  it('con % de grasa usa Katch-McArdle y la evaluación más reciente del usuario', async () => {
    const res = await pedir().expect(200);
    expect(res.body).toMatchObject({
      formula: 'KATCH_MCARDLE',
      tmb: 1389,
      factorActividad: 1.55,
      gastoDiario: 2153,
      ajusteObjetivo: 1.1,
      calorias: 2369,
      datos: {
        pesoKg: 62.5,
        tallaCm: 165,
        porcentajeGrasa: 24.5,
        sexo: 'FEMENINO',
        nivelActividad: 'MODERADO',
        objetivo: 'GANAR_MASA_MUSCULAR',
        fechaEvaluacion: '2026-09-22T15:00:00.000Z',
      },
    });
    expect(prisma.evaluacion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 'u-1' },
        orderBy: { fecha: 'desc' },
      }),
    );
  });

  it('sin % de grasa usa Mifflin-St Jeor con la edad y el sexo del perfil', async () => {
    evaluacion = { ...EVALUACION, porcentajeGrasa: null };
    usuario = { ...DANIELA, objetivo: 'MANTENER' };
    const res = await pedir().expect(200);
    expect(res.body.formula).toBe('MIFFLIN_ST_JEOR');
    expect(res.body.ajusteObjetivo).toBe(1);
    expect(res.body.datos.edad).toBeGreaterThanOrEqual(23);
  });

  it('si el perfil no tiene nivel de actividad usa el de la evaluación', async () => {
    usuario = { ...DANIELA, nivelActividad: null };
    evaluacion = { ...EVALUACION, nivelActividad: 'ALTO' };
    const res = await pedir().expect(200);
    expect(res.body.factorActividad).toBe(1.725);
  });

  it('sin evaluaciones responde 422 y dice qué falta', async () => {
    evaluacion = null;
    const res = await pedir().expect(422);
    expect(res.body.faltantes).toEqual(['pesoKg', 'tallaCm']);
    expect(res.body.message).toBe(
      'Para calcular tu requerimiento calórico faltan tu peso y tu talla.',
    );
  });

  it('sin % de grasa pide los datos del perfil que necesita Mifflin-St Jeor', async () => {
    evaluacion = { ...EVALUACION, porcentajeGrasa: null };
    usuario = { ...DANIELA, fechaNacimiento: null, sexo: null, objetivo: null };
    const res = await pedir().expect(422);
    expect(res.body.faltantes).toEqual(['edad', 'sexo', 'objetivo']);
    expect(res.body.message).toBe(
      'Para calcular tu requerimiento calórico faltan tu fecha de nacimiento, tu sexo y tu objetivo.',
    );
  });
});
