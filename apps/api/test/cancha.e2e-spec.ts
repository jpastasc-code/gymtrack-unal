import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { crearCanchaEnMemoria } from './cancha-en-memoria';

const USUARIOS = {
  deportes: { id: 'u-deportes', rol: 'PERSONAL_DEPORTES', activo: true },
  instructor: { id: 'u-instructor', rol: 'INSTRUCTOR', activo: true },
  deportista: { id: 'u-deportista', rol: 'DEPORTISTA', activo: true },
} as const;

/** Una semana lejana, para que ninguna franja haya "pasado" al correr la prueba. */
const SEMANA = '2030-01-09';

type Dia = {
  fecha: string;
  franjas: { horaInicio: string; estado: string }[];
};

describe('Disponibilidad de la cancha (e2e, GYMM-20)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof crearCanchaEnMemoria>;

  async function iniciar(opciones: Parameters<typeof crearCanchaEnMemoria>[0]) {
    db = crearCanchaEnMemoria(opciones);
    const prisma = {
      estaDisponible: () => Promise.resolve(true),
      $disconnect: jest.fn(),
      ...db.prisma,
      usuario: {
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            Object.values(USUARIOS).find((u) => u.id === where.id) ?? null,
          ),
      },
    };
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
  }

  beforeEach(() =>
    iniciar({
      franjas: [
        { diaSemana: 1, inicio: '14:00', fin: '15:00' },
        { diaSemana: 1, inicio: '15:00', fin: '16:00' },
        { diaSemana: 6, inicio: '08:00', fin: '09:00' },
      ],
      // Lunes 7 de enero de 2030, 2 a 3 p. m. en Colombia.
      reservas: [
        { inicio: '2030-01-07T19:00:00Z', fin: '2030-01-07T20:00:00Z' },
      ],
    }),
  );

  afterEach(async () => {
    await app.close();
  });

  const como = (quien: keyof typeof USUARIOS) => ({
    get: (ruta: string) =>
      request(app.getHttpServer())
        .get(ruta)
        .set('Authorization', `Bearer ${quien}`),
    post: (ruta: string, cuerpo: object) =>
      request(app.getHttpServer())
        .post(ruta)
        .set('Authorization', `Bearer ${quien}`)
        .send(cuerpo),
    patch: (ruta: string, cuerpo: object) =>
      request(app.getHttpServer())
        .patch(ruta)
        .set('Authorization', `Bearer ${quien}`)
        .send(cuerpo),
    delete: (ruta: string) =>
      request(app.getHttpServer())
        .delete(ruta)
        .set('Authorization', `Bearer ${quien}`),
  });

  it('exige sesión para ver la disponibilidad', async () => {
    await request(app.getHttpServer())
      .get('/api/cancha/disponibilidad')
      .expect(401);
  });

  it('un deportista ve la semana con las franjas libres y reservadas', async () => {
    const res = await como('deportista')
      .get(`/api/cancha/disponibilidad?semana=${SEMANA}`)
      .expect(200);
    expect(res.body.semana).toEqual({
      desde: '2030-01-07',
      hasta: '2030-01-13',
    });
    const dias = res.body.dias as Dia[];
    expect(dias).toHaveLength(7);
    expect(dias[0].franjas).toEqual([
      expect.objectContaining({ horaInicio: '14:00', estado: 'RESERVADA' }),
      expect.objectContaining({ horaInicio: '15:00', estado: 'DISPONIBLE' }),
    ]);
    expect(dias[5].franjas).toEqual([
      expect.objectContaining({ horaInicio: '08:00', estado: 'DISPONIBLE' }),
    ]);
  });

  it('rechaza una semana que no es una fecha', async () => {
    const res = await como('deportista')
      .get('/api/cancha/disponibilidad?semana=2030-02-30')
      .expect(400);
    expect(res.body.errores.semana).toBe(
      'La semana debe ser una fecha con formato AAAA-MM-DD.',
    );
  });

  it('responde 404 con un mensaje claro si la cancha no está habilitada', async () => {
    await app.close();
    await iniciar({ canchaActiva: false });
    const res = await como('deportista')
      .get('/api/cancha/disponibilidad')
      .expect(404);
    expect(res.body.message).toBe(
      'La cancha no está habilitada en este momento.',
    );
  });

  it('solo el personal de deportes administra las franjas', async () => {
    const id = db.idDe(1, '14:00');
    for (const quien of ['deportista', 'instructor'] as const) {
      await como(quien).get('/api/cancha/franjas').expect(403);
      await como(quien)
        .post('/api/cancha/franjas', {
          diaSemana: 2,
          horaInicio: '14:00',
          horaFin: '15:00',
        })
        .expect(403);
      await como(quien)
        .patch(`/api/cancha/franjas/${id}`, { activa: false })
        .expect(403);
      await como(quien).delete(`/api/cancha/franjas/${id}`).expect(403);
    }
    expect(db.franjas()).toHaveLength(3);
  });

  it('el personal de deportes habilita una franja y aparece en la disponibilidad', async () => {
    const res = await como('deportes')
      .post('/api/cancha/franjas', {
        diaSemana: 3,
        horaInicio: '18:00',
        horaFin: '19:30',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      diaSemana: 3,
      horaInicio: '18:00',
      horaFin: '19:30',
      activa: true,
    });
    const semana = await como('deportista')
      .get(`/api/cancha/disponibilidad?semana=${SEMANA}`)
      .expect(200);
    expect((semana.body.dias as Dia[])[2].franjas).toEqual([
      expect.objectContaining({ horaInicio: '18:00', estado: 'DISPONIBLE' }),
    ]);
  });

  it('valida los datos de la franja y explica cada error', async () => {
    const formato = await como('deportes')
      .post('/api/cancha/franjas', {
        diaSemana: 8,
        horaInicio: '2pm',
        horaFin: '15:00',
      })
      .expect(400);
    expect(formato.body.errores).toEqual({
      diaSemana: 'Elige un día de la semana.',
      horaInicio: 'La hora de inicio debe tener el formato HH:MM.',
    });

    const orden = await como('deportes')
      .post('/api/cancha/franjas', {
        diaSemana: 2,
        horaInicio: '16:00',
        horaFin: '15:00',
      })
      .expect(400);
    expect(orden.body.errores.horaFin).toBe(
      'La hora de fin debe ser posterior a la de inicio.',
    );

    const cruce = await como('deportes')
      .post('/api/cancha/franjas', {
        diaSemana: 1,
        horaInicio: '14:30',
        horaFin: '15:30',
      })
      .expect(409);
    expect(cruce.body.message).toBe(
      'Se cruza con la franja del lunes de 14:00 a 15:00.',
    );
  });

  it('el personal de deportes deshabilita, lista y elimina una franja', async () => {
    const id = db.idDe(1, '15:00');
    await como('deportes')
      .patch(`/api/cancha/franjas/${id}`, { activa: false })
      .expect(200);

    const lista = await como('deportes').get('/api/cancha/franjas').expect(200);
    expect(
      (lista.body.franjas as { id: string; activa: boolean }[]).find(
        (f) => f.id === id,
      )?.activa,
    ).toBe(false);

    const semana = await como('deportista')
      .get(`/api/cancha/disponibilidad?semana=${SEMANA}`)
      .expect(200);
    expect((semana.body.dias as Dia[])[0].franjas).toHaveLength(1);

    await como('deportes').delete(`/api/cancha/franjas/${id}`).expect(204);
    await como('deportes').delete(`/api/cancha/franjas/${id}`).expect(404);
    await como('deportes')
      .patch('/api/cancha/franjas/no-es-un-id', { activa: true })
      .expect(404);
  });
});
