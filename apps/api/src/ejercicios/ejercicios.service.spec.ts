import { ConflictException, NotFoundException } from '@nestjs/common';
import { crearEjerciciosEnMemoria } from '../../test/ejercicios-en-memoria';
import { EjerciciosService, normalizar } from './ejercicios.service';

const CATALOGO = [
  {
    nombre: 'Jalón al pecho en polea',
    grupoMuscular: 'ESPALDA',
    descripcion: 'Halar la barra hacia el pecho.',
  },
  {
    nombre: 'Remo con barra',
    grupoMuscular: 'ESPALDA',
    descripcion: 'Torso inclinado, halar hacia el abdomen.',
  },
  {
    nombre: 'Press de banca plano con barra',
    grupoMuscular: 'PECHO',
    descripcion: null,
  },
  {
    nombre: 'Sentadilla con barra',
    grupoMuscular: 'CUADRICEPS',
    descripcion: 'Bajar hasta muslos paralelos.',
  },
  {
    nombre: 'Curl femoral acostado',
    grupoMuscular: 'ISQUIOTIBIALES',
    activo: false,
  },
];

function montar() {
  const db = crearEjerciciosEnMemoria(CATALOGO);
  return {
    db,
    servicio: new EjerciciosService({ ejercicio: db.ejercicio } as never),
  };
}

describe('normalizar', () => {
  it('quita tildes, mayúsculas y espacios de más', () => {
    expect(normalizar('  Jalón   al PECHO ')).toBe('jalon al pecho');
    expect(normalizar('Glúteos')).toBe('gluteos');
  });
});

describe('EjerciciosService.listar', () => {
  it('ordena por nombre y oculta los desactivados', async () => {
    const { servicio } = montar();
    const lista = await servicio.listar({}, false);
    expect(lista.map((e) => e.nombre)).toEqual([
      'Jalón al pecho en polea',
      'Press de banca plano con barra',
      'Remo con barra',
      'Sentadilla con barra',
    ]);
  });

  it('busca sin importar tildes ni mayúsculas, en nombre y descripción', async () => {
    const { servicio } = montar();
    expect(
      (await servicio.listar({ q: 'JALON' }, false)).map((e) => e.nombre),
    ).toEqual(['Jalón al pecho en polea']);
    expect(
      (await servicio.listar({ q: 'abdomen' }, false)).map((e) => e.nombre),
    ).toEqual(['Remo con barra']);
    // Todas las palabras deben aparecer, en cualquier orden.
    expect(
      (await servicio.listar({ q: 'barra sentadilla' }, false)).map(
        (e) => e.nombre,
      ),
    ).toEqual(['Sentadilla con barra']);
  });

  it('filtra por grupo muscular y combina con la búsqueda', async () => {
    const { servicio } = montar();
    expect(await servicio.listar({ grupo: 'ESPALDA' }, false)).toHaveLength(2);
    expect(
      (await servicio.listar({ grupo: 'ESPALDA', q: 'remo' }, false)).map(
        (e) => e.nombre,
      ),
    ).toEqual(['Remo con barra']);
  });

  it('solo muestra desactivados a quien puede verlos y los pide', async () => {
    const { servicio } = montar();
    expect(
      await servicio.listar({ incluirInactivos: true }, false),
    ).toHaveLength(4);
    expect(
      await servicio.listar({ incluirInactivos: true }, true),
    ).toHaveLength(5);
  });
});

describe('EjerciciosService: crear, editar y eliminar', () => {
  it('crea y registra quién lo creó', async () => {
    const { servicio, db } = montar();
    const nuevo = await servicio.crear(
      { nombre: 'Hip thrust con barra', grupoMuscular: 'GLUTEOS' },
      'u-instructor',
    );
    expect(nuevo).toMatchObject({
      nombre: 'Hip thrust con barra',
      grupoMuscular: 'GLUTEOS',
      activo: true,
      descripcion: null,
    });
    expect(db.filas().find((f) => f.id === nuevo.id)?.creadoPorId).toBe(
      'u-instructor',
    );
  });

  it('no permite nombres repetidos aunque cambien tildes o mayúsculas', async () => {
    const { servicio } = montar();
    await expect(
      servicio.crear(
        { nombre: 'jalon al PECHO en polea', grupoMuscular: 'ESPALDA' },
        'u',
      ),
    ).rejects.toThrow(
      'Ya existe un ejercicio llamado "Jalón al pecho en polea".',
    );
  });

  it('al editar, el ejercicio puede conservar su propio nombre', async () => {
    const { servicio, db } = montar();
    const id = db.idDe('Remo con barra');
    await expect(
      servicio.actualizar(id, {
        nombre: 'Remo con barra',
        descripcion: 'Nueva',
      }),
    ).resolves.toMatchObject({ descripcion: 'Nueva' });
    await expect(
      servicio.actualizar(id, { nombre: 'Sentadilla con barra' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('desactiva y reactiva', async () => {
    const { servicio, db } = montar();
    const id = db.idDe('Remo con barra');
    expect((await servicio.actualizar(id, { activo: false })).activo).toBe(
      false,
    );
    expect(
      (await servicio.listar({}, false)).map((e) => e.nombre),
    ).not.toContain('Remo con barra');
    expect((await servicio.actualizar(id, { activo: true })).activo).toBe(true);
  });

  it('elimina un ejercicio sin uso, pero pide desactivar uno que está en rutinas', async () => {
    const { servicio, db } = montar();
    await servicio.eliminar(db.idDe('Remo con barra'));
    expect(db.filas().map((f) => f.nombre)).not.toContain('Remo con barra');

    const enUso = db.idDe('Sentadilla con barra');
    db.marcarEnUso(enUso);
    await expect(servicio.eliminar(enUso)).rejects.toThrow(
      /Desactívalo para ocultarlo del catálogo/,
    );
  });

  it('responde 404 para un ejercicio que no existe', async () => {
    const { servicio } = montar();
    await expect(
      servicio.obtener('00000000-0000-4000-a000-000000000999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
