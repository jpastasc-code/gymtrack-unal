-- CreateExtension (en Supabase las extensiones van en el esquema "extensions", no en public)
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";

-- CreateEnum
CREATE TYPE "rol" AS ENUM ('DEPORTISTA', 'INSTRUCTOR', 'PERSONAL_DEPORTES', 'ADMIN');

-- CreateEnum
CREATE TYPE "sexo" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "objetivo" AS ENUM ('MANTENER', 'GANAR_MASA_MUSCULAR', 'PERDER_GRASA');

-- CreateEnum
CREATE TYPE "nivel_actividad" AS ENUM ('SEDENTARIO', 'LIGERO', 'MODERADO', 'ALTO', 'MUY_ALTO');

-- CreateEnum
CREATE TYPE "tipo_medida" AS ENUM ('PERIMETRO', 'PLIEGUE', 'TEST_FISICO');

-- CreateEnum
CREATE TYPE "grupo_muscular" AS ENUM ('PECHO', 'ESPALDA', 'HOMBROS', 'BICEPS', 'TRICEPS', 'ANTEBRAZOS', 'CUADRICEPS', 'ISQUIOTIBIALES', 'GLUTEOS', 'PANTORRILLAS', 'ABDOMEN', 'CUERPO_COMPLETO', 'CARDIO');

-- CreateEnum
CREATE TYPE "metodo_entrenamiento" AS ENUM ('TRADICIONAL', 'PIRAMIDE', 'PIRAMIDE_INVERSA', 'SERIES_DESCENDENTES', 'SUPERSERIE', 'CIRCUITO');

-- CreateEnum
CREATE TYPE "estado_reserva" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "documento" VARCHAR(20) NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "fecha_nacimiento" DATE,
    "sexo" "sexo",
    "rol" "rol" NOT NULL DEFAULT 'DEPORTISTA',
    "objetivo" "objetivo",
    "nivel_actividad" "nivel_actividad",
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peso_kg" DECIMAL(5,2) NOT NULL,
    "talla_cm" DECIMAL(5,2) NOT NULL,
    "porcentaje_grasa" DECIMAL(4,2),
    "nivel_actividad" "nivel_actividad",
    "observaciones" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medida" (
    "id" UUID NOT NULL,
    "evaluacion_id" UUID NOT NULL,
    "tipo" "tipo_medida" NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "valor" DECIMAL(8,2) NOT NULL,
    "unidad" VARCHAR(15) NOT NULL,

    CONSTRAINT "medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejercicio" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "grupo_muscular" "grupo_muscular" NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutina" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "usuario_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "fecha_asignacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rutina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutina_ejercicio" (
    "id" UUID NOT NULL,
    "rutina_id" UUID NOT NULL,
    "ejercicio_id" UUID NOT NULL,
    "orden" SMALLINT NOT NULL,
    "series" SMALLINT NOT NULL,
    "repeticiones_objetivo" VARCHAR(30) NOT NULL,
    "metodo" "metodo_entrenamiento" NOT NULL DEFAULT 'TRADICIONAL',
    "descanso_segundos" SMALLINT,
    "notas" TEXT,

    CONSTRAINT "rutina_ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rutina_id" UUID,
    "inicio" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMPTZ(3),
    "notas" TEXT,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie_registrada" (
    "id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "ejercicio_id" UUID NOT NULL,
    "numero_serie" SMALLINT NOT NULL,
    "carga_kg" DECIMAL(6,2) NOT NULL,
    "repeticiones" SMALLINT NOT NULL,
    "registrada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serie_registrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franja_gimnasio" (
    "id" UUID NOT NULL,
    "dia_semana" SMALLINT NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "cupo_maximo" SMALLINT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "franja_gimnasio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_gimnasio" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "franja_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "estado_reserva" NOT NULL DEFAULT 'CONFIRMADA',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_en" TIMESTAMPTZ(3),

    CONSTRAINT "reserva_gimnasio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_acceso" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "reserva_id" UUID,
    "entrada" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salida" TIMESTAMPTZ(3),
    "salida_automatica" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "registro_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancha" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franja_cancha" (
    "id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "dia_semana" SMALLINT NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "franja_cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_cancha" (
    "id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "estado" "estado_reserva" NOT NULL DEFAULT 'CONFIRMADA',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_en" TIMESTAMPTZ(3),

    CONSTRAINT "reserva_cancha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_documento_key" ON "usuario"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "usuario_rol_idx" ON "usuario"("rol");

-- CreateIndex
CREATE INDEX "evaluacion_usuario_id_fecha_idx" ON "evaluacion"("usuario_id", "fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "medida_evaluacion_id_tipo_nombre_key" ON "medida"("evaluacion_id", "tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ejercicio_nombre_key" ON "ejercicio"("nombre");

-- CreateIndex
CREATE INDEX "ejercicio_grupo_muscular_idx" ON "ejercicio"("grupo_muscular");

-- CreateIndex
CREATE INDEX "rutina_usuario_id_vigente_idx" ON "rutina"("usuario_id", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "rutina_ejercicio_rutina_id_orden_key" ON "rutina_ejercicio"("rutina_id", "orden");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_inicio_idx" ON "sesion"("usuario_id", "inicio" DESC);

-- CreateIndex
CREATE INDEX "serie_registrada_ejercicio_id_registrada_en_idx" ON "serie_registrada"("ejercicio_id", "registrada_en" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "serie_registrada_sesion_id_ejercicio_id_numero_serie_key" ON "serie_registrada"("sesion_id", "ejercicio_id", "numero_serie");

-- CreateIndex
CREATE UNIQUE INDEX "franja_gimnasio_dia_semana_hora_inicio_key" ON "franja_gimnasio"("dia_semana", "hora_inicio");

-- CreateIndex
CREATE INDEX "reserva_gimnasio_franja_id_fecha_estado_idx" ON "reserva_gimnasio"("franja_id", "fecha", "estado");

-- CreateIndex
CREATE INDEX "reserva_gimnasio_usuario_id_fecha_idx" ON "reserva_gimnasio"("usuario_id", "fecha");

-- CreateIndex
CREATE INDEX "registro_acceso_salida_idx" ON "registro_acceso"("salida");

-- CreateIndex
CREATE INDEX "registro_acceso_usuario_id_entrada_idx" ON "registro_acceso"("usuario_id", "entrada" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cancha_nombre_key" ON "cancha"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "franja_cancha_cancha_id_dia_semana_hora_inicio_key" ON "franja_cancha"("cancha_id", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE INDEX "reserva_cancha_cancha_id_inicio_idx" ON "reserva_cancha"("cancha_id", "inicio");

-- CreateIndex
CREATE INDEX "reserva_cancha_usuario_id_inicio_idx" ON "reserva_cancha"("usuario_id", "inicio");

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medida" ADD CONSTRAINT "medida_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina" ADD CONSTRAINT "rutina_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina" ADD CONSTRAINT "rutina_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_rutina_id_fkey" FOREIGN KEY ("rutina_id") REFERENCES "rutina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicio" ADD CONSTRAINT "rutina_ejercicio_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "ejercicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_rutina_id_fkey" FOREIGN KEY ("rutina_id") REFERENCES "rutina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_registrada" ADD CONSTRAINT "serie_registrada_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_registrada" ADD CONSTRAINT "serie_registrada_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "ejercicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_gimnasio" ADD CONSTRAINT "reserva_gimnasio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_gimnasio" ADD CONSTRAINT "reserva_gimnasio_franja_id_fkey" FOREIGN KEY ("franja_id") REFERENCES "franja_gimnasio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_acceso" ADD CONSTRAINT "registro_acceso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_acceso" ADD CONSTRAINT "registro_acceso_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva_gimnasio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franja_cancha" ADD CONSTRAINT "franja_cancha_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_cancha" ADD CONSTRAINT "reserva_cancha_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_cancha" ADD CONSTRAINT "reserva_cancha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reglas de negocio que Prisma no puede expresar en schema.prisma (SQL manual).
-- ─────────────────────────────────────────────────────────────────────────────

-- Validaciones de rango (GYMM-13: "validación de rangos razonables").
ALTER TABLE "evaluacion"
  ADD CONSTRAINT "evaluacion_peso_rango_chk" CHECK ("peso_kg" BETWEEN 20 AND 350),
  ADD CONSTRAINT "evaluacion_talla_rango_chk" CHECK ("talla_cm" BETWEEN 100 AND 250),
  ADD CONSTRAINT "evaluacion_grasa_rango_chk" CHECK ("porcentaje_grasa" IS NULL OR "porcentaje_grasa" BETWEEN 2 AND 70);

ALTER TABLE "rutina_ejercicio"
  ADD CONSTRAINT "rutina_ejercicio_orden_chk" CHECK ("orden" >= 1),
  ADD CONSTRAINT "rutina_ejercicio_series_chk" CHECK ("series" BETWEEN 1 AND 20);

ALTER TABLE "serie_registrada"
  ADD CONSTRAINT "serie_registrada_numero_chk" CHECK ("numero_serie" >= 1),
  ADD CONSTRAINT "serie_registrada_carga_chk" CHECK ("carga_kg" >= 0),
  ADD CONSTRAINT "serie_registrada_repeticiones_chk" CHECK ("repeticiones" >= 0);

ALTER TABLE "sesion"
  ADD CONSTRAINT "sesion_fin_chk" CHECK ("fin" IS NULL OR "fin" >= "inicio");

ALTER TABLE "franja_gimnasio"
  ADD CONSTRAINT "franja_gimnasio_dia_chk" CHECK ("dia_semana" BETWEEN 1 AND 7),
  ADD CONSTRAINT "franja_gimnasio_horas_chk" CHECK ("hora_fin" > "hora_inicio"),
  ADD CONSTRAINT "franja_gimnasio_cupo_chk" CHECK ("cupo_maximo" > 0);

ALTER TABLE "franja_cancha"
  ADD CONSTRAINT "franja_cancha_dia_chk" CHECK ("dia_semana" BETWEEN 1 AND 7),
  ADD CONSTRAINT "franja_cancha_horas_chk" CHECK ("hora_fin" > "hora_inicio");

ALTER TABLE "registro_acceso"
  ADD CONSTRAINT "registro_acceso_salida_chk" CHECK ("salida" IS NULL OR "salida" >= "entrada");

ALTER TABLE "reserva_cancha"
  ADD CONSTRAINT "reserva_cancha_horas_chk" CHECK ("fin" > "inicio");

-- GYMM-21: al asignar una rutina nueva, la anterior deja de estar vigente.
-- Solo puede existir una rutina vigente por usuario.
CREATE UNIQUE INDEX "rutina_una_vigente_por_usuario" ON "rutina"("usuario_id") WHERE "vigente";

-- GYMM-27: un usuario no puede tener dos reservas confirmadas en la misma franja y fecha.
CREATE UNIQUE INDEX "reserva_gimnasio_usuario_franja_fecha_confirmada" ON "reserva_gimnasio"("usuario_id", "franja_id", "fecha") WHERE "estado" = 'CONFIRMADA';

-- GYMM-32: una persona no puede tener dos entradas abiertas (sin salida) al mismo tiempo.
CREATE UNIQUE INDEX "registro_acceso_una_entrada_abierta" ON "registro_acceso"("usuario_id") WHERE "salida" IS NULL;

-- GYMM-28: dos reservas confirmadas de la misma cancha no pueden solaparse en el tiempo.
ALTER TABLE "reserva_cancha"
  ADD CONSTRAINT "reserva_cancha_sin_solapamiento"
  EXCLUDE USING gist ("cancha_id" WITH =, tstzrange("inicio", "fin", '[)') WITH &&)
  WHERE ("estado" = 'CONFIRMADA');

-- Seguridad en Supabase: las tablas del esquema public quedan expuestas por la API REST
-- (PostgREST) con la anon key. Se habilita RLS sin políticas para bloquear ese acceso;
-- el backend NestJS se conecta con el rol dueño de las tablas, que no se ve afectado.
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medida" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ejercicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rutina" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rutina_ejercicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "serie_registrada" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "franja_gimnasio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reserva_gimnasio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registro_acceso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cancha" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "franja_cancha" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reserva_cancha" ENABLE ROW LEVEL SECURITY;
