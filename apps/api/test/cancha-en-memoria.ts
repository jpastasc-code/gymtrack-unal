import { randomUUID } from 'node:crypto';

export interface FilaCancha {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface FilaFranja {
  id: string;
  canchaId: string;
  diaSemana: number;
  horaInicio: Date;
  horaFin: Date;
  activa: boolean;
}

export interface FilaReserva {
  id: string;
  canchaId: string;
  usuarioId: string;
  inicio: Date;
  fin: Date;
  estado: 'CONFIRMADA' | 'CANCELADA';
}

const errorPrisma = (code: string) =>
  Object.assign(new Error(`Prisma ${code}`), { code });

/** Como entrega Prisma 7 la restricción de exclusión de Postgres (SQLSTATE 23P01). */
const errorExclusion = () =>
  Object.assign(new Error('Prisma P2039'), {
    code: 'P2039',
    meta: {
      driverAdapterError: {
        cause: { originalCode: '23P01', kind: 'postgres' },
      },
    },
  });

interface FiltroReservas {
  canchaId?: string;
  usuarioId?: string;
  estado?: string;
  inicio?: { lt: Date };
  fin?: { gt: Date };
}

const cumple = (r: FilaReserva, w: FiltroReservas) =>
  (w.canchaId === undefined || r.canchaId === w.canchaId) &&
  (w.usuarioId === undefined || r.usuarioId === w.usuarioId) &&
  (w.estado === undefined || r.estado === w.estado) &&
  (w.inicio === undefined || r.inicio < w.inicio.lt) &&
  (w.fin === undefined || r.fin > w.fin.gt);

const hora = (h: string) => new Date(`1970-01-01T${h}:00.000Z`);

export const ID_CANCHA = '00000000-0000-4000-8000-0000000000ca';

/**
 * Tablas `cancha`, `franja_cancha` y `reserva_cancha` en memoria, con la parte de
 * la API de Prisma que usa CanchaService. Repite la llave única de la base
 * (cancha, día, hora de inicio) para que crear una franja repetida dé P2002, y la
 * exclusión de reservas confirmadas que se solapan (23P01).
 */
export function crearCanchaEnMemoria({
  franjas: franjasIniciales = [],
  reservas: reservasIniciales = [],
  canchaActiva = true,
}: {
  franjas?: {
    diaSemana: number;
    inicio: string;
    fin: string;
    activa?: boolean;
  }[];
  reservas?: {
    inicio: string;
    fin: string;
    estado?: FilaReserva['estado'];
    usuarioId?: string;
  }[];
  canchaActiva?: boolean;
} = {}) {
  const canchas: FilaCancha[] = [
    {
      id: ID_CANCHA,
      nombre: 'Cancha sintética',
      descripcion: 'Cancha de fútbol 5 en grama sintética.',
      activa: canchaActiva,
    },
  ];
  let franjas: FilaFranja[] = franjasIniciales.map((f) => ({
    id: randomUUID(),
    canchaId: ID_CANCHA,
    diaSemana: f.diaSemana,
    horaInicio: hora(f.inicio),
    horaFin: hora(f.fin),
    activa: f.activa ?? true,
  }));
  const reservas: FilaReserva[] = reservasIniciales.map((r) => ({
    id: randomUUID(),
    canchaId: ID_CANCHA,
    usuarioId: r.usuarioId ?? 'u-otro',
    inicio: new Date(r.inicio),
    fin: new Date(r.fin),
    estado: r.estado ?? 'CONFIRMADA',
  }));

  const porDiaYHora = (a: FilaFranja, b: FilaFranja) =>
    a.diaSemana - b.diaSemana ||
    a.horaInicio.getTime() - b.horaInicio.getTime();

  const cancha = {
    findFirst: jest.fn(({ where }: { where: { activa?: boolean } }) =>
      Promise.resolve(
        canchas.find(
          (c) => where.activa === undefined || c.activa === where.activa,
        ) ?? null,
      ),
    ),
  };

  const franjaCancha = {
    findMany: jest.fn(
      ({
        where,
      }: {
        where: { canchaId: string; activa?: boolean; diaSemana?: number };
      }) =>
        Promise.resolve(
          franjas
            .filter(
              (f) =>
                f.canchaId === where.canchaId &&
                (where.activa === undefined || f.activa === where.activa) &&
                (where.diaSemana === undefined ||
                  f.diaSemana === where.diaSemana),
            )
            .sort(porDiaYHora),
        ),
    ),
    findUnique: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(franjas.find((f) => f.id === where.id) ?? null),
    ),
    create: jest.fn(({ data }: { data: Omit<FilaFranja, 'id' | 'activa'> }) => {
      const repetida = franjas.some(
        (f) =>
          f.canchaId === data.canchaId &&
          f.diaSemana === data.diaSemana &&
          f.horaInicio.getTime() === data.horaInicio.getTime(),
      );
      if (repetida) return Promise.reject(errorPrisma('P2002'));
      const fila: FilaFranja = { id: randomUUID(), activa: true, ...data };
      franjas.push(fila);
      return Promise.resolve(fila);
    }),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<FilaFranja>;
      }) => {
        const fila = franjas.find((f) => f.id === where.id)!;
        Object.assign(fila, data);
        return Promise.resolve(fila);
      },
    ),
    delete: jest.fn(({ where }: { where: { id: string } }) => {
      const fila = franjas.find((f) => f.id === where.id);
      franjas = franjas.filter((f) => f.id !== where.id);
      return Promise.resolve(fila);
    }),
  };

  const conCancha = (r: FilaReserva) => ({
    ...r,
    cancha: { nombre: canchas.find((c) => c.id === r.canchaId)!.nombre },
  });

  const reservaCancha = {
    findMany: jest.fn(({ where }: { where: FiltroReservas }) =>
      Promise.resolve(
        reservas
          .filter((r) => cumple(r, where))
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
          .map(conCancha),
      ),
    ),
    findFirst: jest.fn(({ where }: { where: FiltroReservas }) =>
      Promise.resolve(reservas.find((r) => cumple(r, where)) ?? null),
    ),
    create: jest.fn(
      ({
        data,
      }: {
        data: Pick<FilaReserva, 'canchaId' | 'usuarioId' | 'inicio' | 'fin'>;
      }) => {
        const solapada = reservas.some(
          (r) =>
            r.canchaId === data.canchaId &&
            r.estado === 'CONFIRMADA' &&
            r.inicio < data.fin &&
            data.inicio < r.fin,
        );
        if (solapada) return Promise.reject(errorExclusion());
        const fila: FilaReserva = {
          id: randomUUID(),
          estado: 'CONFIRMADA',
          ...data,
        };
        reservas.push(fila);
        return Promise.resolve(fila);
      },
    ),
  };

  return {
    prisma: { cancha, franjaCancha, reservaCancha },
    franjas: () => franjas,
    reservas: () => reservas,
    idDe: (diaSemana: number, inicio: string) =>
      franjas.find(
        (f) =>
          f.diaSemana === diaSemana &&
          f.horaInicio.getTime() === hora(inicio).getTime(),
      )!.id,
  };
}
