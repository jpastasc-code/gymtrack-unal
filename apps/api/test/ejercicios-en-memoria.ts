import { randomUUID } from 'node:crypto';

type Grupo = string;
export interface FilaEjercicio {
  id: string;
  nombre: string;
  grupoMuscular: Grupo;
  descripcion: string | null;
  activo: boolean;
  creadoPorId: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

const errorPrisma = (code: string) =>
  Object.assign(new Error(`Prisma ${code}`), { code });

/**
 * Tabla `ejercicio` en memoria con la parte de la API de Prisma que usa el
 * servicio. Los ids en `enUso` simulan ejercicios referenciados por rutinas
 * (borrarlos da P2003, como la llave foránea real).
 */
export function crearEjerciciosEnMemoria(iniciales: Partial<FilaEjercicio>[]) {
  let filas: FilaEjercicio[] = iniciales.map((f) => ({
    id: randomUUID(),
    descripcion: null,
    activo: true,
    creadoPorId: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    grupoMuscular: 'PECHO',
    nombre: 'Sin nombre',
    ...f,
  }));
  const enUso = new Set<string>();

  const ejercicio = {
    findMany: jest.fn(
      ({
        where = {},
        orderBy,
      }: {
        where?: { grupoMuscular?: string; activo?: boolean };
        orderBy?: unknown;
      } = {}) => {
        let r = filas.filter(
          (f) =>
            (where.grupoMuscular === undefined ||
              f.grupoMuscular === where.grupoMuscular) &&
            (where.activo === undefined || f.activo === where.activo),
        );
        if (orderBy)
          r = [...r].sort((a, b) => a.nombre.localeCompare(b.nombre));
        return Promise.resolve(r);
      },
    ),
    findUnique: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(filas.find((f) => f.id === where.id) ?? null),
    ),
    create: jest.fn(({ data }: { data: Partial<FilaEjercicio> }) => {
      if (filas.some((f) => f.nombre === data.nombre))
        return Promise.reject(errorPrisma('P2002'));
      const fila = {
        id: randomUUID(),
        activo: true,
        descripcion: null,
        creadoPorId: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        ...data,
      } as FilaEjercicio;
      filas.push(fila);
      return Promise.resolve(fila);
    }),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<FilaEjercicio>;
      }) => {
        const fila = filas.find((f) => f.id === where.id)!;
        const definidos = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        );
        Object.assign(fila, definidos);
        return Promise.resolve(fila);
      },
    ),
    delete: jest.fn(({ where }: { where: { id: string } }) => {
      if (enUso.has(where.id)) return Promise.reject(errorPrisma('P2003'));
      const fila = filas.find((f) => f.id === where.id);
      filas = filas.filter((f) => f.id !== where.id);
      return Promise.resolve(fila);
    }),
  };

  return {
    ejercicio,
    filas: () => filas,
    idDe: (nombre: string) => filas.find((f) => f.nombre === nombre)!.id,
    marcarEnUso: (id: string) => enUso.add(id),
  };
}
