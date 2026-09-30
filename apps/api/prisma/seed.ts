/**
 * Seed de GymTrack UNAL: usuarios de prueba de cada rol, catálogo de ejercicios,
 * franjas del gimnasio y de la cancha, y una evaluación + rutina de ejemplo.
 *
 * Uso:  pnpm --filter api db:seed
 *
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 * Si SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están definidas, también crea los usuarios
 * en Supabase Auth (con la contraseña de SEED_PASSWORD, obligatoria en ese caso) para poder
 * iniciar sesión con ellos.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  CANCHA,
  CUPO_GIMNASIO,
  DEPORTISTA_ID,
  EJERCICIOS,
  EVALUACION_DEMO,
  FRANJAS_CANCHA,
  FRANJAS_GIMNASIO,
  INSTRUCTOR_ID,
  RUTINA_DEMO,
  USUARIOS,
} from './seed-data';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Define DIRECT_URL o DATABASE_URL para correr el seed.');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Las columnas TIME se manejan en Prisma como Date sobre 1970-01-01 (UTC). */
const hora = (hhmmss: string) => new Date(`1970-01-01T${hhmmss}Z`);

async function crearUsuariosAuth(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn(
      '⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no definidas: se crean los perfiles, ' +
        'pero no los usuarios de Supabase Auth.',
    );
    return;
  }
  // Sin valor por defecto: el repositorio es público y hay un usuario ADMIN de prueba.
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error(
      'Define SEED_PASSWORD (mínimo 10 caracteres) para crear los usuarios de Supabase Auth.',
    );
  }
  for (const u of USUARIOS) {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: u.id,
        email: u.correo,
        password,
        email_confirm: true,
        app_metadata: { rol: u.rol },
      }),
    });
    if (res.ok) {
      console.log(`  auth: creado ${u.correo}`);
    } else if (res.status === 422) {
      console.log(`  auth: ya existía ${u.correo}`);
    } else {
      throw new Error(
        `No se pudo crear ${u.correo} en Supabase Auth: ${res.status} ${await res.text()}`,
      );
    }
  }
}

async function main(): Promise<void> {
  console.log('🌱 Sembrando datos de prueba…');
  await crearUsuariosAuth();

  for (const u of USUARIOS) {
    const datos = {
      documento: u.documento,
      correo: u.correo,
      nombres: u.nombres,
      apellidos: u.apellidos,
      rol: u.rol,
      sexo: u.sexo,
      fechaNacimiento: new Date(u.fechaNacimiento),
      objetivo: u.objetivo ?? null,
      nivelActividad: u.nivelActividad ?? null,
    };
    await prisma.usuario.upsert({
      where: { id: u.id },
      create: { id: u.id, ...datos },
      update: datos,
    });
  }
  console.log(`  ${USUARIOS.length} usuarios`);

  for (const e of EJERCICIOS) {
    await prisma.ejercicio.upsert({
      where: { nombre: e.nombre },
      create: { ...e, creadoPorId: INSTRUCTOR_ID },
      update: { grupoMuscular: e.grupoMuscular, descripcion: e.descripcion },
    });
  }
  console.log(`  ${EJERCICIOS.length} ejercicios`);

  for (const f of FRANJAS_GIMNASIO) {
    const horaInicio = hora(f.horaInicio);
    await prisma.franjaGimnasio.upsert({
      where: { diaSemana_horaInicio: { diaSemana: f.diaSemana, horaInicio } },
      create: {
        diaSemana: f.diaSemana,
        horaInicio,
        horaFin: hora(f.horaFin),
        cupoMaximo: CUPO_GIMNASIO,
      },
      update: { horaFin: hora(f.horaFin) },
    });
  }
  console.log(`  ${FRANJAS_GIMNASIO.length} franjas del gimnasio`);

  await prisma.cancha.upsert({
    where: { id: CANCHA.id },
    create: CANCHA,
    update: CANCHA,
  });
  for (const f of FRANJAS_CANCHA) {
    const horaInicio = hora(f.horaInicio);
    await prisma.franjaCancha.upsert({
      where: {
        canchaId_diaSemana_horaInicio: {
          canchaId: CANCHA.id,
          diaSemana: f.diaSemana,
          horaInicio,
        },
      },
      create: {
        canchaId: CANCHA.id,
        diaSemana: f.diaSemana,
        horaInicio,
        horaFin: hora(f.horaFin),
      },
      update: { horaFin: hora(f.horaFin) },
    });
  }
  console.log(`  1 cancha con ${FRANJAS_CANCHA.length} franjas`);

  const { medidas, ...evaluacion } = EVALUACION_DEMO;
  const datosEvaluacion = {
    ...evaluacion,
    fecha: new Date(evaluacion.fecha),
    usuarioId: DEPORTISTA_ID,
    instructorId: INSTRUCTOR_ID,
  };
  await prisma.evaluacion.upsert({
    where: { id: evaluacion.id },
    create: datosEvaluacion,
    update: datosEvaluacion,
  });
  for (const m of medidas) {
    await prisma.medida.upsert({
      where: {
        evaluacionId_tipo_nombre: {
          evaluacionId: evaluacion.id,
          tipo: m.tipo,
          nombre: m.nombre,
        },
      },
      create: { ...m, evaluacionId: evaluacion.id },
      update: { valor: m.valor, unidad: m.unidad },
    });
  }
  console.log('  1 evaluación de ejemplo');

  const { ejercicios, ...rutina } = RUTINA_DEMO;
  const catalogo = await prisma.ejercicio.findMany({
    where: { nombre: { in: ejercicios.map((e) => e.nombre) } },
  });
  const idPorNombre = new Map(catalogo.map((e) => [e.nombre, e.id]));
  await prisma.$transaction([
    // Garantiza una sola rutina vigente por usuario antes de marcar la de ejemplo.
    prisma.rutina.updateMany({
      where: {
        usuarioId: DEPORTISTA_ID,
        vigente: true,
        NOT: { id: rutina.id },
      },
      data: { vigente: false },
    }),
    prisma.rutina.upsert({
      where: { id: rutina.id },
      create: {
        ...rutina,
        usuarioId: DEPORTISTA_ID,
        instructorId: INSTRUCTOR_ID,
      },
      update: { ...rutina, vigente: true },
    }),
    prisma.rutinaEjercicio.deleteMany({ where: { rutinaId: rutina.id } }),
    prisma.rutinaEjercicio.createMany({
      data: ejercicios.map(({ nombre, ...e }, i) => ({
        ...e,
        rutinaId: rutina.id,
        ejercicioId: idPorNombre.get(nombre)!,
        orden: i + 1,
      })),
    }),
  ]);
  console.log('  1 rutina vigente de ejemplo');
  console.log('✅ Seed completo');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
