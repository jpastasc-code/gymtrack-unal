interface UsuarioFila {
  id: string;
  rol: string;
  activo: boolean;
}

export interface FranjaFila {
  id: string;
  diaSemana: number;
  /** "06:00", como lo guarda una columna `time`. */
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  activa: boolean;
}

export interface ReservaFila {
  id: string;
  usuarioId: string;
  franjaId: string;
  /** AAAA-MM-DD. */
  fecha: string;
  estado: 'CONFIRMADA' | 'CANCELADA';
  canceladaEn: Date | null;
}

const errorPrisma = (code: string) =>
  Object.assign(new Error(`Prisma ${code}`), { code });

const time = (hora: string) => new Date(`1970-01-01T${hora}:00.000Z`);
const date = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);
const texto = (d: Date) => d.toISOString().slice(0, 10);

type FiltroFecha = { gte?: Date; lte?: Date } | Date | undefined;
const cumpleFecha = (fecha: string, filtro: FiltroFecha) => {
  if (!filtro) return true;
  if (filtro instanceof Date) return fecha === texto(filtro);
  return (
    (!filtro.gte || fecha >= texto(filtro.gte)) &&
    (!filtro.lte || fecha <= texto(filtro.lte))
  );
};

/**
 * Tablas `usuario`, `franja_gimnasio` y `reserva_gimnasio` en memoria, con la
 * parte de la API de Prisma que usa GimnasioService. Respeta el índice único
 * parcial real: una reserva confirmada por persona, franja y fecha (P2002).
 */
export function crearGimnasioEnMemoria(
  usuarios: UsuarioFila[],
  franjasIniciales: FranjaFila[],
  reservasIniciales: ReservaFila[] = [],
) {
  const franjas = franjasIniciales.map((f) => ({ ...f }));
  const reservas = reservasIniciales.map((r) => ({ ...r }));
  let siguiente = 0;
  const bloqueos: string[] = [];

  const franjaPrisma = (f: FranjaFila) => ({
    ...f,
    horaInicio: time(f.horaInicio),
    horaFin: time(f.horaFin),
  });
  const reservaPrisma = (r: ReservaFila) => ({
    ...r,
    fecha: date(r.fecha),
    creadoEn: new Date(),
    franja: franjaPrisma(franjas.find((f) => f.id === r.franjaId)!),
  });
  const filtrar = (where: {
    usuarioId?: string;
    franjaId?: string;
    estado?: string;
    fecha?: FiltroFecha;
  }) =>
    reservas.filter(
      (r) =>
        (!where.usuarioId || r.usuarioId === where.usuarioId) &&
        (!where.franjaId || r.franjaId === where.franjaId) &&
        (!where.estado || r.estado === where.estado) &&
        cumpleFecha(r.fecha, where.fecha),
    );

  const prisma = {
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(usuarios.find((u) => u.id === where.id) ?? null),
      ),
    },
    franjaGimnasio: {
      findMany: jest.fn(({ where }: { where?: { activa?: boolean } } = {}) =>
        Promise.resolve(
          franjas
            .filter(
              (f) => where?.activa === undefined || f.activa === where.activa,
            )
            .sort(
              (a, b) =>
                a.diaSemana - b.diaSemana ||
                a.horaInicio.localeCompare(b.horaInicio),
            )
            .map(franjaPrisma),
        ),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const f = franjas.find((x) => x.id === where.id);
        return Promise.resolve(f ? franjaPrisma(f) : null);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { cupoMaximo?: number; activa?: boolean };
        }) => {
          const f = franjas.find((x) => x.id === where.id)!;
          if (data.cupoMaximo !== undefined) f.cupoMaximo = data.cupoMaximo;
          if (data.activa !== undefined) f.activa = data.activa;
          return Promise.resolve(franjaPrisma(f));
        },
      ),
    },
    reservaGimnasio: {
      findMany: jest.fn(({ where }: { where: Parameters<typeof filtrar>[0] }) =>
        Promise.resolve(filtrar(where).map(reservaPrisma)),
      ),
      count: jest.fn(({ where }: { where: Parameters<typeof filtrar>[0] }) =>
        Promise.resolve(filtrar(where).length),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const r = reservas.find((x) => x.id === where.id);
        return Promise.resolve(r ? reservaPrisma(r) : null);
      }),
      create: jest.fn(
        ({
          data,
        }: {
          data: { usuarioId: string; franjaId: string; fecha: Date };
        }) => {
          const fecha = texto(data.fecha);
          const repetida = filtrar({
            usuarioId: data.usuarioId,
            franjaId: data.franjaId,
            estado: 'CONFIRMADA',
            fecha: data.fecha,
          });
          if (repetida.length > 0) return Promise.reject(errorPrisma('P2002'));
          siguiente += 1;
          const fila: ReservaFila = {
            id: `00000000-0000-4000-8000-${String(siguiente).padStart(12, '0')}`,
            usuarioId: data.usuarioId,
            franjaId: data.franjaId,
            fecha,
            estado: 'CONFIRMADA',
            canceladaEn: null,
          };
          reservas.push(fila);
          return Promise.resolve(reservaPrisma(fila));
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string; estado: string };
          data: { estado: 'CANCELADA'; canceladaEn: Date };
        }) => {
          const afectadas = reservas.filter(
            (r) => r.id === where.id && r.estado === where.estado,
          );
          afectadas.forEach((r) => Object.assign(r, data));
          return Promise.resolve({ count: afectadas.length });
        },
      ),
    },
    /** Registra qué franja se bloqueó con `SELECT … FOR UPDATE`. */
    $queryRaw: jest.fn(
      (partes: TemplateStringsArray, ...valores: unknown[]) => {
        if (partes.join('?').includes('FOR UPDATE')) {
          bloqueos.push(String(valores[0]));
        }
        return Promise.resolve([]);
      },
    ),
    /** Transacción interactiva: el callback recibe el mismo cliente. */
    $transaction: jest.fn(
      (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => fn(prisma),
    ),
  };

  return {
    prisma,
    franjas: () => franjas,
    reservas: () => reservas,
    bloqueos: () => bloqueos,
  };
}
