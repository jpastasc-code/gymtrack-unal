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

/** Una semana lejana, para que ninguna reserva haya empezado al correr la prueba. */
const SEMANA = '2030-01-09';

type Franja = { horaInicio: string; estado: string };

describe('Cancelación de reservas de la cancha (e2e, GYMM-29)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof crearCanchaEnMemoria>;

  beforeEach(async () => {
    db = crearCanchaEnMemoria({
      franjas: [{ diaSemana: 1, inicio: '14:00', fin: '15:00' }],
      // Lunes 7 de enero de 2030, 2 a 3 p. m.: la reserva de la deportista.
      reservas: [
        {
          inicio: '2030-01-07T19:00:00Z',
          fin: '2030-01-07T20:00:00Z',
          usuarioId: 'u-deportista',
        },
      ],
    });
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
  });

  afterEach(async () => {
    await app.close();
  });

  const reservaId = () => db.reservas()[0].id;

  const como = (quien: keyof typeof USUARIOS) => ({
    get: (ruta: string) =>
      request(app.getHttpServer())
        .get(ruta)
        .set('Authorization', `Bearer ${quien}`),
    cancelar: (id: string) =>
      request(app.getHttpServer())
        .post(`/api/cancha/reservas/${id}/cancelar`)
        .set('Authorization', `Bearer ${quien}`),
  });

  const franjaDelLunes = async (quien: keyof typeof USUARIOS) => {
    const res = await como(quien)
      .get(`/api/cancha/disponibilidad?semana=${SEMANA}`)
      .expect(200);
    return (res.body.dias as { franjas: Franja[] }[])[0].franjas[0];
  };

  it('exige sesión para cancelar', async () => {
    await request(app.getHttpServer())
      .post(`/api/cancha/reservas/${reservaId()}/cancelar`)
      .expect(401);
  });

  it('la dueña cancela y la franja queda libre de inmediato para otra persona', async () => {
    await como('deportista').cancelar(reservaId()).expect(204);

    expect((await franjaDelLunes('instructor')).estado).toBe('DISPONIBLE');
    const mias = await como('deportista')
      .get('/api/cancha/reservas/mias')
      .expect(200);
    expect(mias.body).toEqual([]);

    await request(app.getHttpServer())
      .post('/api/cancha/reservas')
      .set('Authorization', 'Bearer instructor')
      .send({ franjaId: db.idDe(1, '14:00'), fecha: '2030-01-07' })
      .expect(201);
    // Cancelar otra vez la reserva ya cancelada no es un error.
    await como('deportista').cancelar(reservaId()).expect(204);
  });

  it('otra persona no puede cancelarla', async () => {
    const res = await como('instructor').cancelar(reservaId()).expect(403);
    expect(res.body.message).toBe(
      'Solo quien hizo la reserva o el personal de deportes puede cancelarla.',
    );
    expect((await franjaDelLunes('instructor')).estado).toBe('RESERVADA');
  });

  it('el personal de deportes cancela la reserva de otra persona', async () => {
    await como('deportes').cancelar(reservaId()).expect(204);
    expect((await franjaDelLunes('deportista')).estado).toBe('DISPONIBLE');
  });

  it('responde 404 si la reserva no existe', async () => {
    const formato = await como('deportista')
      .cancelar('no-es-un-id')
      .expect(404);
    expect(formato.body.message).toBe('Esa reserva no existe.');
    await como('deportista')
      .cancelar('00000000-0000-4000-8000-000000000000')
      .expect(404);
  });
});
