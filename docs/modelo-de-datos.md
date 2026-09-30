# Modelo de datos de GymTrack UNAL

Diagrama entidad-relación de la base de datos (GYMM-16). La fuente de verdad es
[`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma); si cambias el esquema, actualiza este diagrama.

```mermaid
erDiagram
    USUARIO ||--o{ EVALUACION : "es evaluado en"
    USUARIO ||--o{ EVALUACION : "registra (instructor)"
    EVALUACION ||--o{ MEDIDA : "tiene"

    USUARIO |o--o{ EJERCICIO : "crea (instructor)"
    USUARIO ||--o{ RUTINA : "tiene asignada"
    USUARIO ||--o{ RUTINA : "diseña (instructor)"
    RUTINA ||--|{ RUTINA_EJERCICIO : "incluye"
    EJERCICIO ||--o{ RUTINA_EJERCICIO : "aparece en"

    USUARIO ||--o{ SESION : "entrena en"
    RUTINA |o--o{ SESION : "se sigue en"
    SESION ||--o{ SERIE_REGISTRADA : "registra"
    EJERCICIO ||--o{ SERIE_REGISTRADA : "de"

    FRANJA_GIMNASIO ||--o{ RESERVA_GIMNASIO : "recibe"
    USUARIO ||--o{ RESERVA_GIMNASIO : "hace"
    USUARIO ||--o{ REGISTRO_ACCESO : "entra/sale"
    RESERVA_GIMNASIO |o--o{ REGISTRO_ACCESO : "se usa en"

    CANCHA ||--o{ FRANJA_CANCHA : "habilita"
    CANCHA ||--o{ RESERVA_CANCHA : "recibe"
    USUARIO ||--o{ RESERVA_CANCHA : "hace"

    USUARIO {
        uuid id PK "= auth.users.id de Supabase"
        varchar documento UK
        varchar correo UK
        varchar nombres
        varchar apellidos
        varchar telefono
        date fecha_nacimiento
        enum sexo
        enum rol "DEPORTISTA | INSTRUCTOR | PERSONAL_DEPORTES | ADMIN"
        enum objetivo "MANTENER | GANAR_MASA_MUSCULAR | PERDER_GRASA"
        enum nivel_actividad
        boolean activo
    }
    EVALUACION {
        uuid id PK
        uuid usuario_id FK
        uuid instructor_id FK
        timestamptz fecha
        decimal peso_kg "20 a 350"
        decimal talla_cm "100 a 250"
        decimal porcentaje_grasa "2 a 70, opcional"
        enum nivel_actividad
        text observaciones
    }
    MEDIDA {
        uuid id PK
        uuid evaluacion_id FK
        enum tipo "PERIMETRO | PLIEGUE | TEST_FISICO"
        varchar nombre "p. ej. Cintura"
        decimal valor
        varchar unidad "cm, rep, s…"
    }
    EJERCICIO {
        uuid id PK
        varchar nombre UK
        enum grupo_muscular
        text descripcion
        boolean activo
        uuid creado_por_id FK
    }
    RUTINA {
        uuid id PK
        varchar nombre
        uuid usuario_id FK
        uuid instructor_id FK
        boolean vigente "una sola vigente por usuario"
        timestamptz fecha_asignacion
    }
    RUTINA_EJERCICIO {
        uuid id PK
        uuid rutina_id FK
        uuid ejercicio_id FK
        smallint orden "único dentro de la rutina"
        smallint series
        varchar repeticiones_objetivo "12 | 12-10-8 | 45 s"
        enum metodo "TRADICIONAL | PIRAMIDE | SERIES_DESCENDENTES…"
        smallint descanso_segundos
    }
    SESION {
        uuid id PK
        uuid usuario_id FK
        uuid rutina_id FK "opcional"
        timestamptz inicio
        timestamptz fin
    }
    SERIE_REGISTRADA {
        uuid id PK
        uuid sesion_id FK
        uuid ejercicio_id FK
        smallint numero_serie
        decimal carga_kg
        smallint repeticiones
        timestamptz registrada_en
    }
    FRANJA_GIMNASIO {
        uuid id PK
        smallint dia_semana "1 = lunes … 7 = domingo"
        time hora_inicio
        time hora_fin
        smallint cupo_maximo
        boolean activa
    }
    RESERVA_GIMNASIO {
        uuid id PK
        uuid usuario_id FK
        uuid franja_id FK
        date fecha
        enum estado "CONFIRMADA | CANCELADA"
    }
    REGISTRO_ACCESO {
        uuid id PK
        uuid usuario_id FK
        uuid reserva_id FK "opcional"
        timestamptz entrada
        timestamptz salida "NULL = está dentro"
        boolean salida_automatica
    }
    CANCHA {
        uuid id PK
        varchar nombre UK
        boolean activa
    }
    FRANJA_CANCHA {
        uuid id PK
        uuid cancha_id FK
        smallint dia_semana
        time hora_inicio
        time hora_fin
        boolean activa
    }
    RESERVA_CANCHA {
        uuid id PK
        uuid cancha_id FK
        uuid usuario_id FK
        timestamptz inicio
        timestamptz fin
        enum estado "CONFIRMADA | CANCELADA"
    }
```

## Decisiones de diseño

- **Autenticación en Supabase Auth.** `usuario.id` es el mismo UUID de `auth.users`; la tabla `usuario` guarda solo el perfil. No hay llave foránea hacia `auth.users` porque ese esquema lo administra Supabase.
- **Evaluaciones inmutables (GYMM-13).** Cada evaluación es una fila nueva; las medidas variables (perímetros, pliegues, tests) van en `medida` para no tener una columna por cada una.
- **Franjas como plantilla semanal.** `franja_gimnasio` y `franja_cancha` describen el horario de cada día de la semana; la reserva del gimnasio guarda la `fecha` concreta.
- **`franja_cancha` se agregó** a la lista original de entidades para cumplir GYMM-20 (el personal de deportes define las franjas habilitadas).
- **Aforo en tiempo real (GYMM-33)** = registros de `registro_acceso` sin `salida`.
- **`serie_registrada` guarda el ejercicio** para el histórico (GYMM-31) y la precarga de la última carga (GYMM-26), aunque la rutina cambie después.

## Reglas que viven en la base de datos

Prisma no puede expresarlas en `schema.prisma`, así que están en SQL dentro de la primera migración:

| Regla | Historia | Cómo se garantiza |
| ----- | -------- | ----------------- |
| Dos reservas confirmadas de la cancha no se pueden solapar | GYMM-28 | Restricción de exclusión `reserva_cancha_sin_solapamiento` (btree_gist + `tstzrange`) |
| Solo una rutina vigente por usuario | GYMM-21 | Índice único parcial `rutina_una_vigente_por_usuario` |
| Un usuario no reserva dos veces la misma franja y fecha | GYMM-27 | Índice único parcial sobre reservas `CONFIRMADA` |
| Nadie tiene dos entradas abiertas al gimnasio | GYMM-32 | Índice único parcial sobre `registro_acceso` sin `salida` |
| Rangos razonables de peso, talla y % de grasa | GYMM-13 | Restricciones `CHECK` |
| Horas, días de la semana, cupos y series válidos | — | Restricciones `CHECK` |
| La API REST pública de Supabase no expone datos | — | RLS habilitado sin políticas en todas las tablas |

> El cupo máximo de cada franja del gimnasio se valida en el backend dentro de una transacción al crear la reserva.
