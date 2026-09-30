/**
 * Datos de prueba de GymTrack UNAL (GYMM-16).
 * Los IDs son fijos para que el seed sea idempotente y los usuarios de prueba tengan
 * el mismo UUID en Supabase Auth (auth.users) y en la tabla `usuario`.
 */
import type {
  GrupoMuscular,
  MetodoEntrenamiento,
  NivelActividad,
  Objetivo,
  Rol,
  Sexo,
  TipoMedida,
} from '../src/generated/prisma/enums';

export interface UsuarioSeed {
  id: string;
  documento: string;
  correo: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
  sexo: Sexo;
  fechaNacimiento: string;
  objetivo?: Objetivo;
  nivelActividad?: NivelActividad;
}

export const USUARIOS: UsuarioSeed[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    documento: '1000000001',
    correo: 'deportista@gymtrack.test',
    nombres: 'Daniela',
    apellidos: 'Deportista Prueba',
    rol: 'DEPORTISTA',
    sexo: 'FEMENINO',
    fechaNacimiento: '2003-05-14',
    objetivo: 'GANAR_MASA_MUSCULAR',
    nivelActividad: 'MODERADO',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    documento: '1000000002',
    correo: 'deportista2@gymtrack.test',
    nombres: 'Santiago',
    apellidos: 'Deportista Prueba',
    rol: 'DEPORTISTA',
    sexo: 'MASCULINO',
    fechaNacimiento: '2001-11-02',
    objetivo: 'PERDER_GRASA',
    nivelActividad: 'LIGERO',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    documento: '1000000003',
    correo: 'instructor@gymtrack.test',
    nombres: 'Iván',
    apellidos: 'Instructor Prueba',
    rol: 'INSTRUCTOR',
    sexo: 'MASCULINO',
    fechaNacimiento: '1990-03-21',
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    documento: '1000000004',
    correo: 'deportes@gymtrack.test',
    nombres: 'Paula',
    apellidos: 'Personal Deportes',
    rol: 'PERSONAL_DEPORTES',
    sexo: 'FEMENINO',
    fechaNacimiento: '1988-08-09',
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    documento: '1000000005',
    correo: 'admin@gymtrack.test',
    nombres: 'Andrés',
    apellidos: 'Administrador',
    rol: 'ADMIN',
    sexo: 'MASCULINO',
    fechaNacimiento: '1985-01-30',
  },
];

export const DEPORTISTA_ID = USUARIOS[0].id;
export const INSTRUCTOR_ID = USUARIOS[2].id;

export const EJERCICIOS: {
  nombre: string;
  grupoMuscular: GrupoMuscular;
  descripcion: string;
}[] = [
  {
    nombre: 'Press de banca plano con barra',
    grupoMuscular: 'PECHO',
    descripcion:
      'Acostado en banco plano, bajar la barra al pecho y empujar hasta extender los brazos.',
  },
  {
    nombre: 'Press inclinado con mancuernas',
    grupoMuscular: 'PECHO',
    descripcion:
      'Banco a 30–45°, empujar las mancuernas hacia arriba juntándolas al final.',
  },
  {
    nombre: 'Aperturas en máquina (pec deck)',
    grupoMuscular: 'PECHO',
    descripcion:
      'Cerrar los brazos al frente manteniendo los codos ligeramente flexionados.',
  },
  {
    nombre: 'Flexiones de pecho',
    grupoMuscular: 'PECHO',
    descripcion: 'Cuerpo recto, bajar el pecho cerca del piso y empujar.',
  },
  {
    nombre: 'Dominadas',
    grupoMuscular: 'ESPALDA',
    descripcion:
      'Colgado de la barra, subir hasta pasar la barbilla sobre la barra.',
  },
  {
    nombre: 'Jalón al pecho en polea',
    grupoMuscular: 'ESPALDA',
    descripcion:
      'Halar la barra hacia la parte alta del pecho llevando los codos hacia abajo.',
  },
  {
    nombre: 'Remo con barra',
    grupoMuscular: 'ESPALDA',
    descripcion: 'Torso inclinado, halar la barra hacia el abdomen.',
  },
  {
    nombre: 'Remo sentado en polea',
    grupoMuscular: 'ESPALDA',
    descripcion: 'Halar el agarre hacia el abdomen juntando las escápulas.',
  },
  {
    nombre: 'Press militar con barra',
    grupoMuscular: 'HOMBROS',
    descripcion:
      'De pie, empujar la barra desde los hombros por encima de la cabeza.',
  },
  {
    nombre: 'Elevaciones laterales con mancuernas',
    grupoMuscular: 'HOMBROS',
    descripcion:
      'Elevar las mancuernas a los lados hasta la altura de los hombros.',
  },
  {
    nombre: 'Curl de bíceps con barra',
    grupoMuscular: 'BICEPS',
    descripcion:
      'Flexionar los codos llevando la barra hacia los hombros sin balancear el torso.',
  },
  {
    nombre: 'Curl martillo con mancuernas',
    grupoMuscular: 'BICEPS',
    descripcion: 'Curl con agarre neutro (palmas enfrentadas).',
  },
  {
    nombre: 'Extensión de tríceps en polea',
    grupoMuscular: 'TRICEPS',
    descripcion: 'Codos pegados al cuerpo, extender los brazos hacia abajo.',
  },
  {
    nombre: 'Fondos en paralelas',
    grupoMuscular: 'TRICEPS',
    descripcion: 'Bajar flexionando los codos y empujar hasta extenderlos.',
  },
  {
    nombre: 'Sentadilla con barra',
    grupoMuscular: 'CUADRICEPS',
    descripcion:
      'Barra sobre la espalda alta, bajar hasta que los muslos queden paralelos al piso.',
  },
  {
    nombre: 'Prensa de piernas',
    grupoMuscular: 'CUADRICEPS',
    descripcion: 'Empujar la plataforma sin bloquear las rodillas al final.',
  },
  {
    nombre: 'Extensión de cuádriceps en máquina',
    grupoMuscular: 'CUADRICEPS',
    descripcion: 'Extender las rodillas hasta tener las piernas rectas.',
  },
  {
    nombre: 'Peso muerto rumano',
    grupoMuscular: 'ISQUIOTIBIALES',
    descripcion:
      'Bajar la barra deslizándola por las piernas con la espalda neutra.',
  },
  {
    nombre: 'Curl femoral acostado',
    grupoMuscular: 'ISQUIOTIBIALES',
    descripcion:
      'Flexionar las rodillas llevando los talones hacia los glúteos.',
  },
  {
    nombre: 'Hip thrust con barra',
    grupoMuscular: 'GLUTEOS',
    descripcion:
      'Espalda apoyada en banco, elevar la cadera con la barra sobre ella.',
  },
  {
    nombre: 'Zancadas con mancuernas',
    grupoMuscular: 'GLUTEOS',
    descripcion: 'Dar un paso largo y bajar la rodilla trasera cerca del piso.',
  },
  {
    nombre: 'Elevación de talones de pie',
    grupoMuscular: 'PANTORRILLAS',
    descripcion: 'Subir sobre la punta de los pies y bajar controlado.',
  },
  {
    nombre: 'Plancha abdominal',
    grupoMuscular: 'ABDOMEN',
    descripcion:
      'Mantener el cuerpo recto apoyado en antebrazos y puntas de los pies.',
  },
  {
    nombre: 'Crunch en polea',
    grupoMuscular: 'ABDOMEN',
    descripcion:
      'De rodillas, flexionar el tronco llevando los codos hacia las rodillas.',
  },
  {
    nombre: 'Burpees',
    grupoMuscular: 'CUERPO_COMPLETO',
    descripcion: 'Sentadilla, plancha, flexión y salto en un solo movimiento.',
  },
  {
    nombre: 'Bicicleta estática',
    grupoMuscular: 'CARDIO',
    descripcion: 'Pedaleo continuo a intensidad moderada.',
  },
  {
    nombre: 'Trotadora',
    grupoMuscular: 'CARDIO',
    descripcion: 'Caminata o trote en banda.',
  },
];

/** Genera franjas de 1 hora entre `desde` y `hasta` (horas enteras, 24 h). */
function franjasHorarias(dias: number[], desde: number, hasta: number) {
  const franjas: { diaSemana: number; horaInicio: string; horaFin: string }[] =
    [];
  for (const diaSemana of dias) {
    for (let h = desde; h < hasta; h++) {
      const hh = (n: number) => `${String(n).padStart(2, '0')}:00:00`;
      franjas.push({ diaSemana, horaInicio: hh(h), horaFin: hh(h + 1) });
    }
  }
  return franjas;
}

/** Gimnasio: lunes a viernes 6:00–21:00, sábado 8:00–13:00. */
export const CUPO_GIMNASIO = 30;
export const FRANJAS_GIMNASIO = [
  ...franjasHorarias([1, 2, 3, 4, 5], 6, 21),
  ...franjasHorarias([6], 8, 13),
];

export const CANCHA = {
  id: '00000000-0000-4000-c000-000000000001',
  nombre: 'Cancha sintética',
  descripcion: 'Cancha de fútbol 5 en grama sintética.',
};

/** Cancha: lunes a viernes 14:00–21:00, sábado 8:00–17:00. */
export const FRANJAS_CANCHA = [
  ...franjasHorarias([1, 2, 3, 4, 5], 14, 21),
  ...franjasHorarias([6], 8, 17),
];

/** Evaluación de ejemplo para el deportista principal. */
export const EVALUACION_DEMO = {
  id: '00000000-0000-4000-e000-000000000001',
  fecha: '2026-09-22T15:00:00Z',
  pesoKg: 62.5,
  tallaCm: 165,
  porcentajeGrasa: 24.5,
  nivelActividad: 'MODERADO' as NivelActividad,
  observaciones: 'Evaluación inicial de prueba.',
  medidas: [
    {
      tipo: 'PERIMETRO' as TipoMedida,
      nombre: 'Cintura',
      valor: 72,
      unidad: 'cm',
    },
    {
      tipo: 'PERIMETRO' as TipoMedida,
      nombre: 'Cadera',
      valor: 98,
      unidad: 'cm',
    },
    {
      tipo: 'PERIMETRO' as TipoMedida,
      nombre: 'Brazo relajado',
      valor: 27.5,
      unidad: 'cm',
    },
    {
      tipo: 'PERIMETRO' as TipoMedida,
      nombre: 'Muslo',
      valor: 55,
      unidad: 'cm',
    },
    {
      tipo: 'TEST_FISICO' as TipoMedida,
      nombre: 'Flexiones en 1 minuto',
      valor: 18,
      unidad: 'rep',
    },
    {
      tipo: 'TEST_FISICO' as TipoMedida,
      nombre: 'Salto horizontal',
      valor: 165,
      unidad: 'cm',
    },
  ],
};

/** Rutina vigente de ejemplo asignada por el instructor al deportista principal. */
export const RUTINA_DEMO = {
  id: '00000000-0000-4000-b000-000000000001',
  nombre: 'Full body – Fase 1',
  descripcion: 'Rutina de adaptación, 3 días por semana.',
  ejercicios: [
    {
      nombre: 'Sentadilla con barra',
      series: 4,
      repeticionesObjetivo: '12-10-8-8',
      metodo: 'PIRAMIDE' as MetodoEntrenamiento,
      descansoSegundos: 90,
    },
    {
      nombre: 'Press de banca plano con barra',
      series: 4,
      repeticionesObjetivo: '10',
      metodo: 'TRADICIONAL' as MetodoEntrenamiento,
      descansoSegundos: 90,
    },
    {
      nombre: 'Jalón al pecho en polea',
      series: 3,
      repeticionesObjetivo: '12',
      metodo: 'TRADICIONAL' as MetodoEntrenamiento,
      descansoSegundos: 60,
    },
    {
      nombre: 'Hip thrust con barra',
      series: 3,
      repeticionesObjetivo: '12-10-8',
      metodo: 'SERIES_DESCENDENTES' as MetodoEntrenamiento,
      descansoSegundos: 60,
    },
    {
      nombre: 'Plancha abdominal',
      series: 3,
      repeticionesObjetivo: '45 s',
      metodo: 'TRADICIONAL' as MetodoEntrenamiento,
      descansoSegundos: 30,
    },
  ],
};
