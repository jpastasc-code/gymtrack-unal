import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { VerificadorToken } from './../src/auth/verificador-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

const D1 = '00000000-0000-4000-a000-000000000001';
const USUARIOS = [
  {
    id: D1,
    nombres: 'Daniela',
    apellidos: 'Deportista Prueba',
    documento: '1000000001',
    correo: 'd@gymtrack.test',
    rol: 'DEPORTISTA',
    activo: true,
  },
  {
    id: 'u-instructor',
    nombres: 'Iván',
    apellidos: 'Instructor',
    documento: '1000000003',
    correo: 'i@gymtrack.test',
    rol: 'INSTRUCTOR',
    activo: true,
  },
  {
    id: 'u-deportista',
    nombres: 'Otro',
    apellidos: 'Deportista',
    documento: '1000000002',
    correo: 'o@gymtrack.test',
    rol: 'DEPORTISTA',
    activo: true,
  },
];

describe('Evaluaciones (e2e)', () => {
  let app: INestApplication<App>;
  let guardadas: Record<string, any>[];

  beforeEach(async () => {
    guardadas = [
      {
        id: 'ev-anterior',
        usuarioId: D1,
        instructorId: 'u-instructor',
        fecha: new Date('2026-09-22T15:00:00Z'),
        pesoKg: 63,
        tallaCm: 165,
        porcentajeGrasa: 25,
        nivelActividad: 'MODERADO',
        observaciones: null,
        medidas: [],
      },
    ];
    const conInstructor = (e: Record<string, any>) => ({
      ...e,
      instructor: {
        id: 'u-instructor',
        nombres: 'Iván',
        apellidos: 'Instructor',
      },
    });
    const prisma = {
      estaDisponible: () => Promise.resolve(true),
      $disconnect: jest.fn(),
      usuario: {
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(USUARIOS.find((u) => u.id === where.id) ?? null),
        findMany: () =>
          Promise.resolve(USUARIOS.filter((u) => u.rol === 'DEPORTISTA')),
      },
      evaluacion: {
        findMany: ({ where }: { where: { usuarioId: string } }) =>
          Promise.resolve(
            guardadas
              .filter((e) => e.usuarioId === where.usuarioId)
              .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
              .map(conInstructor),
          ),
        create: ({ data }: { data: Record<string, any> }) => {
          const fila = {
            id: `ev-${guardadas.length + 1}`,
            ...data,
            medidas: data.medidas.create,
          };
          guardadas.push(fila);
          return Promise.resolve(conInstructor(fila));
        },
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

  const post = (quien: string, cuerpo: object) =>
    request(app.getHttpServer())
      .post(`/api/deportistas/${D1}/evaluaciones`)
      .set('Authorization', `Bearer ${quien}`)
      .send(cuerpo);
  const historial = () =>
    request(app.getHttpServer())
      .get(`/api/deportistas/${D1}/evaluaciones`)
      .set('Authorization', 'Bearer instructor');

  it('solo instructores y administradores', async () => {
    await request(app.getHttpServer())
      .get('/api/deportistas')
      .set('Authorization', 'Bearer deportista')
      .expect(403);
    await post('deportista', { pesoKg: 62, tallaCm: 165 }).expect(403);
  });

  it('busca deportistas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/deportistas?q=daniela')
      .set('Authorization', 'Bearer instructor')
      .expect(200);
    expect(res.body).toEqual([
      {
        id: D1,
        nombres: 'Daniela',
        apellidos: 'Deportista Prueba',
        documento: '1000000001',
        correo: 'd@gymtrack.test',
      },
    ]);
  });

  it('registra una evaluación nueva sin sobrescribir la anterior', async () => {
    const res = await post('instructor', {
      pesoKg: 62.5,
      tallaCm: 165,
      porcentajeGrasa: 24.5,
      nivelActividad: 'MODERADO',
      observaciones: 'Buena técnica.',
      medidas: [
        { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 72, unidad: 'cm' },
        {
          tipo: 'TEST_FISICO',
          nombre: 'Salto horizontal',
          valor: 165,
          unidad: 'cm',
        },
      ],
    }).expect(201);
    expect(res.body).toMatchObject({
      pesoKg: 62.5,
      imc: 23,
      instructor: { nombres: 'Iván' },
    });
    expect(res.body.medidas).toHaveLength(2);

    const lista = await historial().expect(200);
    expect(lista.body.map((e: { pesoKg: number }) => e.pesoKg)).toEqual([
      62.5, 63,
    ]);
  });

  it('valida rangos de las medidas básicas con mensajes en español', async () => {
    const res = await post('instructor', {
      pesoKg: 500,
      tallaCm: 50,
      porcentajeGrasa: 90,
    }).expect(400);
    expect(res.body.errores).toEqual({
      pesoKg: 'El peso debe estar entre 20 y 350 kg.',
      tallaCm: 'La talla debe estar entre 100 y 250 cm.',
      porcentajeGrasa: 'El porcentaje de grasa debe estar entre 2 y 70 %.',
    });
  });

  it('valida cada medida e indica su posición', async () => {
    const res = await post('instructor', {
      pesoKg: 62,
      tallaCm: 165,
      medidas: [
        { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 72, unidad: 'cm' },
        { tipo: 'PERIMETRO', nombre: 'Cadera', valor: 'mucho', unidad: 'cm' },
      ],
    }).expect(400);
    expect(res.body.errores).toEqual({
      'medidas.1.valor': 'El valor debe ser un número con máximo 2 decimales.',
    });
  });

  it('exige peso y talla', async () => {
    const res = await post('instructor', {}).expect(400);
    expect(Object.keys(res.body.errores)).toEqual(
      expect.arrayContaining(['pesoKg', 'tallaCm']),
    );
  });

  it('no permite editar ni borrar evaluaciones', async () => {
    await request(app.getHttpServer())
      .patch(`/api/deportistas/${D1}/evaluaciones`)
      .set('Authorization', 'Bearer instructor')
      .send({ pesoKg: 1 })
      .expect(404);
  });

  it('404 para un deportista que no existe', async () => {
    await request(app.getHttpServer())
      .get('/api/deportistas/00000000-0000-4000-a000-000000000999/evaluaciones')
      .set('Authorization', 'Bearer instructor')
      .expect(404);
  });
});
