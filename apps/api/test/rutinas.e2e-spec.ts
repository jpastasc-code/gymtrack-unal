import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { crearRutinasEnMemoria } from './rutinas-en-memoria';

const ID_D1 = '00000000-0000-4000-a000-000000000001';
const SENTADILLA = '00000000-0000-4000-d000-000000000001';
const PRESS = '00000000-0000-4000-d000-000000000002';

describe('Rutinas (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const db = crearRutinasEnMemoria(
      [
        { id: ID_D1, rol: 'DEPORTISTA', activo: true },
        {
          id: 'u-instructor',
          nombres: 'Iván',
          apellidos: 'Instructor',
          rol: 'INSTRUCTOR',
          activo: true,
        },
      ],
      [
        {
          id: SENTADILLA,
          nombre: 'Sentadilla',
          grupoMuscular: 'CUADRICEPS',
          activo: true,
        },
        {
          id: PRESS,
          nombre: 'Press banco plano',
          grupoMuscular: 'PECHO',
          activo: true,
        },
      ],
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        estaDisponible: () => Promise.resolve(true),
        $disconnect: jest.fn(),
        ...db.prisma,
      })
      .overrideProvider(VerificadorToken)
      .useValue({
        // "deportista" inicia sesión con el mismo id que la ruta /deportistas/ID_D1.
        verificar: (token: string) =>
          Promise.resolve({
            sub: token === 'deportista' ? ID_D1 : `u-${token}`,
          }),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const como = (quien: string) => ({
    get: (ruta: string) =>
      request(app.getHttpServer())
        .get(`/api${ruta}`)
        .set('Authorization', `Bearer ${quien}`),
    post: (ruta: string, cuerpo: object) =>
      request(app.getHttpServer())
        .post(`/api${ruta}`)
        .set('Authorization', `Bearer ${quien}`)
        .send(cuerpo),
  });

  const RUTINA = {
    nombre: 'Ficha – 2 días',
    ejercicios: [
      {
        ejercicioId: SENTADILLA,
        dia: 1,
        series: 3,
        repeticionesObjetivo: '10-12',
        metodo: 'TRADICIONAL',
      },
      {
        ejercicioId: PRESS,
        dia: 2,
        series: 4,
        repeticionesObjetivo: '12-10-8-6',
        metodo: 'PIRAMIDE',
        descansoSegundos: 90,
      },
    ],
  };

  it('un deportista no puede asignar rutinas ni ver las de otros', async () => {
    await como('deportista')
      .post(`/deportistas/${ID_D1}/rutinas`, RUTINA)
      .expect(403);
    await como('deportista').get(`/deportistas/${ID_D1}/rutinas`).expect(403);
  });

  it('el instructor asigna la rutina y el deportista la ve en su celular', async () => {
    await como('deportista')
      .get('/rutinas/mia')
      .expect(404)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Aún no tienes una rutina asignada. Pídesela a tu instructor.',
        ),
      );

    const { body: creada } = await como('instructor')
      .post(`/deportistas/${ID_D1}/rutinas`, RUTINA)
      .expect(201);
    expect(creada.dias).toHaveLength(2);

    const { body: mia } = await como('deportista')
      .get('/rutinas/mia')
      .expect(200);
    expect(mia).toMatchObject({
      nombre: 'Ficha – 2 días',
      vigente: true,
      instructor: { nombres: 'Iván' },
      dias: [
        {
          dia: 1,
          ejercicios: [
            {
              ejercicio: { nombre: 'Sentadilla' },
              series: 3,
              repeticionesObjetivo: '10-12',
              metodo: 'TRADICIONAL',
            },
          ],
        },
        {
          dia: 2,
          ejercicios: [
            {
              ejercicio: { nombre: 'Press banco plano' },
              metodo: 'PIRAMIDE',
              descansoSegundos: 90,
            },
          ],
        },
      ],
    });
  });

  it('una rutina nueva reemplaza la vigente', async () => {
    await como('instructor')
      .post(`/deportistas/${ID_D1}/rutinas`, RUTINA)
      .expect(201);
    await como('instructor')
      .post(`/deportistas/${ID_D1}/rutinas`, { ...RUTINA, nombre: 'Fase 2' })
      .expect(201);

    const { body } = await como('instructor')
      .get(`/deportistas/${ID_D1}/rutinas`)
      .expect(200);
    expect(
      body.map((r: { nombre: string; vigente: boolean }) => [
        r.nombre,
        r.vigente,
      ]),
    ).toEqual([
      ['Fase 2', true],
      ['Ficha – 2 días', false],
    ]);
    await como('deportista')
      .get('/rutinas/mia')
      .expect(({ body: mia }) => expect(mia.nombre).toBe('Fase 2'));
  });

  it('valida series, repeticiones y método con mensajes por ejercicio', async () => {
    const { body } = await como('instructor')
      .post(`/deportistas/${ID_D1}/rutinas`, {
        nombre: 'X',
        ejercicios: [
          {
            ejercicioId: SENTADILLA,
            dia: 8,
            series: 0,
            repeticionesObjetivo: ' ',
            metodo: 'MAGICO',
          },
        ],
      })
      .expect(400);
    expect(body.errores).toEqual({
      nombre: 'El nombre debe tener al menos 3 caracteres.',
      'ejercicios.0.dia': 'El día debe estar entre 1 y 7.',
      'ejercicios.0.series': 'Las series deben estar entre 1 y 20.',
      'ejercicios.0.repeticionesObjetivo': 'Indica las repeticiones objetivo.',
      'ejercicios.0.metodo': 'Elige un método de la lista.',
    });

    await como('instructor')
      .post(`/deportistas/${ID_D1}/rutinas`, {
        nombre: 'Vacía',
        ejercicios: [],
      })
      .expect(400)
      .expect(({ body: b }) =>
        expect(b.errores).toEqual({
          ejercicios: 'Agrega al menos un ejercicio a la rutina.',
        }),
      );
  });

  it('responde 404 si el deportista no existe', async () => {
    await como('instructor')
      .post('/deportistas/no-es-uuid/rutinas', RUTINA)
      .expect(404);
    await como('instructor')
      .post('/deportistas/00000000-0000-4000-a000-000000000099/rutinas', RUTINA)
      .expect(404);
  });
});
