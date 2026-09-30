/**
 * Rangos razonables para cada medida de una evaluación (GYMM-13).
 * Las tres medidas básicas coinciden con las restricciones CHECK de la base de datos
 * (migración inicial). La web usa los mismos valores en apps/web/src/features/evaluacion/rangos.ts.
 */
export const RANGOS_BASICOS = {
  pesoKg: { min: 20, max: 350, unidad: 'kg', nombre: 'El peso' },
  tallaCm: { min: 100, max: 250, unidad: 'cm', nombre: 'La talla' },
  porcentajeGrasa: {
    min: 2,
    max: 70,
    unidad: '%',
    nombre: 'El porcentaje de grasa',
  },
} as const;

export const TIPOS_MEDIDA = ['PERIMETRO', 'PLIEGUE', 'TEST_FISICO'] as const;
export type TipoMedida = (typeof TIPOS_MEDIDA)[number];

/** Unidad permitida y rango por tipo de medida (y por unidad, en los tests). */
export const RANGOS_MEDIDA: Record<
  TipoMedida,
  Record<string, { min: number; max: number }>
> = {
  PERIMETRO: { cm: { min: 10, max: 250 } },
  PLIEGUE: { mm: { min: 1, max: 80 } },
  TEST_FISICO: {
    rep: { min: 0, max: 500 },
    s: { min: 0, max: 7200 },
    cm: { min: 0, max: 400 },
    m: { min: 0, max: 5000 },
    kg: { min: 0, max: 500 },
  },
};

export const UNIDADES = ['cm', 'mm', 'rep', 's', 'm', 'kg'] as const;

const formato = (n: number) => n.toLocaleString('es-CO');

export function mensajeRango(
  nombre: string,
  min: number,
  max: number,
  unidad: string,
): string {
  return `${nombre} debe estar entre ${formato(min)} y ${formato(max)} ${unidad}.`;
}
