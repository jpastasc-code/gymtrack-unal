import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { crearSesionesEnMemoria, type SesionFila } from './sesiones-en-memoria';

const SENTADILLA = '00000000-0000-4000-d000-000000000001';
const PRESS = '00000000-0000-4000-d000-000000000002';
const REMO = '00000000-0000-4000-d000-000000000003';
const HORA = 60 * 60 * 1000;

describe('Sesiones de entrenamiento (e2e)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof crearSesionesEnMemoria>;

  async function levantar(
    iniciales?: Parameters<typeof crearSesionesEnMemoria>[2],
  ) {
    db = crearSesionesEnMemoria(
      [
        { id: 'u-deportista', rol: 'DEPORTISTA', activo: true },
        { id: 'u-otra', rol: 'DEPORTISTA', activo: true },
        { id: 'u-nueva', rol: 'DEPORTISTA', activo: true },
      ],
      [
        {
          id: 'r1',
          usuarioId: 'u-deportista',
          vigente: true,
          ejercicios: [
            { ejercicioId: SENTADILLA, series: 3 },
            { ejercicioId: PRESS, series: 4 },
          ],
        },
        {
          id: 'r2',
          usuarioId: 'u-otra',
          vigente: true,
          ejercicios: [{ ejercicioId: REMO, series: 3 }],
        },
      ],
      iniciales,
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
        verificar: (token: string) => Promise.resolve({ sub: `u-${token}` }),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  }

  afterEach(async () => {
    await app.close();
  });

  const como = (quien: string) => {
    const servidor = () => request(app.getHttpServer());
    const auth = `Bearer ${quien}`;
    return {
      get: (ruta: string) =>
        servidor().get(`/api${ruta}`).set('Authorization', auth),
      post: (ruta: string) =>
        servidor().post(`/api${ruta}`).set('Authorization', auth),
      put: (ruta: string, cuerpo: object) =>
        servidor().put(`/api${ruta}`).set('Authorization', auth).send(cuerpo),
    };
  };
  const deportista = () => como('deportista');

  const serie = (
    ejercicioId: string,
    numeroSerie: number,
    cargaKg: number,
    repeticiones: number,
  ) => ({ ejercicioId, numeroSerie, cargaKg, repeticiones });

  it('exige iniciar sesión en la app', async () => {
    await levantar();
    await request(app.getHttpServer()).get('/api/sesiones/actual').expect(401);
  });

  it('sin rutina vigente no se puede empezar a entrenar', async () => {
    await levantar();
    await como('nueva')
      .post('/sesiones')
      .expect(404)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Aún no tienes una rutina asignada. Pídesela a tu instructor.',
        ),
      );
    await como('nueva').get('/sesiones/precarga').expect(200, []);
  });

  it('empieza la sesión, registra series con reintentos y la termina', async () => {
    await levantar();
    await deportista()
      .get('/sesiones/actual')
      .expect(404)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'No tienes una sesión de entrenamiento abierta.',
        ),
      );

    const { body: sesion } = await deportista().post('/sesiones').expect(201);
    expect(sesion).toMatchObject({ rutinaId: 'r1', fin: null, series: [] });

    // Un doble toque en "Empezar" devuelve la misma sesión.
    await deportista()
      .post('/sesiones')
      .expect(201)
      .expect(({ body }) => expect(body.id).toBe(sesion.id));

    await deportista()
      .put(`/sesiones/${sesion.id}/series`, serie(SENTADILLA, 1, 40, 10))
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          ejercicioId: SENTADILLA,
          numeroSerie: 1,
          cargaKg: 40,
          repeticiones: 10,
        }),
      );
    // El celular reenvía la serie (sin señal) y luego la corrige: queda una sola.
    await deportista()
      .put(`/sesiones/${sesion.id}/series`, serie(SENTADILLA, 1, 40, 10))
      .expect(200);
    await deportista()
      .put(`/sesiones/${sesion.id}/series`, serie(SENTADILLA, 1, 42.5, 9))
      .expect(200);
    await deportista()
      .put(`/sesiones/${sesion.id}/series`, serie(SENTADILLA, 2, 42.5, 8))
      .expect(200);

    await deportista()
      .get('/sesiones/actual')
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(sesion.id);
        expect(
          body.series.map(
            (s: {
              numeroSerie: number;
              cargaKg: number;
              repeticiones: number;
            }) => [s.numeroSerie, s.cargaKg, s.repeticiones],
          ),
        ).toEqual([
          [1, 42.5, 9],
          [2, 42.5, 8],
        ]);
      });

    const { body: cerrada } = await deportista()
      .post(`/sesiones/${sesion.id}/cerrar`)
      .expect(200);
    expect(cerrada.fin).not.toBeNull();
    // Terminar otra vez no cambia nada.
    await deportista()
      .post(`/sesiones/${sesion.id}/cerrar`)
      .expect(200)
      .expect(({ body }) => expect(body.fin).toBe(cerrada.fin));

    await deportista()
      .put(`/sesiones/${sesion.id}/series`, serie(SENTADILLA, 3, 42.5, 8))
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Esta sesión ya terminó. Empieza una nueva para seguir registrando.',
        ),
      );
    await deportista().get('/sesiones/actual').expect(404);
  });

  it('rechaza series fuera de la rutina o con datos no válidos', async () => {
    await levantar();
    const { body: sesion } = await deportista().post('/sesiones').expect(201);
    const ruta = `/sesiones/${sesion.id}/series`;

    await deportista()
      .put(ruta, serie(REMO, 1, 30, 10))
      .expect(400)
      .expect(({ body }) =>
        expect(body.errores).toEqual({
          ejercicioId: 'Ese ejercicio no está en la rutina de esta sesión.',
        }),
      );
    await deportista()
      .put(ruta, serie(SENTADILLA, 4, 40, 10))
      .expect(400)
      .expect(({ body }) =>
        expect(body.errores).toEqual({
          numeroSerie: 'Este ejercicio tiene 3 series en tu rutina.',
        }),
      );
    await deportista()
      .put(ruta, serie(SENTADILLA, 1, -5, 10.5))
      .expect(400)
      .expect(({ body }) =>
        expect(body.errores).toMatchObject({
          cargaKg: 'La carga debe estar entre 0 y 500 kg.',
          repeticiones: 'Las repeticiones deben ser un número entero.',
        }),
      );
    expect(db.series()).toHaveLength(0);
  });

  it('nadie ve ni toca la sesión de otra persona', async () => {
    await levantar();
    const { body: sesion } = await deportista().post('/sesiones').expect(201);

    await como('otra')
      .put(`/sesiones/${sesion.id}/series`, serie(REMO, 1, 30, 10))
      .expect(404)
      .expect(({ body }) =>
        expect(body.message).toBe('Esa sesión de entrenamiento no existe.'),
      );
    await como('otra').post(`/sesiones/${sesion.id}/cerrar`).expect(404);
    await como('otra').get('/sesiones/actual').expect(404);
    await deportista().post('/sesiones/no-es-un-id/cerrar').expect(404);
  });

  it('precarga cada ejercicio con las series de la última sesión terminada', async () => {
    await levantar();
    const registrar = async (
      valores: ReturnType<typeof serie>[],
      cerrar: boolean,
    ) => {
      const { body: s } = await deportista().post('/sesiones').expect(201);
      for (const v of valores) {
        await deportista().put(`/sesiones/${s.id}/series`, v).expect(200);
      }
      if (cerrar)
        await deportista().post(`/sesiones/${s.id}/cerrar`).expect(200);
    };

    await deportista().get('/sesiones/precarga').expect(200, []);

    await registrar(
      [
        serie(SENTADILLA, 1, 40, 10),
        serie(PRESS, 1, 30, 12),
        serie(PRESS, 2, 30, 10),
      ],
      true,
    );
    // En la sesión siguiente solo hizo sentadilla: el press sigue saliendo de la primera.
    await registrar(
      [serie(SENTADILLA, 1, 45, 10), serie(SENTADILLA, 2, 45, 8)],
      true,
    );
    // La sesión abierta no cuenta: es la que se está registrando.
    await registrar([serie(SENTADILLA, 1, 50, 6)], false);

    const { body } = await deportista().get('/sesiones/precarga').expect(200);
    const porEjercicio = Object.fromEntries(
      (body as { ejercicioId: string; series: object[] }[]).map((p) => [
        p.ejercicioId,
        p.series,
      ]),
    );
    expect(porEjercicio).toEqual({
      [SENTADILLA]: [
        { numeroSerie: 1, cargaKg: 45, repeticiones: 10 },
        { numeroSerie: 2, cargaKg: 45, repeticiones: 8 },
      ],
      [PRESS]: [
        { numeroSerie: 1, cargaKg: 30, repeticiones: 12 },
        { numeroSerie: 2, cargaKg: 30, repeticiones: 10 },
      ],
    });
  });

  it('da por terminada una sesión olvidada y empieza una nueva', async () => {
    const hace8Horas = new Date(Date.now() - 8 * HORA);
    const ultimaSerie = new Date(Date.now() - 7 * HORA);
    const olvidada: SesionFila = {
      id: '00000000-0000-4000-f000-000000000001',
      usuarioId: 'u-deportista',
      rutinaId: 'r1',
      inicio: hace8Horas,
      fin: null,
      notas: null,
    };
    await levantar({
      sesiones: [olvidada],
      series: [
        {
          id: 'serie-vieja',
          sesionId: olvidada.id,
          ejercicioId: SENTADILLA,
          numeroSerie: 1,
          cargaKg: 40,
          repeticiones: 10,
          registradaEn: ultimaSerie,
        },
      ],
    });

    await deportista().get('/sesiones/actual').expect(404);
    expect(db.sesiones()[0].fin).toEqual(ultimaSerie);

    const { body } = await deportista().post('/sesiones').expect(201);
    expect(body.id).not.toBe(olvidada.id);
    // Lo que hizo en la sesión olvidada sirve para precargar.
    await deportista()
      .get('/sesiones/precarga')
      .expect(200)
      .expect(({ body: precarga }) =>
        expect(precarga).toEqual([
          {
            ejercicioId: SENTADILLA,
            fecha: hace8Horas.toISOString(),
            series: [{ numeroSerie: 1, cargaKg: 40, repeticiones: 10 }],
          },
        ]),
      );
  });
});
