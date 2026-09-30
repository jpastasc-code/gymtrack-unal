# Definition of Done

> **Estado: propuesta para aprobar en la próxima reunión del equipo.** No encontramos una DoD escrita en Jira ni en el repositorio. Esta versión recoge lo que el equipo ya hace (CI, revisión de PR, criterios de aceptación en Jira). Cuando se apruebe, cambia este aviso por la fecha de aprobación.

## Historia de usuario

Una historia está **Lista** cuando se cumple todo esto:

**Funcionalidad**
- [ ] Se cumplen todos los criterios de aceptación de la historia en Jira, y otra persona del equipo los verificó.
- [ ] Funciona en un celular de 390 px de ancho y respeta el sistema de diseño (tokens de `apps/web/src/index.css`).
- [ ] Hay estados de carga, error y vacío con mensajes que dicen qué pasó y cómo seguir.

**Calidad**
- [ ] El código está en `main` mediante un Pull Request aprobado por al menos otro integrante (ver [Convenciones](Convenciones.md)).
- [ ] El CI está en verde: lint, typecheck, pruebas unitarias, pruebas e2e, build y migraciones.
- [ ] La lógica de negocio tiene pruebas unitarias (fórmulas, validaciones, reglas de cupo…).
- [ ] Cada endpoint nuevo tiene al menos una prueba e2e del caso feliz y una del error principal.
- [ ] Cada pantalla nueva tiene una prueba de su flujo principal (Vitest + Testing Library).

**Accesibilidad**
- [ ] Todos los elementos tocables miden al menos 44 px.
- [ ] Los textos cumplen contraste 4.5:1.
- [ ] Cada input tiene una etiqueta visible.
- [ ] Todo se puede usar con teclado y el foco se ve.

**Datos y seguridad**
- [ ] Los cambios de esquema tienen su migración de Prisma, aplicada en Supabase después del merge.
- [ ] El seed está actualizado si la historia lo necesita.
- [ ] Cada ruta del API verifica la sesión y el rol que corresponde.
- [ ] No hay secretos en el código ni en los commits.

**Documentación**
- [ ] Los endpoints nuevos están documentados en Swagger (`/api/docs`).
- [ ] Las variables de entorno nuevas están en `.env.example` y en la tabla del README.
- [ ] Toda decisión técnica nueva quedó en [Decisiones técnicas](Decisiones-tecnicas.md).

**Entrega**
- [ ] Está desplegado en Render (API) y Vercel (web) y se probó ahí, una vez exista el despliegue (GYMM-15).
- [ ] La historia está en **Listo** en Jira con el enlace al PR.

## Tarea técnica

Las tareas (configuración, infraestructura, documentación) no siempre tienen pantalla ni criterios de usuario. Están listas cuando:

- [ ] Se cumple cada punto de su descripción en Jira. Lo que quedó fuera se anota en un comentario y se crea una tarea nueva para eso.
- [ ] Están en `main` mediante un PR aprobado, con el CI en verde.
- [ ] La documentación afectada está actualizada (README, esta wiki, `.env.example`).

## Qué no cuenta como terminado

- "Funciona en mi máquina" sin PR fusionado.
- Un PR abierto esperando revisión.
- Pasos manuales pendientes, como desplegar, aplicar una migración o configurar una variable. Si una historia depende de uno, queda **En curso** hasta hacerlo.
