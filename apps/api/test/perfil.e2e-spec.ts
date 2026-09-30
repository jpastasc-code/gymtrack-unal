import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

const USUARIO = {
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

describe('Perfil (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    estaDisponible: jest.fn(() => Promise.resolve(true)),
    $disconnect: jest.fn(),
    usuario: {
      findUnique: jest.fn(() => Promise.resolve(USUARIO)),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const definidos = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        );
        return Promise.resolve({ ...USUARIO, ...definidos });
      }),
    },
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

  beforeEach(() => prisma.usuario.update.mockClear());

  const patch = (cuerpo: object) =>
    request(app.getHttpServer())
      .patch('/api/perfil')
      .set('Authorization', 'Bearer token')
      .send(cuerpo);

  it('GET /api/perfil exige sesión', async () => {
    await request(app.getHttpServer()).get('/api/perfil').expect(401);
  });

  it('GET /api/perfil devuelve el perfil completo', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/perfil')
      .set('Authorization', 'Bearer token')
      .expect(200);
    expect(res.body).toEqual({
      id: 'u-1',
      documento: '1000000001',
      correo: 'deportista@gymtrack.test',
      nombres: 'Daniela',
      apellidos: 'Deportista Prueba',
      telefono: null,
      fechaNacimiento: '2003-05-14',
      sexo: 'FEMENINO',
      objetivo: 'GANAR_MASA_MUSCULAR',
      nivelActividad: 'MODERADO',
      rol: 'DEPORTISTA',
    });
  });

  it('PATCH actualiza los datos personales y de entrenamiento', async () => {
    const res = await patch({
      nombres: '  Daniela Andrea ',
      telefono: '+57 300 123 4567',
      objetivo: 'PERDER_GRASA',
      nivelActividad: 'ALTO',
    }).expect(200);
    expect(res.body).toMatchObject({
      nombres: 'Daniela Andrea',
      telefono: '+57 300 123 4567',
      objetivo: 'PERDER_GRASA',
      nivelActividad: 'ALTO',
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u-1' } }),
    );
  });

  it('PATCH con teléfono vacío lo borra', async () => {
    await patch({ telefono: '' }).expect(200);
    expect(prisma.usuario.update.mock.calls[0][0].data.telefono).toBeNull();
  });

  it.each([
    [
      'correo',
      { correo: 'otro@unal.edu.co' },
      'El correo es un dato institucional y no se puede editar.',
    ],
    [
      'documento',
      { documento: '999' },
      'El documento es un dato institucional y no se puede editar.',
    ],
    ['rol', { rol: 'ADMIN' }, 'El rol no se puede cambiar desde el perfil.'],
  ])('PATCH rechaza cambiar el %s', async (campo, cuerpo, mensaje) => {
    const res = await patch(cuerpo).expect(400);
    expect(res.body.errores[campo]).toBe(mensaje);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('PATCH rechaza campos desconocidos', async () => {
    const res = await patch({ activo: false }).expect(400);
    expect(res.body.errores.activo).toBe(
      'El campo "activo" no se puede editar.',
    );
  });

  it('PATCH valida los datos con mensajes en español', async () => {
    const res = await patch({
      nombres: '   ',
      telefono: 'llámame',
      fechaNacimiento: '14/05/2003',
      objetivo: 'VOLAR',
    }).expect(400);
    expect(res.body.errores).toEqual({
      nombres: 'Escribe tus nombres.',
      telefono: expect.stringContaining('El teléfono solo puede tener números'),
      fechaNacimiento: expect.stringContaining('fecha de nacimiento'),
      objetivo: expect.stringContaining('El objetivo debe ser'),
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
