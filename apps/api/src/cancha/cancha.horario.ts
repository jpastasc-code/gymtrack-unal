/**
 * Fechas y horas de la cancha en hora de Colombia (UTC−5, sin horario de verano).
 *
 * - Las franjas se guardan como `time` sin zona: "14:00" significa las 2 p. m. en
 *   Colombia. Prisma las entrega como `Date` del 1970-01-01 en UTC.
 * - Las reservas se guardan como `timestamptz`, es decir, instantes reales.
 * - Las fechas del calendario viajan como texto `AAAA-MM-DD`, sin zona, para que
 *   el navegador no las corra un día al convertirlas.
 */

/** Colombia está 5 horas detrás de UTC todo el año. */
const HORAS_DETRAS_DE_UTC = 5;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const dosCifras = (n: number) => String(n).padStart(2, '0');

const aTexto = (d: Date) =>
  `${d.getUTCFullYear()}-${dosCifras(d.getUTCMonth() + 1)}-${dosCifras(d.getUTCDate())}`;

/** "2026-10-21" → medianoche UTC de ese día (solo para hacer cuentas de calendario). */
function aFechaUtc(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** true si el texto es una fecha `AAAA-MM-DD` que existe (rechaza 2026-02-30). */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  return aTexto(aFechaUtc(fecha)) === fecha;
}

/** La fecha del calendario en Colombia en ese instante. */
export function fechaEnColombia(instante: Date): string {
  return aTexto(
    new Date(instante.getTime() - HORAS_DETRAS_DE_UTC * 60 * 60 * 1000),
  );
}

export function sumarDias(fecha: string, dias: number): string {
  return aTexto(new Date(aFechaUtc(fecha).getTime() + dias * MS_POR_DIA));
}

/** 1 = lunes … 7 = domingo (ISO 8601), igual que `franja_cancha.dia_semana`. */
export function diaSemanaIso(fecha: string): number {
  const dia = aFechaUtc(fecha).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** El lunes de la semana a la que pertenece la fecha. */
export function lunesDe(fecha: string): string {
  return sumarDias(fecha, 1 - diaSemanaIso(fecha));
}

/** El instante real en que, en Colombia, es esa fecha a esa hora ("14:00"). */
export function instanteEnColombia(fecha: string, hora: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, h + HORAS_DETRAS_DE_UTC, m));
}

/** Columna `time` leída por Prisma → "14:00". */
export function horaDeTime(valor: Date): string {
  return `${dosCifras(valor.getUTCHours())}:${dosCifras(valor.getUTCMinutes())}`;
}

/** "14:00" → valor que Prisma guarda en una columna `time`. */
export function timeDeHora(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00.000Z`);
}

/** Minutos desde la medianoche: "14:30" → 870. Sirve para comparar horas. */
export function minutosDe(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
