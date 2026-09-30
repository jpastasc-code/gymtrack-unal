import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { crearEjerciciosEnMemoria } from './ejercicios-en-memoria';

const USUARIOS = {
  instructor: { id: 'u-instructor', rol: 'INSTRUCTOR', activo: true },
  deportista: { id: 'u-deportista', rol: 'DEPORTISTA', activo: true },
} as const;

describe('Catálogo de ejercicios (e2e)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof crearEjerciciosEnMemoria>;

  beforeEach(async () => {
    db = crearEjerciciosEnMemoria([
      { nombre: 'Jalón al pecho en polea', grupoMuscular: 'ESPALDA' },
      { nombre: 'Remo con barra', grupoMuscular: 'ESPALDA' },
      { nombre: 'Sentadilla con barra', grupoMuscular: 'CUADRICEPS' },
    ]);
    const prisma = {
      estaDisponible: () => Promise.resolve(true),
      $disconnect: jest.fn(),
      ejercicio: db.ejercicio,
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

  it('exige sesión para ver el catálogo', async () => {
    await request(app.getHttpServer()).get('/api/ejercicios').expect(401);
  });

  it('un deportista puede consultar, buscar y filtrar', async () => {
    const todos = await como('deportista').get('/api/ejercicios').expect(200);
    expect(todos.body).toHaveLength(3);
    const busqueda = await como('deportista')
      .get('/api/ejercicios?q=jalon')
      .expect(200);
    expect(busqueda.body.map((e: { nombre: string }) => e.nombre)).toEqual([
      'Jalón al pecho en polea',
    ]);
    const grupo = await como('deportista')
      .get('/api/ejercicios?grupo=ESPALDA')
      .expect(200);
    expect(grupo.body).toHaveLength(2);
  });

  it('rechaza un grupo muscular inexistente con un mensaje claro', async () => {
    const res = await como('deportista')
      .get('/api/ejercicios?grupo=ALAS')
      .expect(400);
    expect(res.body.errores.grupo).toBe('El grupo muscular no es válido.');
  });

  it('un deportista no puede crear, editar ni eliminar', async () => {
    const id = db.idDe('Remo con barra');
    await como('deportista')
      .post('/api/ejercicios', {
        nombre: 'Burpees',
        grupoMuscular: 'CUERPO_COMPLETO',
      })
      .expect(403);
    await como('deportista')
      .patch(`/api/ejercicios/${id}`, { activo: false })
      .expect(403);
    await como('deportista').delete(`/api/ejercicios/${id}`).expect(403);
    expect(db.filas()).toHaveLength(3);
  });

  it('un instructor crea un ejercicio y valida los datos', async () => {
    const res = await como('instructor')
      .post('/api/ejercicios', {
        nombre: '  Burpees  ',
        grupoMuscular: 'CUERPO_COMPLETO',
        descripcion: 'Salto y flexión.',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      nombre: 'Burpees',
      grupoMuscular: 'CUERPO_COMPLETO',
      activo: true,
    });

    const invalido = await como('instructor')
      .post('/api/ejercicios', { nombre: 'ab', grupoMuscular: 'ALAS' })
      .expect(400);
    expect(invalido.body.errores).toEqual({
      nombre: 'El nombre debe tener al menos 3 caracteres.',
      grupoMuscular: 'Elige un grupo muscular de la lista.',
    });
  });

  it('responde 409 si el nombre ya existe (sin importar tildes)', async () => {
    const res = await como('instructor')
      .post('/api/ejercicios', {
        nombre: 'JALON al pecho en polea',
        grupoMuscular: 'ESPALDA',
      })
      .expect(409);
    expect(res.body.errores.nombre).toMatch(/Ya existe un ejercicio llamado/);
  });

  it('un instructor edita, desactiva y ve los desactivados si los pide', async () => {
    const id = db.idDe('Remo con barra');
    await como('instructor')
      .patch(`/api/ejercicios/${id}`, { descripcion: 'Espalda recta.' })
      .expect(200);
    await como('instructor')
      .patch(`/api/ejercicios/${id}`, { activo: false })
      .expect(200);
    expect(
      (await como('instructor').get('/api/ejercicios').expect(200)).body,
    ).toHaveLength(2);
    expect(
      (
        await como('instructor')
          .get('/api/ejercicios?incluirInactivos=true')
          .expect(200)
      ).body,
    ).toHaveLength(3);
    // Un deportista nunca ve los desactivados, aunque los pida.
    expect(
      (
        await como('deportista')
          .get('/api/ejercicios?incluirInactivos=true')
          .expect(200)
      ).body,
    ).toHaveLength(2);
  });

  it('elimina un ejercicio sin uso y responde 409 si está en rutinas', async () => {
    await como('instructor')
      .delete(`/api/ejercicios/${db.idDe('Remo con barra')}`)
      .expect(204);
    const enUso = db.idDe('Sentadilla con barra');
    db.marcarEnUso(enUso);
    const res = await como('instructor')
      .delete(`/api/ejercicios/${enUso}`)
      .expect(409);
    expect(res.body.message).toMatch(/Desactívalo/);
  });

  it('responde 404 para ids inexistentes o mal formados', async () => {
    await como('deportista')
      .get('/api/ejercicios/00000000-0000-4000-a000-000000000999')
      .expect(404);
    await como('deportista').get('/api/ejercicios/no-es-un-id').expect(404);
  });
});
