-- GYMM-28: comprueba la restricción de exclusión `reserva_cancha_sin_solapamiento`
-- contra PostgreSQL real. La corre el CI después de aplicar las migraciones.
-- Todo pasa dentro de una transacción que se deshace al final: no deja datos.
BEGIN;

INSERT INTO "usuario" ("id", "documento", "correo", "nombres", "apellidos", "actualizado_en")
VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'prueba-a', 'a@prueba.test', 'Ana', 'Prueba', now()),
  ('00000000-0000-4000-8000-0000000000b2', 'prueba-b', 'b@prueba.test', 'Luis', 'Prueba', now());
INSERT INTO "cancha" ("id", "nombre") VALUES ('00000000-0000-4000-8000-0000000000c3', 'Cancha de prueba');

-- Lunes 7 de enero de 2030, de 2 a 3 p. m. en Colombia.
INSERT INTO "reserva_cancha" ("id", "cancha_id", "usuario_id", "inicio", "fin")
VALUES (gen_random_uuid(), '00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1',
        '2030-01-07 14:00-05', '2030-01-07 15:00-05');

DO $$
DECLARE
  cancha uuid := '00000000-0000-4000-8000-0000000000c3';
  luis uuid := '00000000-0000-4000-8000-0000000000b2';
BEGIN
  -- La misma franja (o una parte de ella) no se puede reservar otra vez.
  BEGIN
    INSERT INTO "reserva_cancha" ("id", "cancha_id", "usuario_id", "inicio", "fin")
    VALUES (gen_random_uuid(), cancha, luis, '2030-01-07 14:30-05', '2030-01-07 15:30-05');
    RAISE EXCEPTION 'Se aceptó una reserva que se solapa con otra confirmada';
  EXCEPTION WHEN exclusion_violation THEN
    NULL; -- Es lo esperado.
  END;

  -- Una franja que empieza justo cuando termina la otra sí se puede reservar ('[)').
  INSERT INTO "reserva_cancha" ("id", "cancha_id", "usuario_id", "inicio", "fin")
  VALUES (gen_random_uuid(), cancha, luis, '2030-01-07 15:00-05', '2030-01-07 16:00-05');

  -- Una reserva cancelada deja libre su horario.
  UPDATE "reserva_cancha" SET "estado" = 'CANCELADA'
  WHERE "cancha_id" = cancha AND "inicio" = '2030-01-07 14:00-05';
  INSERT INTO "reserva_cancha" ("id", "cancha_id", "usuario_id", "inicio", "fin")
  VALUES (gen_random_uuid(), cancha, luis, '2030-01-07 14:00-05', '2030-01-07 15:00-05');

  RAISE NOTICE 'reserva_cancha_sin_solapamiento: OK';
END $$;

ROLLBACK;
