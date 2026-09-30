-- Índices para llaves foráneas sin índice (recomendación del Performance Advisor de Supabase).

-- CreateIndex
CREATE INDEX "evaluacion_instructor_id_idx" ON "evaluacion"("instructor_id");

-- CreateIndex
CREATE INDEX "ejercicio_creado_por_id_idx" ON "ejercicio"("creado_por_id");

-- CreateIndex
CREATE INDEX "rutina_instructor_id_idx" ON "rutina"("instructor_id");

-- CreateIndex
CREATE INDEX "rutina_ejercicio_ejercicio_id_idx" ON "rutina_ejercicio"("ejercicio_id");

-- CreateIndex
CREATE INDEX "sesion_rutina_id_idx" ON "sesion"("rutina_id");

-- CreateIndex
CREATE INDEX "registro_acceso_reserva_id_idx" ON "registro_acceso"("reserva_id");
