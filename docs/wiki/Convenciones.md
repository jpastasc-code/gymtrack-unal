# Convenciones

## Ramas

- `main` siempre está desplegable. Nadie hace push directo: todo entra por Pull Request.
- Cada historia o tarea tiene su rama, creada desde `main`:

  ```
  feature/GYMM-<número>-<descripcion-corta>
  ```

  Ejemplos: `feature/GYMM-10-inicio-sesion`, `feature/GYMM-27-reserva-cupo`.
- Para corregir un error en `main` usa `fix/GYMM-<número>-<descripcion>`. Si el error no tiene historia, crea primero el issue en Jira.
- La clave `GYMM-<número>` en la rama es la que Jira usa para enlazar ramas, commits y PRs a la historia (app de GitHub para Jira, GYMM-14). No la omitas.
- Borra la rama al fusionar el PR (GitHub ofrece el botón).

> Las ramas de GYMM-15, 16 y 18 se crearon como `feat/…` antes de fijar esta convención. De aquí en adelante, `feature/…`.

## Commits: Conventional Commits

```
<tipo>(<ámbito>): <descripción en minúscula, en imperativo o sustantivo>

<cuerpo opcional: qué y por qué, no cómo>

Refs: GYMM-<número>
```

| Tipo | Cuándo |
| ---- | ------ |
| `feat` | Funcionalidad nueva para el usuario. |
| `fix` | Corrección de un error. |
| `docs` | Solo documentación (README, wiki, comentarios). |
| `test` | Solo pruebas. |
| `refactor` | Cambio de código que no cambia el comportamiento. |
| `style` | Formato, sin cambio de lógica. |
| `perf` | Mejora de rendimiento. |
| `build` | Dependencias, empaquetado, configuración de Vite/Nest/Prisma. |
| `ci` | GitHub Actions y despliegue. |
| `chore` | Mantenimiento que no encaja en lo anterior. |

- **Ámbitos:** `api`, `web`, `db` (Prisma, migraciones, seed), `shared` (`packages/shared`), `ci` y `docs`.
- **Ejemplos:**
  - `feat(api): endpoint para registrar una serie`
  - `fix(web): el campo de carga acepta coma decimal`
  - `feat(db): tabla de usuarios precargados de la UNAL`
- Un cambio que rompe algo existente lleva `!` después del ámbito y una línea `BREAKING CHANGE:` en el cuerpo. Por ejemplo, `feat(api)!: …`.
- Commits pequeños y con sentido propio; nada de "cambios" o "wip" en `main`.

## Pull Requests

**Al abrir el PR:**
- El título sigue Conventional Commits e incluye la clave: `feat(web): pantalla de mi rutina (GYMM-22)`.
- Llena la plantilla (`.github/pull_request_template.md`): qué cambia, cómo probarlo y la checklist de la [Definition of Done](Definition-of-Done.md).
- Si el PR depende de otro, indícalo arriba: "Se apoya en #12".
- Mantén el PR chico, idealmente menos de 400 líneas sin contar el lockfile y el código generado. Si una historia es grande, divídela en PRs por capa (API, web).

**Revisión:**
- Se necesita al menos **una aprobación de otro integrante** y el **CI en verde** para fusionar.
- La persona que revisa baja la rama, corre lo que dice "Cómo probar" y revisa los criterios de aceptación, no solo el código.
- Los comentarios se escriben como sugerencias concretas. Quien abrió el PR responde o resuelve cada hilo.
- Quien abrió el PR es quien lo fusiona, con **Squash and merge**: el mensaje final queda con el título del PR.
- Tiempo de respuesta: máximo un día hábil para la primera revisión.

> Para que estas reglas se cumplan solas hay que activar la protección de `main` en GitHub: **Settings → Branches → Add rule** para `main`, exigir un PR con 1 aprobación y el check **CI**. Hoy `main` **no** está protegida.

## Código

- **Idioma:** el dominio va en español (modelos `Usuario`, `Rutina`; componentes `Pantalla`, `Tarjeta`; funciones `configurarProveedorToken`). Los términos técnicos del framework se quedan en inglés (`service`, `controller`, `hook`). Tablas y columnas de la BD en `snake_case`.
- **Formato:**
  - API: Prettier (`pnpm --filter api format`) y oxlint.
  - Web: ESLint.
  - El CI rechaza el lint.
- **Frontend:**
  - Cada pantalla va en `apps/web/src/features/<épica>/`.
  - Las llamadas al API se hacen con `apiFetch` dentro de hooks de TanStack Query.
  - Los estilos usan los tokens de Tailwind (`bg-campus`, `text-gris`…), no colores sueltos.
- **API:**
  - Un módulo de NestJS por épica.
  - DTOs validados.
  - Cada endpoint se documenta con decoradores de Swagger.
  - La BD solo se accede por `PrismaService`.
- **Base de datos:**
  - Las migraciones se generan contra una base local o de pruebas, nunca contra el Supabase compartido (ver README, "Cómo cambiar el esquema").
  - Las reglas que Prisma no expresa van en SQL dentro de la migración y se documentan en `docs/modelo-de-datos.md`.
- **Secretos:** nunca en el repo, que es público. Van en `.env` (ignorado) y en las variables de Render y Vercel.
