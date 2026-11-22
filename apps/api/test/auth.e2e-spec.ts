import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Permisos } from './../src/auth/auth.decorators';
import {
  TokenInvalidoError,
  VerificadorToken,
} from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

/** Rutas de prueba restringidas por permiso, para ejercitar @Permisos. */
@Controller('prueba-permisos')
class PruebaPermisosController {
  @Get('rutinas')
  @Permisos('GESTIONAR_RUTINAS')
  rutinas() {
    return { ok: true };
  }

  @Get('cancha-o-cupos')
  @Permisos('GESTIONAR_CANCHA', 'GESTIONAR_CUPOS_GIMNASIO')
  canchaOCupos() {
    return { ok: true };
  }
}

const USUARIOS = {
  deportista: {
    id: 'u-deportista',
    correo: 'deportista@gymtrack.test',
    nombres: 'Daniela',
    apellidos: 'Deportista Prueba',
    rol: 'DEPORTISTA',
    activo: true,
  },
  instructor: {
    id: 'u-instructor',
    correo: 'instructor@gymtrack.test',
    nombres: 'Iván',
    apellidos: 'Instructor Prueba',
    rol: 'INSTRUCTOR',
    activo: true,
  },
  personal: {
    id: 'u-personal',
    correo: 'personal@gymtrack.test',
    nombres: 'Pilar',
    apellidos: 'Personal Prueba',
    rol: 'PERSONAL_DEPORTES',
    activo: true,
  },
  inactivo: {
    id: 'u-inactivo',
    correo: 'inactivo@gymtrack.test',
    nombres: 'Sin',
    apellidos: 'Acceso',
    rol: 'DEPORTISTA',
    activo: false,
  },
} as const;

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;

  // "token-<clave>" es válido para ese usuario; "token-sin-perfil" es válido pero sin fila en `usuario`.
  const verificador = {
    verificar: jest.fn((token: string) => {
      if (!token.startsWith('token-')) {
        return Promise.reject(new TokenInvalidoError('La sesión expiró.'));
      }
      const clave = token.slice('token-'.length);
      const usuario = USUARIOS[clave as keyof typeof USUARIOS];
      return Promise.resolve({ sub: usuario?.id ?? 'u-sin-perfil' });
    }),
  };
  const prisma = {
    estaDisponible: jest.fn(() => Promise.resolve(true)),
    $disconnect: jest.fn(),
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          Object.values(USUARIOS).find((u) => u.id === where.id) ?? null,
        ),
      ),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PruebaPermisosController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(VerificadorToken)
      .useValue(verificador)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const conToken = (ruta: string, token: string) =>
    request(app.getHttpServer())
      .get(ruta)
      .set('Authorization', `Bearer ${token}`);

  it('las rutas públicas no piden sesión', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/yo')
      .expect(401);
    expect(res.body).toMatchObject({
      message: 'Inicia sesión para continuar.',
    });
  });

  it('responde 401 con un token inválido o expirado', async () => {
    const res = await conToken('/api/auth/yo', 'basura').expect(401);
    expect(res.body).toMatchObject({ message: 'La sesión expiró.' });
  });

  it('responde 403 si el usuario no tiene perfil en GymTrack', async () => {
    await conToken('/api/auth/yo', 'token-sin-perfil').expect(403);
  });

  it('responde 403 si el perfil está inactivo', async () => {
    await conToken('/api/auth/yo', 'token-inactivo').expect(403);
  });

  it('GET /api/auth/yo devuelve el perfil, el rol y ningún permiso al deportista', async () => {
    const res = await conToken('/api/auth/yo', 'token-deportista').expect(200);
    expect(res.body).toEqual({
      id: 'u-deportista',
      correo: 'deportista@gymtrack.test',
      nombres: 'Daniela',
      apellidos: 'Deportista Prueba',
      rol: 'DEPORTISTA',
      permisos: [],
    });
  });

  it('GET /api/auth/yo devuelve los permisos del rol', async () => {
    const instructor = await conToken(
      '/api/auth/yo',
      'token-instructor',
    ).expect(200);
    expect(instructor.body.permisos).toEqual([
      'GESTIONAR_RUTINAS',
      'REGISTRAR_EVALUACIONES',
      'GESTIONAR_EJERCICIOS',
      'GESTIONAR_CUPOS_GIMNASIO',
      'GESTIONAR_CANCHA',
    ]);
    const personal = await conToken('/api/auth/yo', 'token-personal').expect(
      200,
    );
    expect(personal.body.permisos).toEqual([
      'GESTIONAR_CUPOS_GIMNASIO',
      'GESTIONAR_CANCHA',
    ]);
  });

  it('@Permisos deja pasar a quien tiene el permiso y bloquea a los demás', async () => {
    await conToken('/api/prueba-permisos/rutinas', 'token-instructor').expect(
      200,
    );
    await conToken('/api/prueba-permisos/rutinas', 'token-personal').expect(
      403,
    );
    const res = await conToken(
      '/api/prueba-permisos/rutinas',
      'token-deportista',
    ).expect(403);
    expect(res.body).toMatchObject({
      message: 'No tienes permiso para esta acción.',
    });
  });

  it('@Permisos con varios permisos exige al menos uno', async () => {
    await conToken(
      '/api/prueba-permisos/cancha-o-cupos',
      'token-personal',
    ).expect(200);
    await conToken(
      '/api/prueba-permisos/cancha-o-cupos',
      'token-instructor',
    ).expect(200);
    await conToken(
      '/api/prueba-permisos/cancha-o-cupos',
      'token-deportista',
    ).expect(403);
  });
});
