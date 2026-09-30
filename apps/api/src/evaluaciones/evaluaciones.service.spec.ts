import { BadRequestException, NotFoundException } from '@nestjs/common';
import { calcularImc, EvaluacionesService } from './evaluaciones.service';

const DEPORTISTA = {
  id: 'd-1',
  nombres: 'Daniela',
  apellidos: 'Deportista Prueba',
  documento: '1000000001',
  correo: 'deportista@gymtrack.test',
  rol: 'DEPORTISTA',
  activo: true,
};
const OTROS = [
  {
    ...DEPORTISTA,
    id: 'd-2',
    nombres: 'Santiago',
    apellidos: 'Muñoz',
    documento: '1000000002',
    correo: 's@gymtrack.test',
  },
  {
    ...DEPORTISTA,
    id: 'i-1',
    nombres: 'Iván',
    apellidos: 'Instructor',
    rol: 'INSTRUCTOR',
  },
  {
    ...DEPORTISTA,
    id: 'd-3',
    nombres: 'Inactiva',
    apellidos: 'Zapata',
    activo: false,
  },
];
const USUARIOS = [DEPORTISTA, ...OTROS];
const AHORA = new Date('2026-09-29T20:00:00Z');

function montar() {
  const creadas: unknown[] = [];
  const prisma = {
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(USUARIOS.find((u) => u.id === where.id) ?? null),
      ),
      findMany: jest.fn(
        ({ where }: { where: { rol: string; activo: boolean } }) =>
          Promise.resolve(
            USUARIOS.filter(
              (u) => u.rol === where.rol && u.activo === where.activo,
            ),
          ),
      ),
    },
    evaluacion: {
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        creadas.push(data);
        return Promise.resolve({
          id: 'ev-1',
          ...data,
          medidas: data.medidas.create,
          instructor: { id: 'i-1', nombres: 'Iván', apellidos: 'Instructor' },
        });
      }),
    },
  };
  return {
    prisma,
    creadas,
    servicio: new EvaluacionesService(prisma as never),
  };
}

const BASE = { pesoKg: 62.5, tallaCm: 165, porcentajeGrasa: 24.5 };

describe('calcularImc', () => {
  it('peso / talla² con un decimal', () => {
    expect(calcularImc(62.5, 165)).toBe(23);
    expect(calcularImc(80, 180)).toBe(24.7);
  });
});

describe('EvaluacionesService.buscarDeportistas', () => {
  it('solo deportistas activos, buscando por nombre, documento o correo sin tildes', async () => {
    const { servicio } = montar();
    expect((await servicio.buscarDeportistas()).map((d) => d.id)).toEqual([
      'd-1',
      'd-2',
    ]);
    expect(
      (await servicio.buscarDeportistas('munoz')).map((d) => d.id),
    ).toEqual(['d-2']);
    expect(
      (await servicio.buscarDeportistas('1000000001')).map((d) => d.id),
    ).toEqual(['d-1']);
    expect(await servicio.buscarDeportistas('zapata')).toEqual([]);
  });
});

describe('EvaluacionesService.registrar', () => {
  it('guarda una evaluación nueva con su fecha, medidas e instructor', async () => {
    const { servicio, creadas } = montar();
    const vista = await servicio.registrar(
      'd-1',
      'i-1',
      {
        ...BASE,
        medidas: [
          {
            tipo: 'TEST_FISICO',
            nombre: 'Flexiones en 1 minuto',
            valor: 18,
            unidad: 'rep',
          },
          { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 72, unidad: 'cm' },
        ],
      },
      AHORA,
    );
    expect(creadas[0]).toMatchObject({
      usuarioId: 'd-1',
      instructorId: 'i-1',
      fecha: AHORA,
      pesoKg: 62.5,
    });
    expect(vista).toMatchObject({
      pesoKg: 62.5,
      tallaCm: 165,
      porcentajeGrasa: 24.5,
      imc: 23,
      fecha: AHORA.toISOString(),
    });
    // Perímetros primero, luego tests.
    expect(vista.medidas.map((m) => m.nombre)).toEqual([
      'Cintura',
      'Flexiones en 1 minuto',
    ]);
  });

  it('usa la fecha indicada si no es futura', async () => {
    const { servicio, creadas } = montar();
    await servicio.registrar(
      'd-1',
      'i-1',
      { ...BASE, fecha: '2026-09-28T14:00:00Z' },
      AHORA,
    );
    expect(creadas[0]).toMatchObject({
      fecha: new Date('2026-09-28T14:00:00Z'),
    });
    await expect(
      servicio.registrar(
        'd-1',
        'i-1',
        { ...BASE, fecha: '2026-10-01T00:00:00Z' },
        AHORA,
      ),
    ).rejects.toMatchObject({
      response: {
        errores: { fecha: 'La fecha de la evaluación no puede ser futura.' },
      },
    });
  });

  it('valida el rango y la unidad de cada medida, e indica cuál falló', async () => {
    const { servicio, prisma } = montar();
    const error = await servicio
      .registrar(
        'd-1',
        'i-1',
        {
          ...BASE,
          medidas: [
            { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 720, unidad: 'cm' },
            { tipo: 'PERIMETRO', nombre: 'Cadera', valor: 98, unidad: 'rep' },
            {
              tipo: 'TEST_FISICO',
              nombre: 'Flexiones en 1 minuto',
              valor: 600,
              unidad: 'rep',
            },
          ],
        },
        AHORA,
      )
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      errores: {
        'medidas.0.valor': 'Cintura debe estar entre 10 y 250 cm.',
        'medidas.1.unidad': 'La unidad de "Cadera" debe ser cm.',
        'medidas.2.valor':
          'Flexiones en 1 minuto debe estar entre 0 y 500 rep.',
      },
    });
    expect(prisma.evaluacion.create).not.toHaveBeenCalled();
  });

  it('rechaza medidas repetidas en la misma evaluación', async () => {
    const { servicio } = montar();
    await expect(
      servicio.registrar(
        'd-1',
        'i-1',
        {
          ...BASE,
          medidas: [
            { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 72, unidad: 'cm' },
            { tipo: 'PERIMETRO', nombre: 'cintura', valor: 73, unidad: 'cm' },
          ],
        },
        AHORA,
      ),
    ).rejects.toMatchObject({
      response: {
        errores: { 'medidas.1.nombre': 'La medida "cintura" está repetida.' },
      },
    });
  });

  it('solo evalúa deportistas activos', async () => {
    const { servicio } = montar();
    await expect(
      servicio.registrar('i-1', 'i-1', BASE, AHORA),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      servicio.registrar('d-3', 'i-1', BASE, AHORA),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
