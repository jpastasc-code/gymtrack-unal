interface UsuarioFila {
  id: string;
  rol: string;
  activo: boolean;
}

interface RutinaFila {
  id: string;
  usuarioId: string;
  vigente: boolean;
  /** Ejercicios de la rutina con sus series. */
  ejercicios: { ejercicioId: string; series: number }[];
}

interface SerieFila {
  id: string;
  sesionId: string;
  ejercicioId: string;
  numeroSerie: number;
  cargaKg: number;
  repeticiones: number;
  registradaEn: Date;
}

export interface SesionFila {
  id: string;
  usuarioId: string;
  rutinaId: string | null;
  inicio: Date;
  fin: Date | null;
  notas: string | null;
}

const errorPrisma = (code: string) =>
  Object.assign(new Error(`Prisma ${code}`), { code });

/**
 * Tablas `usuario`, `rutina`, `rutina_ejercicio`, `sesion` y `serie_registrada` en
 * memoria, con la parte de la API de Prisma que usa SesionesService. Respeta los
 * índices únicos reales: una sesión abierta por usuario y una fila por
 * (sesión, ejercicio, número de serie).
 */
export function crearSesionesEnMemoria(
  usuarios: UsuarioFila[],
  rutinas: RutinaFila[],
  iniciales: { sesiones?: SesionFila[]; series?: SerieFila[] } = {},
) {
  const sesiones = [...(iniciales.sesiones ?? [])];
  const series = [...(iniciales.series ?? [])];
  let siguiente = 0;
  // UUID válidos: las rutas validan el id de la sesión con ParseUUIDPipe.
  const nuevoId = () =>
    `00000000-0000-4000-8000-${String(++siguiente).padStart(12, '0')}`;
  // Cada escritura avanza un milisegundo: el orden de registro queda determinado.
  let reloj = Date.now();
  const ahora = () => new Date(++reloj);

  const conSeries = (s: SesionFila) => ({
    ...s,
    series: series
      .filter((x) => x.sesionId === s.id)
      .sort((a, b) => a.registradaEn.getTime() - b.registradaEn.getTime()),
  });
  const sesion = (id: string) => sesiones.find((s) => s.id === id);

  const prisma = {
    usuario: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(usuarios.find((u) => u.id === where.id) ?? null),
      ),
    },
    rutina: {
      findFirst: jest.fn(
        ({ where }: { where: { usuarioId: string; vigente: boolean } }) => {
          const r = rutinas.find(
            (x) => x.usuarioId === where.usuarioId && x.vigente,
          );
          return Promise.resolve(r ?? null);
        },
      ),
    },
    rutinaEjercicio: {
      findMany: jest.fn(
        ({ where }: { where: { rutinaId: string; ejercicioId: string } }) =>
          Promise.resolve(
            (rutinas.find((r) => r.id === where.rutinaId)?.ejercicios ?? [])
              .filter((e) => e.ejercicioId === where.ejercicioId)
              .map(({ series }) => ({ series })),
          ),
      ),
    },
    sesion: {
      findFirst: jest.fn(
        ({ where }: { where: { usuarioId: string; fin: null } }) => {
          const s = sesiones.find(
            (x) => x.usuarioId === where.usuarioId && x.fin === null,
          );
          return Promise.resolve(s ? conSeries(s) : null);
        },
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const s = sesion(where.id);
        return Promise.resolve(s ? conSeries(s) : null);
      }),
      create: jest.fn(
        ({ data }: { data: { usuarioId: string; rutinaId: string } }) => {
          if (sesiones.some((s) => s.usuarioId === data.usuarioId && !s.fin)) {
            return Promise.reject(errorPrisma('P2002'));
          }
          const fila: SesionFila = {
            ...data,
            id: nuevoId(),
            inicio: ahora(),
            fin: null,
            notas: null,
          };
          sesiones.push(fila);
          return Promise.resolve(conSeries(fila));
        },
      ),
      update: jest.fn(
        ({ where, data }: { where: { id: string }; data: { fin: Date } }) => {
          const s = sesion(where.id)!;
          s.fin = data.fin;
          return Promise.resolve(conSeries(s));
        },
      ),
    },
    serieRegistrada: {
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: {
            sesionId_ejercicioId_numeroSerie: Pick<
              SerieFila,
              'sesionId' | 'ejercicioId' | 'numeroSerie'
            >;
          };
          create: Omit<SerieFila, 'id' | 'registradaEn'>;
          update: Pick<SerieFila, 'cargaKg' | 'repeticiones'>;
        }) => {
          const clave = where.sesionId_ejercicioId_numeroSerie;
          const existente = series.find(
            (s) =>
              s.sesionId === clave.sesionId &&
              s.ejercicioId === clave.ejercicioId &&
              s.numeroSerie === clave.numeroSerie,
          );
          if (existente) {
            Object.assign(existente, update);
            return Promise.resolve(existente);
          }
          const fila = { ...create, id: nuevoId(), registradaEn: ahora() };
          series.push(fila);
          return Promise.resolve(fila);
        },
      ),
      findMany: jest.fn(
        (consulta: {
          where:
            | { ejercicioId: { in: string[] }; sesion: { usuarioId: string } }
            | { OR: { ejercicioId: string; sesionId: string }[] };
          distinct?: string[];
        }) => {
          const { where } = consulta;
          if ('OR' in where) {
            return Promise.resolve(
              series
                .filter((s) =>
                  where.OR.some(
                    (o) =>
                      o.ejercicioId === s.ejercicioId &&
                      o.sesionId === s.sesionId,
                  ),
                )
                .sort((a, b) => a.numeroSerie - b.numeroSerie)
                .map((s) => ({
                  ...s,
                  sesion: { inicio: sesion(s.sesionId)!.inicio },
                })),
            );
          }
          // La serie más reciente de cada ejercicio en sesiones terminadas del usuario.
          const vistos = new Set<string>();
          return Promise.resolve(
            series
              .filter((s) => {
                const de = sesion(s.sesionId)!;
                return (
                  where.ejercicioId.in.includes(s.ejercicioId) &&
                  de.usuarioId === where.sesion.usuarioId &&
                  de.fin !== null
                );
              })
              .sort(
                (a, b) => b.registradaEn.getTime() - a.registradaEn.getTime(),
              )
              .filter(
                (s) => !vistos.has(s.ejercicioId) && vistos.add(s.ejercicioId),
              )
              .map(({ ejercicioId, sesionId }) => ({ ejercicioId, sesionId })),
          );
        },
      ),
    },
  };

  return { prisma, sesiones: () => sesiones, series: () => series };
}
