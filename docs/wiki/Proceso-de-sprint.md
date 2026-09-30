# Proceso de sprint

## Calendario

| Sprint | Objetivo | Inicio | Fin |
| ------ | -------- | ------ | --- |
| Sprint 1 · Base y acceso | Dejar desplegado el esqueleto del sistema (monorepo, CI/CD, BD, wireframes). Que un usuario pueda registrarse, iniciar sesión y editar su perfil; que el instructor registre evaluaciones; y que el catálogo de ejercicios esté disponible. | 28 sep 2026 | 16 oct 2026 |

## Antes de empezar un sprint (planeación)

1. Toda historia que entra al sprint tiene criterios de aceptación y una estimación en **Story point estimate**, en la escala 1, 2, 3, 5, 8 y 13.
2. Las tareas técnicas también se estiman. Si una tarea queda sin puntos, su trabajo no aparece en la velocidad y el sprint siguiente se planea con menos capacidad de la real.
3. Se revisa la [Definition of Done](Definition-of-Done.md) y se ajusta si hace falta.
4. En Jira, en el tablero del proyecto, se pulsa **Iniciar sprint** con las fechas acordadas. **Si el sprint no se inicia en Jira, el reporte de velocidad no lo cuenta.**

## Durante el sprint

- Cada historia pasa por **Por hacer → En curso → Listo**.
- Pasa a **En curso** cuando alguien abre su rama.
- Pasa a **Listo** solo cuando cumple la [Definition of Done](Definition-of-Done.md): PR fusionado, CI en verde y criterios verificados.
- Si aparece trabajo no planeado, se crea un issue nuevo. No se esconde dentro de otra historia.

## Al cerrar el sprint

1. **Revisión:** se muestra lo que quedó en **Listo** funcionando, idealmente en el despliegue.
2. **Cerrar el sprint en Jira:** en el tablero se pulsa **Completar sprint**. Lo que no esté en Listo se mueve al backlog o al sprint siguiente. No se marca como Listo para "cerrar bonito".
3. **Registrar la velocidad:** abre **Informes → Gráfico de velocidad** y copia a la tabla de abajo los puntos comprometidos y los completados.
4. **Retrospectiva:** qué mantener, qué cambiar y una acción concreta, con responsable, para el siguiente sprint.
5. **Calibrar:** el sprint siguiente se planea con el promedio de la velocidad de los últimos sprints (con uno solo, se usa ese).

## Registro de velocidad

| Sprint | Puntos comprometidos | Puntos completados | Notas |
| ------ | -------------------: | -----------------: | ----- |
| Sprint 1 · Base y acceso | 27 (solo historias) | *pendiente al cierre* | Las historias GYMM-9 a GYMM-13 suman 27 puntos. Las tareas GYMM-14 a GYMM-19 no tienen puntos. |

> **Pendiente para que la velocidad del Sprint 1 quede registrada (GYMM-19):**
> - Al 29 de septiembre el Sprint 1 figura en Jira como **no iniciado**, aunque su fecha de inicio fue el 28. Hay que pulsar **Iniciar sprint** en el tablero; si no, el gráfico de velocidad no lo incluye.
> - Decidir si se estiman las tareas GYMM-14 a GYMM-19 antes de iniciar el sprint.
> - Al cerrarlo, completar esta tabla.
