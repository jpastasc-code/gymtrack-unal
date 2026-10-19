import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { crearRutinasEnMemoria } from '../../test/rutinas-en-memoria';
import type { CrearRutinaDto, EjercicioRutinaDto } from './rutinas.dto';
import { RutinasService } from './rutinas.service';

const USUARIOS = [
  { id: 'd-1', rol: 'DEPORTISTA', activo: true },
  { id: 'd-inactivo', rol: 'DEPORTISTA', activo: false },
  {
    id: 'i-1',
    nombres: 'Iván',
    apellidos: 'Instructor',
    rol: 'INSTRUCTOR',
    activo: true,
  },
];
const EJERCICIOS = [
  {
    id: 'sentadilla',
    nombre: 'Sentadilla',
    grupoMuscular: 'CUADRICEPS',
    activo: true,
  },
  {
    id: 'hip-thrust',
    nombre: 'Hip thrust',
    grupoMuscular: 'GLUTEOS',
    activo: true,
  },
  {
    id: 'press-plano',
    nombre: 'Press banco plano',
    grupoMuscular: 'PECHO',
    activo: true,
  },
  {
    id: 'retirado',
    nombre: 'Trotadora',
    grupoMuscular: 'CARDIO',
    activo: false,
  },
];

function montar() {
  const db = crearRutinasEnMemoria(USUARIOS, EJERCICIOS);
  return { db, servicio: new RutinasService(db.prisma as never) };
}

const ejercicio = (
  ejercicioId: string,
  dia: number,
  extra: Partial<EjercicioRutinaDto> = {},
): EjercicioRutinaDto => ({
  ejercicioId,
  dia,
  series: 3,
  repeticionesObjetivo: '10-12',
  metodo: 'TRADICIONAL',
  ...extra,
});

const rutina = (
  ejercicios: EjercicioRutinaDto[],
  nombre = 'Fase 1',
): CrearRutinaDto => ({
  nombre,
  ejercicios,
});

const errores = async (promesa: Promise<unknown>) => {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BadRequestException);
  return (
    (error as BadRequestException).getResponse() as {
      errores: Record<string, string>;
    }
  ).errores;
};

describe('RutinasService.asignar', () => {
  it('guarda los ejercicios en orden y los agrupa por día', async () => {
    const { servicio, db } = montar();
    const vista = await servicio.asignar(
      'd-1',
      'i-1',
      rutina([
        ejercicio('sentadilla', 1),
        ejercicio('press-plano', 2, {
          metodo: 'PIRAMIDE',
          series: 4,
          repeticionesObjetivo: '12-10-8-6',
        }),
        ejercicio('hip-thrust', 1, { descansoSegundos: 90 }),
      ]),
    );

    expect(vista.vigente).toBe(true);
    expect(vista.instructor).toEqual({
      id: 'i-1',
      nombres: 'Iván',
      apellidos: 'Instructor',
    });
    expect(
      vista.dias.map((d) => [
        d.dia,
        d.ejercicios.map((e) => e.ejercicio.nombre),
      ]),
    ).toEqual([
      [1, ['Sentadilla', 'Hip thrust']],
      [2, ['Press banco plano']],
    ]);
    expect(vista.dias[1].ejercicios[0]).toMatchObject({
      series: 4,
      repeticionesObjetivo: '12-10-8-6',
      metodo: 'PIRAMIDE',
      descansoSegundos: null,
    });
    expect(db.rutinas()[0].ejercicios.map((e) => e.orden)).toEqual([1, 2, 3]);
  });

  it('al asignar una rutina nueva, la anterior deja de estar vigente', async () => {
    const { servicio } = montar();
    await servicio.asignar(
      'd-1',
      'i-1',
      rutina([ejercicio('sentadilla', 1)], 'Anterior'),
    );
    await servicio.asignar(
      'd-1',
      'i-1',
      rutina([ejercicio('hip-thrust', 1)], 'Nueva'),
    );

    const historial = await servicio.historial('d-1');
    expect(historial.map((r) => [r.nombre, r.vigente])).toEqual([
      ['Nueva', true],
      ['Anterior', false],
    ]);
    expect((await servicio.vigente('d-1')).nombre).toBe('Nueva');
  });

  it('permite el mismo ejercicio en días distintos, pero no dos veces el mismo día', async () => {
    const { servicio } = montar();
    await expect(
      servicio.asignar(
        'd-1',
        'i-1',
        rutina([
          ejercicio('hip-thrust', 1),
          ejercicio('hip-thrust', 3),
          ejercicio('sentadilla', 2),
        ]),
      ),
    ).resolves.toBeDefined();

    expect(
      await errores(
        servicio.asignar(
          'd-1',
          'i-1',
          rutina([ejercicio('hip-thrust', 1), ejercicio('hip-thrust', 1)]),
        ),
      ),
    ).toEqual({
      'ejercicios.1.ejercicioId': '"Hip thrust" ya está en el día 1.',
    });
  });

  it('rechaza ejercicios que no existen o están desactivados, sin tocar la rutina vigente', async () => {
    const { servicio, db } = montar();
    await servicio.asignar('d-1', 'i-1', rutina([ejercicio('sentadilla', 1)]));

    expect(
      await errores(
        servicio.asignar(
          'd-1',
          'i-1',
          rutina([ejercicio('no-existe', 1), ejercicio('retirado', 1)]),
        ),
      ),
    ).toEqual({
      'ejercicios.0.ejercicioId': 'Ese ejercicio no existe en el catálogo.',
      'ejercicios.1.ejercicioId':
        '"Trotadora" está desactivado en el catálogo.',
    });
    expect(db.rutinas().filter((r) => r.vigente)).toHaveLength(1);
    expect(db.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('los días van seguidos desde el día 1', async () => {
    const { servicio } = montar();
    expect(
      await errores(
        servicio.asignar(
          'd-1',
          'i-1',
          rutina([ejercicio('sentadilla', 1), ejercicio('hip-thrust', 3)]),
        ),
      ),
    ).toEqual({
      ejercicios:
        'El día 2 no tiene ejercicios: los días van seguidos desde el día 1.',
    });
  });

  it('solo se asigna a deportistas activos', async () => {
    const { servicio } = montar();
    for (const id of ['d-inactivo', 'i-1', 'no-existe']) {
      await expect(
        servicio.asignar(id, 'i-1', rutina([ejercicio('sentadilla', 1)])),
      ).rejects.toThrow(NotFoundException);
    }
  });

  it('si otra persona asignó una rutina al mismo tiempo, responde 409', async () => {
    const { servicio, db } = montar();
    // Simula la carrera: la otra asignación quedó vigente entre el updateMany y el create.
    db.prisma.rutina.create.mockRejectedValueOnce(
      Object.assign(new Error('P2002'), { code: 'P2002' }),
    );
    await expect(
      servicio.asignar('d-1', 'i-1', rutina([ejercicio('sentadilla', 1)])),
    ).rejects.toThrow(ConflictException);
  });
});

describe('RutinasService.vigente', () => {
  it('responde 404 si el usuario aún no tiene rutina', async () => {
    const { servicio } = montar();
    await expect(servicio.vigente('d-1')).rejects.toThrow(
      'Aún no tienes una rutina asignada. Pídesela a tu instructor.',
    );
  });
});
