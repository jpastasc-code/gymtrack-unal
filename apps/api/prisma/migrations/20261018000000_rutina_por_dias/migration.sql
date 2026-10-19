-- GYMM-21: la rutina se divide en días (Día 1, Día 2, Día 3…), como la ficha de
-- entrenamiento del gimnasio. Las rutinas existentes quedan con todo en el día 1.
ALTER TABLE "rutina_ejercicio" ADD COLUMN "dia" SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE "rutina_ejercicio"
  ADD CONSTRAINT "rutina_ejercicio_dia_chk" CHECK ("dia" BETWEEN 1 AND 7);
