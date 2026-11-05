-- GYMM-26: una persona entrena en una sola sesión a la vez. Si el celular reenvía
-- "empezar sesión" (doble toque o reintento sin señal), no se abre una segunda.
CREATE UNIQUE INDEX "sesion_una_abierta_por_usuario" ON "sesion"("usuario_id") WHERE "fin" IS NULL;
