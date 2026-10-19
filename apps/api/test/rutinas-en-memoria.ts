interface UsuarioFila {
  id: string;
  nombres?: string;
  apellidos?: string;
  rol: string;
  activo: boolean;
}

interface EjercicioFila {
  id: string;
  nombre: string;
  grupoMuscular: string;
  activo: boolean;
}

interface FilaRutinaEjercicio {
  id: string;
  ejercicioId: string;
  dia: number;
  orden: number;
  series: number;
  repeticionesObjetivo: string;
  metodo: string;
  descansoSegundos: number | null;
  notas: string | null;
}

interface FilaRutina {
  id: string;
  nombre: string;
  descripcion: string | null;
  usuarioId: string;
  instructorId: string;
  vigente: boolean;
  fechaAsignacion: Date;
  ejercicios: FilaRutinaEjercicio[];
}

const errorPrisma = (code: string) =>
  Object.assign(new Error(`Prisma ${code}`), { code });

/**
 * Tablas `usuario`, `ejercicio`, `rutina` y `rutina_ejercicio` en memoria, con la
 * parte de la API de Prisma que usa RutinasService. Respeta el índice único parcial
 * real: crear una segunda rutina vigente para el mismo usuario da P2002.
 */
export function crearRutinasEnMemoria(
  usuarios: UsuarioFila[],
  ejercicios: EjercicioFila[],
) {
  const rutinas: FilaRutina[] = [];
  let siguiente = 0;

  const completa = (r: FilaRutina) => {
    const instructor = usuarios.find((u) => u.id === r.instructorId)!;
    return {
      ...r,
      creadoEn: r.fechaAsignacion,
      actualizadoEn: r.fechaAsignacion,
      instructor: {
        id: instructor.id,
        nombres: instructor.nombres ?? '',
        apellidos: instructor.apellidos ?? '',
      },
      ejercicios: r.ejercicios.map((f) => {
        const e = ejercicios.find((x) => x.id === f.ejercicioId)!;
        return {
          ...f,
          rutinaId: r.id,
          ejercicio: {
            id: e.id,
            nombre: e.nombre,
            grupoMuscular: e.grupoMuscular,
          },
        };
      }),
    };
  };
  const filtrar = (where: { usuarioId: string; vigente?: boolean }) =>
    rutinas.filter(
      (r) =>
        r.usuarioId === where.usuarioId &&
        (where.vigente === undefined || r.vigente === where.vigente),
    );

  const prisma = {
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(usuarios.find((u) => u.id === where.id) ?? null),
      ),
    },
    ejercicio: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(ejercicios.filter((e) => where.id.in.includes(e.id))),
      ),
    },
    rutina: {
      findMany: jest.fn(({ where }: { where: { usuarioId: string } }) =>
        Promise.resolve(
          filtrar(where)
            .sort(
              (a, b) =>
                Number(b.vigente) - Number(a.vigente) ||
                b.fechaAsignacion.getTime() - a.fechaAsignacion.getTime(),
            )
            .map(completa),
        ),
      ),
      findFirst: jest.fn(
        ({ where }: { where: { usuarioId: string; vigente: boolean } }) => {
          const r = filtrar(where)[0];
          return Promise.resolve(r ? completa(r) : null);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { usuarioId: string; vigente: boolean };
          data: { vigente: boolean };
        }) => {
          const afectadas = filtrar(where);
          afectadas.forEach((r) => (r.vigente = data.vigente));
          return Promise.resolve({ count: afectadas.length });
        },
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: Omit<FilaRutina, 'id' | 'fechaAsignacion' | 'ejercicios'> & {
            ejercicios: { create: Omit<FilaRutinaEjercicio, 'id'>[] };
          };
        }) => {
          if (data.vigente && filtrar({ ...data, vigente: true }).length > 0) {
            return Promise.reject(errorPrisma('P2002'));
          }
          siguiente += 1;
          const fila: FilaRutina = {
            ...data,
            id: `rutina-${siguiente}`,
            fechaAsignacion: new Date(Date.UTC(2026, 9, 18, 12, siguiente)),
            ejercicios: data.ejercicios.create.map((e, i) => ({
              ...e,
              id: `re-${siguiente}-${i + 1}`,
            })),
          };
          rutinas.push(fila);
          return Promise.resolve(completa(fila));
        },
      ),
    },
    /** Como el `$transaction([...])` de Prisma: devuelve los resultados en orden. */
    $transaction: jest.fn((operaciones: Promise<unknown>[]) =>
      Promise.all(operaciones),
    ),
  };

  return { prisma, rutinas: () => rutinas };
}
