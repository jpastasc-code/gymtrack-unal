import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

const SENTADILLA = {
  id: '00000000-0000-4000-8000-000000000001',
  nombre: 'Sentadilla',
  grupoMuscular: 'CUADRICEPS',
};
const PRESS = {
  id: '00000000-0000-4000-8000-000000000002',
  nombre: 'Press de banca',
  grupoMuscular: 'PECHO',
};
const SIN_HACER = '00000000-0000-4000-8000-000000000003';

const LUNES = new Date('2026-11-02T13:00:00Z');
const JUEVES = new Date('2026-11-05T13:00:00Z');

/** Una fila de serie_registrada con su sesión y su ejercicio, como las ve Prisma. */
const serie = (
  usuarioId: string,
  sesionId: string,
  inicio: Date,
  ejercicio: typeof SENTADILLA,
  numeroSerie: number,
  cargaKg: number,
  repeticiones: number,
) => ({
  sesionId,
  numeroSerie,
  cargaKg: String(cargaKg),
  repeticiones,
  sesion: { usuarioId, inicio },
  ejercicio,
});

const SERIES = [
  serie('u-deportista', 's1', LUNES, SENTADILLA, 1, 40, 12),
  serie('u-deportista', 's1', LUNES, SENTADILLA, 2, 45, 10),
  serie('u-deportista', 's1', LUNES, PRESS, 1, 30, 10),
  serie('u-deportista', 's2', JUEVES, SENTADILLA, 2, 50, 6),
  serie('u-deportista', 's2', JUEVES, SENTADILLA, 1, 50, 8),
  // De otra persona: nunca debe aparecer.
  serie('u-otra', 's3', JUEVES, SENTADILLA, 1, 120, 5),
];

describe('Progreso por ejercicio (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    estaDisponible: jest.fn(() => Promise.resolve(true)),
    $disconnect: jest.fn(),
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id, rol: 'DEPORTISTA', activo: true }),
      ),
    },
    ejercicio: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          [SENTADILLA, PRESS].find((e) => e.id === where.id) ??
            (where.id === SIN_HACER
              ? { id: SIN_HACER, nombre: 'Remo', grupoMuscular: 'ESPALDA' }
              : null),
        ),
      ),
    },
    serieRegistrada: {
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { ejercicioId?: string; sesion: { usuarioId: string } };
        }) =>
          Promise.resolve(
            SERIES.filter(
              (s) =>
                s.sesion.usuarioId === where.sesion.usuarioId &&
                (!where.ejercicioId || s.ejercicio.id === where.ejercicioId),
            ).sort(
              (a, b) =>
                b.sesion.inicio.getTime() - a.sesion.inicio.getTime() ||
                a.numeroSerie - b.numeroSerie,
            ),
          ),
      ),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(VerificadorToken)
      .useValue({
        verificar: (token: string) => Promise.resolve({ sub: `u-${token}` }),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const pedir = (ruta: string, quien = 'deportista') =>
    request(app.getHttpServer())
      .get(`/api/progreso${ruta}`)
      .set('Authorization', `Bearer ${quien}`);

  it('exige sesión', async () => {
    await request(app.getHttpServer())
      .get('/api/progreso/ejercicios')
      .expect(401);
  });

  it('lista mis ejercicios con su mejor marca, del último que hice al primero', async () => {
    const res = await pedir('/ejercicios').expect(200);
    expect(res.body).toEqual([
      {
        ejercicio: SENTADILLA,
        sesiones: 2,
        ultimaFecha: JUEVES.toISOString(),
        mejorMarca: {
          cargaKg: 50,
          repeticiones: 8,
          fecha: JUEVES.toISOString(),
        },
      },
      {
        ejercicio: PRESS,
        sesiones: 1,
        ultimaFecha: LUNES.toISOString(),
        mejorMarca: {
          cargaKg: 30,
          repeticiones: 10,
          fecha: LUNES.toISOString(),
        },
      },
    ]);
  });

  it('sin series registradas la lista está vacía', async () => {
    const res = await pedir('/ejercicios', 'nueva').expect(200);
    expect(res.body).toEqual([]);
  });

  it('el histórico agrupa por sesión, de la más reciente a la más antigua', async () => {
    const res = await pedir(`/ejercicios/${SENTADILLA.id}`).expect(200);
    expect(res.body).toEqual({
      ejercicio: SENTADILLA,
      mejorMarca: {
        sesionId: 's2',
        numeroSerie: 1,
        cargaKg: 50,
        repeticiones: 8,
        fecha: JUEVES.toISOString(),
      },
      sesiones: [
        {
          sesionId: 's2',
          fecha: JUEVES.toISOString(),
          series: [
            { numeroSerie: 1, cargaKg: 50, repeticiones: 8 },
            { numeroSerie: 2, cargaKg: 50, repeticiones: 6 },
          ],
        },
        {
          sesionId: 's1',
          fecha: LUNES.toISOString(),
          series: [
            { numeroSerie: 1, cargaKg: 40, repeticiones: 12 },
            { numeroSerie: 2, cargaKg: 45, repeticiones: 10 },
          ],
        },
      ],
    });
  });

  it('solo cuenta mis series, nunca las de otra persona', async () => {
    const res = await pedir(`/ejercicios/${SENTADILLA.id}`).expect(200);
    expect(res.body.mejorMarca.cargaKg).toBe(50);
    expect(prisma.serieRegistrada.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          ejercicioId: SENTADILLA.id,
          sesion: { usuarioId: 'u-deportista' },
        },
      }),
    );
  });

  it('un ejercicio que aún no hice no tiene marca ni sesiones', async () => {
    const res = await pedir(`/ejercicios/${SIN_HACER}`).expect(200);
    expect(res.body.mejorMarca).toBeNull();
    expect(res.body.sesiones).toEqual([]);
  });

  it('un ejercicio que no existe responde 404', async () => {
    await pedir('/ejercicios/00000000-0000-4000-8000-000000000099').expect(404);
    await pedir('/ejercicios/no-es-un-id').expect(404);
  });
});
