import {
  diaSemanaIso,
  esFechaValida,
  fechaEnColombia,
  horaDeTime,
  instanteEnColombia,
  lunesDe,
  minutosDe,
  sumarDias,
  timeDeHora,
} from './cancha.horario';

describe('horario de la cancha (hora de Colombia)', () => {
  it('toma la fecha de Colombia, no la de UTC', () => {
    // 3 a. m. UTC del 21 son las 10 p. m. del 20 en Colombia.
    expect(fechaEnColombia(new Date('2026-10-21T03:00:00Z'))).toBe(
      '2026-10-20',
    );
    expect(fechaEnColombia(new Date('2026-10-21T05:00:00Z'))).toBe(
      '2026-10-21',
    );
  });

  it('numera los días como ISO 8601 (lunes = 1, domingo = 7)', () => {
    expect(diaSemanaIso('2026-10-19')).toBe(1);
    expect(diaSemanaIso('2026-10-24')).toBe(6);
    expect(diaSemanaIso('2026-10-25')).toBe(7);
  });

  it('encuentra el lunes de la semana, también desde el domingo', () => {
    expect(lunesDe('2026-10-19')).toBe('2026-10-19');
    expect(lunesDe('2026-10-21')).toBe('2026-10-19');
    expect(lunesDe('2026-10-25')).toBe('2026-10-19');
    // Cruza de mes y de año.
    expect(lunesDe('2026-11-01')).toBe('2026-10-26');
    expect(lunesDe('2027-01-01')).toBe('2026-12-28');
  });

  it('suma días cruzando meses', () => {
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('convierte una hora de Colombia en el instante real', () => {
    expect(instanteEnColombia('2026-10-21', '14:00').toISOString()).toBe(
      '2026-10-21T19:00:00.000Z',
    );
    // Las 8 p. m. en Colombia ya son el día siguiente en UTC.
    expect(instanteEnColombia('2026-10-21', '20:30').toISOString()).toBe(
      '2026-10-22T01:30:00.000Z',
    );
  });

  it('lee y escribe columnas time sin correr la hora', () => {
    expect(horaDeTime(timeDeHora('06:30'))).toBe('06:30');
    expect(horaDeTime(new Date('1970-01-01T21:00:00.000Z'))).toBe('21:00');
    expect(minutosDe('14:30')).toBe(870);
  });

  it('solo acepta fechas que existen', () => {
    expect(esFechaValida('2026-10-21')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('21/10/2026')).toBe(false);
  });
});
