import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import {
  diaSemanaIso,
  fechaEnColombia,
  sumarDias,
} from './../src/cancha/cancha.horario';
import { PrismaService } from './../src/prisma/prisma.service';
import { crearGimnasioEnMemoria } from './gimnasio-en-memoria';

const FRANJA = 'aaaaaaaa-0000-4000-8000-000000000001';
// Mañana siempre está en el futuro, sin importar a qué hora corran las pruebas.
const MANANA = sumarDias(fechaEnColombia(new Date()), 1);

describe('Reserva de cupo en el gimnasio (e2e)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof crearGimnasioEnMemoria>;

  beforeEach(async () => {
    db = crearGimnasioEnMemoria(
      [
        { id: 'u-deportista', rol: 'DEPORTISTA', activo: true },
        { id: 'u-otra', rol: 'DEPORTISTA', activo: true },
        { id: 'u-personal', rol: 'PERSONAL_DEPORTES', activo: true },
      ],
      [
        {
          id: FRANJA,
          diaSemana: diaSemanaIso(MANANA),
          horaInicio: '10:00',
          horaFin: '11:00',
          cupoMaximo: 1,
          activa: true,
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

  const como = (quien: string) => {
    const auth = `Bearer ${quien}`;
    const servidor = () => request(app.getHttpServer());
    return {
      get: (ruta: string) =>
        servidor().get(`/api${ruta}`).set('Authorization', auth),
      post: (ruta: string, cuerpo?: object) =>
        servidor().post(`/api${ruta}`).set('Authorization', auth).send(cuerpo),
      patch: (ruta: string, cuerpo: object) =>
        servidor().patch(`/api${ruta}`).set('Authorization', auth).send(cuerpo),
    };
  };
  const franjaDeManana = async (quien: string) => {
    const { body } = await como(quien)
      .get('/gimnasio/disponibilidad')
      .expect(200);
    return body.dias[1].franjas[0];
  };

  it('exige iniciar sesión', async () => {
    await request(app.getHttpServer())
      .get('/api/gimnasio/disponibilidad')
      .expect(401);
  });

  it('reserva el último cupo, la franja queda llena para los demás y al cancelar se libera', async () => {
    expect(await franjaDeManana('deportista')).toMatchObject({
      horaInicio: '10:00',
      cupoMaximo: 1,
      libres: 1,
      estado: 'DISPONIBLE',
    });

    const { body: reserva } = await como('deportista')
      .post('/gimnasio/reservas', { franjaId: FRANJA, fecha: MANANA })
      .expect(201);
    expect(reserva).toMatchObject({ fecha: MANANA, horaInicio: '10:00' });

    expect(await franjaDeManana('deportista')).toMatchObject({
      libres: 0,
      estado: 'TUYA',
      reservaId: reserva.id,
    });
    expect(await franjaDeManana('otra')).toMatchObject({ estado: 'LLENA' });
    await como('deportista')
      .get('/gimnasio/reservas/mias')
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([reserva]));

    await como('otra')
      .post('/gimnasio/reservas', { franjaId: FRANJA, fecha: MANANA })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe('Esa franja se llenó. Elige otra hora.'),
      );
    await como('deportista')
      .post('/gimnasio/reservas', { franjaId: FRANJA, fecha: MANANA })
      .expect(409);

    // Otra persona no puede cancelarla.
    await como('otra')
      .post(`/gimnasio/reservas/${reserva.id}/cancelar`)
      .expect(403);
    await como('deportista')
      .post(`/gimnasio/reservas/${reserva.id}/cancelar`)
      .expect(204);
    expect(await franjaDeManana('otra')).toMatchObject({
      libres: 1,
      estado: 'DISPONIBLE',
    });
    await como('deportista').get('/gimnasio/reservas/mias').expect(200, []);
  });

  it('rechaza datos no válidos y reservas que no existen', async () => {
    await como('deportista')
      .post('/gimnasio/reservas', { franjaId: 'nada', fecha: 'mañana' })
      .expect(400)
      .expect(({ body }) =>
        expect(body.errores).toEqual({
          franjaId: 'Elige una franja.',
          fecha: 'La fecha debe tener el formato AAAA-MM-DD.',
        }),
      );
    await como('deportista')
      .post('/gimnasio/reservas', {
        franjaId: 'aaaaaaaa-0000-4000-8000-000000000999',
        fecha: MANANA,
      })
      .expect(404);
    await como('deportista')
      .post('/gimnasio/reservas/no-es-un-id/cancelar')
      .expect(404);
  });

  it('el personal de deportes configura el cupo; un deportista no', async () => {
    await como('deportista').get('/gimnasio/franjas').expect(403);
    await como('deportista')
      .patch(`/gimnasio/franjas/${FRANJA}`, { cupoMaximo: 40 })
      .expect(403);

    await como('personal')
      .patch(`/gimnasio/franjas/${FRANJA}`, { cupoMaximo: 0 })
      .expect(400)
      .expect(({ body }) =>
        expect(body.errores).toEqual({
          cupoMaximo: 'El cupo debe estar entre 1 y 200 personas.',
        }),
      );
    await como('personal')
      .patch(`/gimnasio/franjas/${FRANJA}`, { cupoMaximo: 40 })
      .expect(200)
      .expect(({ body }) => expect(body.cupoMaximo).toBe(40));
    await como('personal')
      .get('/gimnasio/franjas')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          {
            id: FRANJA,
            diaSemana: diaSemanaIso(MANANA),
            horaInicio: '10:00',
            horaFin: '11:00',
            cupoMaximo: 40,
            activa: true,
          },
        ]),
      );
    expect(await franjaDeManana('deportista')).toMatchObject({ libres: 40 });
  });
});
