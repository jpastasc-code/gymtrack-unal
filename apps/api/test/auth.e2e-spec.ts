import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Roles } from './../src/auth/auth.decorators';
import {
  TokenInvalidoError,
  VerificadorToken,
} from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

/** Ruta de prueba restringida a instructores, para ejercitar @Roles. */
@Controller('prueba-roles')
class PruebaRolesController {
  @Get()
  @Roles('INSTRUCTOR', 'ADMIN')
  soloInstructores() {
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
      controllers: [PruebaRolesController],
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

  it('GET /api/auth/yo devuelve el perfil y el rol', async () => {
    const res = await conToken('/api/auth/yo', 'token-deportista').expect(200);
    expect(res.body).toEqual({
      id: 'u-deportista',
      correo: 'deportista@gymtrack.test',
      nombres: 'Daniela',
      apellidos: 'Deportista Prueba',
      rol: 'DEPORTISTA',
    });
  });

  it('@Roles deja pasar al rol permitido y bloquea a los demás', async () => {
    await conToken('/api/prueba-roles', 'token-instructor').expect(200);
    const res = await conToken('/api/prueba-roles', 'token-deportista').expect(
      403,
    );
    expect(res.body).toMatchObject({
      message: 'No tienes permiso para esta acción.',
    });
  });
});
