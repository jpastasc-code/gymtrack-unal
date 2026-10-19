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

export interface EjercicioSeed {
  nombre: string;
  grupoMuscular: GrupoMuscular;
  descripcion: string | null;
}

/** Ejercicios de una zona de la ficha: [nombre, descripción o null]. */
const zona = (
  grupoMuscular: GrupoMuscular,
  ejercicios: [string, string | null][],
): EjercicioSeed[] =>
  ejercicios.map(([nombre, descripcion]) => ({
    nombre,
    grupoMuscular,
    descripcion,
  }));

/**
 * Catálogo del Centro de Acondicionamiento y Preparación Física (UNAL Manizales),
 * con los nombres tal como aparecen en la ficha de entrenamiento personalizado.
 * Las zonas de la ficha se asignan al grupo muscular más cercano: Muslo →
 * cuádriceps o isquiotibiales, Cadera → glúteos. Los ejercicios sin descripción
 * son nombres propios del gimnasio: la escribe un instructor desde el catálogo.
 */
export const EJERCICIOS: EjercicioSeed[] = [
  // Muslo
  ...zona('CUADRICEPS', [
    [
      'Sentadilla',
      'Barra sobre la espalda alta; bajar hasta que los muslos queden paralelos al piso y subir.',
    ],
    [
      'Tijera',
      'Un pie adelante y otro atrás; bajar la rodilla trasera cerca del piso y subir.',
    ],
    [
      'Extensión de rodillas',
      'Sentado en la máquina, extender las rodillas hasta tener las piernas rectas.',
    ],
    [
      'Prensa invertida',
      'Acostado bajo la plataforma, empujarla hacia arriba sin bloquear las rodillas.',
    ],
    [
      'Prensa inclinada',
      'Empujar la plataforma inclinada sin bloquear las rodillas al final.',
    ],
    [
      'Sentadilla búlgara',
      'Pie trasero apoyado en un banco; bajar la rodilla trasera hacia el piso.',
    ],
  ]),
  ...zona('ISQUIOTIBIALES', [
    [
      'Peso muerto',
      'Levantar la barra desde el piso con la espalda neutra, extendiendo cadera y rodillas.',
    ],
    [
      'Flexión de rodillas',
      'En la máquina, flexionar las rodillas llevando los talones hacia los glúteos.',
    ],
  ]),
  // Pantorrilla
  ...zona('PANTORRILLAS', [
    [
      'Plantiflexión barra individual',
      'Con la barra, subir sobre la punta de un pie a la vez y bajar controlado.',
    ],
    [
      'Plantiflexión mancuerna',
      'Con mancuerna en la mano, subir sobre la punta de los pies y bajar controlado.',
    ],
    [
      'Plantiflexión con máquina',
      'En la máquina de pantorrilla, subir sobre la punta de los pies y bajar controlado.',
    ],
    [
      'Plantiflexión barra',
      'Con la barra sobre la espalda, subir sobre la punta de los pies y bajar controlado.',
    ],
  ]),
  // Cadera
  ...zona('GLUTEOS', [
    [
      'Extensión cadera total cadera',
      'En la máquina total cadera, llevar la pierna hacia atrás con la rodilla extendida.',
    ],
    [
      'Aducción máquina',
      'Sentado, juntar las piernas contra la resistencia de la máquina.',
    ],
    [
      'Abducción máquina',
      'Sentado, separar las piernas contra la resistencia de la máquina.',
    ],
    [
      'Hip thrust',
      'Espalda apoyada en un banco, elevar la cadera con la barra sobre ella.',
    ],
    [
      'Flexión cadera total cadera',
      'En la máquina total cadera, llevar la rodilla hacia el pecho.',
    ],
    [
      'Extensión cadera torre múltiple',
      'Con el tobillo en la polea baja, llevar la pierna hacia atrás.',
    ],
    [
      'Abducción torre múltiple',
      'Con el tobillo en la polea baja, llevar la pierna hacia afuera.',
    ],
    [
      'Aducción torre múltiple',
      'Con el tobillo en la polea baja, llevar la pierna hacia adentro.',
    ],
    [
      'Aducción total cadera',
      'En la máquina total cadera, llevar la pierna hacia adentro.',
    ],
    [
      'Abducción total cadera',
      'En la máquina total cadera, llevar la pierna hacia afuera.',
    ],
    ['Búlgara', null],
  ]),
  ...zona('PECHO', [
    [
      'Press banco plano',
      'Acostado en banco plano, bajar la barra al pecho y empujar hasta extender los brazos.',
    ],
    [
      'Press banco declinado',
      'En banco declinado, bajar la barra a la parte baja del pecho y empujar.',
    ],
    [
      'Press banco inclinado',
      'En banco inclinado, bajar la barra a la parte alta del pecho y empujar.',
    ],
    [
      'Crossover',
      'De pie entre las poleas altas, cerrar los brazos al frente cruzando las manos.',
    ],
    ['Cabina pecho', null],
    [
      'Aberturas con mancuernas banco inclinado',
      'En banco inclinado, abrir los brazos con los codos semiflexionados y cerrarlos sobre el pecho.',
    ],
    ['Press de banco', null],
    ['Presión pecho', null],
    [
      'Press banco cerrado',
      'Press en banco plano con agarre cerrado y los codos pegados al cuerpo.',
    ],
  ]),
  ...zona('ESPALDA', [
    [
      'Pull over torre',
      'En la polea alta, llevar la barra con los brazos extendidos desde arriba hasta los muslos.',
    ],
    ['Remo con barra', 'Torso inclinado, halar la barra hacia el abdomen.'],
    [
      'Remo polea baja',
      'Sentado en la polea baja, halar el agarre hacia el abdomen juntando las escápulas.',
    ],
    ['Pull over romana', null],
    [
      'Polea al pecho cerrado supino',
      'Halar la barra al pecho con agarre cerrado y las palmas hacia la cara.',
    ],
    [
      'Polea alta atrás',
      'Halar la barra de la polea alta por detrás de la nuca.',
    ],
    [
      'Polea al pecho abierto prono',
      'Halar la barra al pecho con agarre abierto y las palmas hacia adelante.',
    ],
    [
      'Dominadas',
      'Colgado de la barra, subir hasta pasar la barbilla sobre la barra.',
    ],
    [
      'Serrucho',
      'Remo a una mano con mancuerna, apoyando rodilla y mano en un banco.',
    ],
    ['Voladora', null],
  ]),
  ...zona('HOMBROS', [
    [
      'Press Arnold',
      'Sentado, empujar las mancuernas hacia arriba girando las palmas de adentro hacia afuera.',
    ],
    [
      'Press hombro máquina',
      'En la máquina, empujar las manijas por encima de la cabeza.',
    ],
    [
      'Press adelante con barra',
      'Empujar la barra desde el frente de los hombros por encima de la cabeza.',
    ],
    [
      'Elevaciones posteriores',
      'Torso inclinado, abrir los brazos hacia los lados para trabajar el hombro posterior.',
    ],
    [
      'Face pull',
      'En la polea alta con cuerda, halar hacia la cara separando las manos.',
    ],
    [
      'Elevación frontal mancuerna',
      'Elevar las mancuernas al frente hasta la altura de los hombros.',
    ],
    [
      'Elevación lateral mancuerna',
      'Elevar las mancuernas a los lados hasta la altura de los hombros.',
    ],
    ['Halón polea', null],
    [
      'Elevación lateral polea',
      'Con la polea baja, elevar el brazo hacia el lado hasta la altura del hombro.',
    ],
    [
      'Recta al mentón barra',
      'Halar la barra desde los muslos hasta el mentón, con los codos por encima de las manos.',
    ],
    [
      'Circunducción mancuerna',
      'Con mancuernas livianas, hacer círculos amplios con los brazos.',
    ],
  ]),
  ...zona('TRICEPS', [
    [
      'Press prono torre múltiple',
      'En la polea alta con agarre prono, extender los codos hacia abajo.',
    ],
    [
      'Extensión atrás con mancuerna',
      'Torso inclinado, extender el codo llevando la mancuerna hacia atrás.',
    ],
    ['Press barra romana', null],
    [
      'Copa',
      'Sostener una mancuerna con ambas manos detrás de la cabeza y extender los codos.',
    ],
    [
      'Extensión tríceps polea baja',
      'De espaldas a la polea baja, extender los codos por encima de la cabeza.',
    ],
    [
      'Press francés',
      'Acostado, bajar la barra hacia la frente flexionando los codos y extenderlos.',
    ],
    ['Fondos', 'Bajar flexionando los codos y empujar hasta extenderlos.'],
  ]),
  ...zona('BICEPS', [
    [
      'Curl barra Z',
      'Flexionar los codos con la barra Z sin balancear el torso.',
    ],
    [
      'Curl predicador',
      'Brazos apoyados en el banco predicador, flexionar los codos.',
    ],
    [
      'Curl alternado',
      'Con mancuernas, flexionar un codo a la vez girando la palma hacia arriba.',
    ],
    [
      'Curl barra recta',
      'Flexionar los codos llevando la barra hacia los hombros sin balancear el torso.',
    ],
    [
      'Curl concentrado',
      'Sentado, con el codo apoyado en el muslo, flexionar el brazo con la mancuerna.',
    ],
    [
      'Curl martillo',
      'Curl con mancuernas y agarre neutro (palmas enfrentadas).',
    ],
    [
      'Curl 21',
      '7 repeticiones de la mitad inferior, 7 de la mitad superior y 7 completas.',
    ],
    [
      'Curl bíceps banco',
      'Sentado en banco inclinado, flexionar los codos con mancuernas.',
    ],
    [
      'Curl torre múltiple',
      'Flexionar los codos con la barra de la polea baja.',
    ],
  ]),
  // Antebrazo
  ...zona('ANTEBRAZOS', [
    ['Curl prono', null],
    ['Curl supino', null],
  ]),
];

/**
 * Ejercicios del catálogo de prueba anterior que no están en la ficha del gimnasio.
 * El seed los desactiva (no los borra: pueden estar en rutinas o en el histórico).
 */
export const EJERCICIOS_RETIRADOS = [
  'Press de banca plano con barra',
  'Press inclinado con mancuernas',
  'Aperturas en máquina (pec deck)',
  'Flexiones de pecho',
  'Jalón al pecho en polea',
  'Remo sentado en polea',
  'Press militar con barra',
  'Elevaciones laterales con mancuernas',
  'Curl de bíceps con barra',
  'Curl martillo con mancuernas',
  'Extensión de tríceps en polea',
  'Fondos en paralelas',
  'Sentadilla con barra',
  'Prensa de piernas',
  'Extensión de cuádriceps en máquina',
  'Peso muerto rumano',
  'Curl femoral acostado',
  'Hip thrust con barra',
  'Zancadas con mancuernas',
  'Elevación de talones de pie',
  'Plancha abdominal',
  'Crunch en polea',
  'Burpees',
  'Bicicleta estática',
  'Trotadora',
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

/** Las tres series de 10 a 12 repeticiones que indica la ficha para cada ejercicio. */
const BASE = {
  series: 3,
  repeticionesObjetivo: '10-12',
  metodo: 'TRADICIONAL' as MetodoEntrenamiento,
  descansoSegundos: 60,
};
const dia = (numero: number, nombres: string[]) =>
  nombres.map((nombre) => ({ ...BASE, nombre, dia: numero }));

/**
 * Rutina vigente de ejemplo asignada por el instructor al deportista principal.
 * Es la de una ficha real del gimnasio: el número que el instructor escribe junto
 * a cada ejercicio es el día en que se hace ("3-1" = días 3 y 1).
 */
export const RUTINA_DEMO = {
  id: '00000000-0000-4000-b000-000000000001',
  nombre: 'Ficha de entrenamiento – 3 días',
  descripcion: '3 series de 10 a 12 repeticiones en cada ejercicio.',
  ejercicios: [
    ...dia(1, [
      'Sentadilla',
      'Peso muerto',
      'Flexión de rodillas',
      'Abducción máquina',
      'Hip thrust',
      'Plantiflexión mancuerna',
      'Plantiflexión con máquina',
      'Elevación lateral mancuerna',
    ]),
    ...dia(2, [
      'Press banco plano',
      'Press banco declinado',
      'Press banco inclinado',
      'Pull over romana',
      'Dominadas',
      'Extensión atrás con mancuerna',
      'Extensión tríceps polea baja',
      'Curl predicador',
      'Curl martillo',
    ]),
    ...dia(3, [
      'Extensión de rodillas',
      'Prensa inclinada',
      'Sentadilla búlgara',
      'Abducción total cadera',
      'Hip thrust',
      'Plantiflexión mancuerna',
      'Plantiflexión con máquina',
      'Press Arnold',
    ]),
  ],
};
