# Registro de decisiones técnicas

Cada decisión que afecta a todo el equipo queda aquí: qué se decidió, por qué y qué implica.

- **Si una decisión cambia:** no la borres. Márcala como *Reemplazada por DT-XX* y agrega la nueva al final.
- **Estados:**
  - **Aceptada:** ya está en el código.
  - **Propuesta:** falta que el equipo la confirme.
  - **Reemplazada:** otra decisión la cambió.

| # | Decisión | Estado | Fecha |
| - | -------- | ------ | ----- |
| DT-01 | Monorepo con pnpm workspaces | Aceptada | 2026-09-28 |
| DT-02 | Backend en NestJS con Swagger | Aceptada | 2026-09-29 |
| DT-03 | Frontend en React + Vite + Tailwind como PWA | Aceptada | 2026-09-29 |
| DT-04 | PostgreSQL en Supabase con Prisma como ORM | Aceptada | 2026-09-29 |
| DT-05 | Autenticación con Supabase Auth, validada en el backend | Aceptada | 2026-09-29 |
| DT-06 | Simulación de las credenciales UNAL con una tabla precargada | Aceptada (implementación en GYMM-9) | 2026-09-23 |
| DT-07 | Fórmulas nutricionales: Katch-McArdle y Mifflin-St Jeor | Aceptada (implementación en GYMM-25); factores de objetivo y macros en **propuesta** | 2026-09-29 |
| DT-08 | Despliegue en Render (API) y Vercel (web) | Aceptada | 2026-09-29 |
| DT-09 | Diseño en Claude Design en lugar de Figma | Aceptada | 2026-09-29 |
| DT-11 | Rediseño visual minimalista y app responsive | Aceptada | 2026-10-04 |
| DT-12 | Rutinas por días y catálogo de la ficha del gimnasio | Aceptada | 2026-10-18 |
| DT-13 | Horarios de la cancha en hora de Colombia | Propuesta | 2026-10-20 |

---

## DT-01 · Monorepo con pnpm workspaces

**Decisión:** un solo repositorio con `apps/api` (backend), `apps/web` (frontend) y `packages/shared` (código compartido, como las fórmulas nutricionales). Usamos pnpm 12 y Node 24.

**Por qué:**
- Un solo PR puede cambiar el API y la pantalla que lo usa.
- Hay un solo CI.
- Tipos y fórmulas se comparten sin publicar paquetes.

**Implica:**
- Los scripts de la raíz (`pnpm lint`, `pnpm test`…) corren en todos los paquetes.
- Node 24.9 o superior es obligatorio, porque Jest necesita cargar los paquetes ESM de NestJS 12. Está en `.nvmrc`.

## DT-02 · Backend en NestJS con Swagger

**Decisión:** NestJS 12 + TypeScript. Todas las rutas van bajo `/api`, Swagger se sirve en `/api/docs` y el estado de salud en `/api/health`.

**Por qué:**
- Tiene estructura por módulos y validación de DTOs.
- Genera documentación OpenAPI automática, que el frontend usa como contrato.

**Implica:**
- Cada endpoint va documentado con decoradores de Swagger (ver [Definition of Done](Definition-of-Done.md)).
- Las pruebas usan Jest; las e2e usan Supertest con `PrismaService` simulado.

## DT-03 · Frontend en React + Vite + Tailwind como PWA

**Decisión:**
- React 19, Vite 8 y Tailwind CSS 4.
- React Router para las rutas y TanStack Query para los datos del servidor.
- `vite-plugin-pwa` para que la app se pueda instalar en el celular.

**Por qué:** la app se usa en el celular dentro del gimnasio. Una PWA se instala sin pasar por tiendas y abre aunque la señal sea mala. TanStack Query maneja el caché, los reintentos y los estados de carga.

**Implica:**
- Estructura por funcionalidad: `src/features/<épica>/`.
- El service worker nunca guarda en caché `/api`.
- La app avisa cuando hay una versión nueva en lugar de recargarse sola.

## DT-04 · PostgreSQL en Supabase con Prisma como ORM

**Decisión:**
- La base de datos es PostgreSQL en Supabase: proyecto `gymtrack-unal`, región us-east-1, plan gratuito.
- Accedemos con Prisma 7 y el adaptador `@prisma/adapter-pg`.

**Por qué:**
- Supabase trae PostgreSQL administrado, Auth y Realtime (para el aforo, GYMM-33) sin montar servidores.
- Prisma nos da tipos generados y migraciones versionadas.

**Implica:**
- Hay dos conexiones:
  - `DATABASE_URL`: pooler en modo transacción, puerto 6543. La usa el API.
  - `DIRECT_URL`: puerto 5432. La usan las migraciones y el seed.
- Las reglas que Prisma no puede expresar van en SQL dentro de las migraciones. Son la exclusión de reservas de cancha solapadas, una rutina vigente por usuario y los `CHECK` de rangos. Están documentadas en `docs/modelo-de-datos.md`.
- Todas las tablas tienen RLS activado **sin políticas**: la API REST pública de Supabase no expone datos y todo pasa por NestJS.
- No se usa PostgreSQL local ni Docker para desarrollar (acordado en GYMM-16). El CI sí usa un PostgreSQL temporal para validar las migraciones.

## DT-05 · Autenticación con Supabase Auth, validada en el backend

**Decisión:**
- El frontend inicia sesión con Supabase Auth (correo y contraseña) y envía el token JWT en cada petición (`Authorization: Bearer …`).
- NestJS valida el token y consulta el rol del usuario en la tabla `usuario`.

**Por qué:**
- No guardamos contraseñas ni implementamos recuperación de cuenta nosotros.
- La sesión se mantiene en el celular, como pide GYMM-10.

**Implica:**
- `usuario.id` es el mismo UUID que `auth.users.id` de Supabase.
- El rol (`DEPORTISTA`, `INSTRUCTOR`, `PERSONAL_DEPORTES`, `ADMIN`) vive en `usuario.rol`. También se copia en `app_metadata.rol` del token, pero **la fuente de verdad es la tabla**.
- **Cómo funciona (GYMM-10):**
  - En el API, un guard global (`apps/api/src/auth/auth.guard.ts`) exige un token válido en todas las rutas salvo las `@Publico()`.
  - El guard verifica la firma, el emisor (`<SUPABASE_URL>/auth/v1`), la audiencia `authenticated` y la expiración.
  - Luego carga el perfil de `usuario` y aplica `@Roles(...)`.
  - Un perfil inexistente o inactivo responde 403.
- **Claves de firma:**
  - Si el proyecto usa claves asimétricas (ES256/RS256), el API las toma del JWKS público (`/auth/v1/.well-known/jwks.json`), sin compartir secretos.
  - Si aún usa el secreto heredado (HS256), hay que definir `SUPABASE_JWT_SECRET`.
- **En la web:**
  - `SesionProvider` guarda la sesión en el navegador (persistente y con renovación automática), pasa el token a `apiFetch` y carga el perfil con `GET /api/auth/yo`.
  - `RutaProtegida` manda al login a quien no tiene sesión y acepta `roles` para restringir pantallas.
- La clave `service_role` de Supabase solo se usa en el backend y en el seed, nunca en el frontend ni en el repositorio.

## DT-06 · Simulación de las credenciales UNAL con una tabla precargada

**Decisión:** no nos integramos con los sistemas de la Universidad. Usamos una tabla precargada con los usuarios que el gimnasio ya tiene (documento, correo, nombre).
- Solo se aceptan correos `@unal.edu.co`.
- Si el documento o el correo está en la tabla precargada, sus datos se asocian a la cuenta nueva.
- El rol por defecto es `DEPORTISTA`.

**Por qué:** no hay acceso a los servicios de identidad de la UNAL durante el proyecto. La tabla nos deja probar el flujo real de registro.

**Implica:**
- La integración real queda documentada como trabajo futuro con el área de TI.
- La tabla precargada y la validación del dominio todavía **no están en el esquema ni en el código de `main`**. Deben entrar con GYMM-9, con su migración.
- Los usuarios de prueba del seed usan `@gymtrack.test` a propósito, para no chocar con correos reales.

## DT-07 · Fórmulas nutricionales

**Decisión (aceptada):**
- Si el usuario tiene % de grasa registrado, la tasa metabólica basal (TMB) se calcula con **Katch-McArdle**.
- Si no lo tiene, se calcula con **Mifflin-St Jeor**.
- Luego se multiplica por el factor de actividad y se ajusta según el objetivo.

**Katch-McArdle:**

```
masa magra (kg) = peso × (1 − %grasa / 100)
TMB = 370 + 21,6 × masa magra
```

**Mifflin-St Jeor:**

```
hombres:  TMB = 10 × peso + 6,25 × talla(cm) − 5 × edad + 5
mujeres:  TMB = 10 × peso + 6,25 × talla(cm) − 5 × edad − 161
```

**Factor de actividad:**

| Nivel | Factor |
| ----- | ------ |
| sedentario | 1,2 |
| ligero | 1,375 |
| moderado | 1,55 |
| alto | 1,725 |
| muy alto | 1,9 |

**Ajuste por objetivo y macronutrientes (propuesta, para validar con un profesional en nutrición):**

| Objetivo | Calorías | Proteína | Grasas | Carbohidratos |
| -------- | -------- | -------- | ------ | ------------- |
| Mantener | ×1,00 | 1,6 g/kg | 25 % de las kcal | el resto |
| Ganar masa muscular | +10 % | 2,0 g/kg | 25 % | el resto |
| Perder grasa | −20 % | 2,2 g/kg | 25 % | el resto |

Ejemplo, con la deportista del seed: 62,5 kg, 24,5 % de grasa, actividad moderada y objetivo ganar masa muscular.
- TMB = 370 + 21,6 × 47,19 = 1.389 kcal.
- Con actividad moderada: × 1,55 = 2.153 kcal.
- Con el ajuste por objetivo: + 10 % ≈ **2.370 kcal**.
- Macros: 125 g de proteína, 66 g de grasas y 319 g de carbohidratos. Son los valores que aparecen en los wireframes.

**Implica:**
- Las fórmulas van en `packages/shared` con pruebas unitarias (GYMM-25 y GYMM-30).
- Mifflin-St Jeor necesita el sexo y la fecha de nacimiento. Si faltan, la app pide completar el perfil en lugar de adivinar.
- La pantalla siempre muestra el aviso: el cálculo no reemplaza la valoración de un profesional en nutrición.

**Cómo quedó en el código (GYMM-25):**
- `packages/shared/src/nutricion.ts` tiene las fórmulas, los factores de actividad y de objetivo, y `datosFaltantes`. Los factores de objetivo (×1,00, +10 %, −20 %) son los de la tabla de arriba y siguen **pendientes de validar** con un profesional en nutrición: si cambian, se cambian solo ahí y en sus pruebas.
- `GET /api/perfil/requerimiento-calorico` calcula el del usuario del token:
  - Peso, talla y % de grasa salen de su **evaluación más reciente**.
  - Edad (desde la fecha de nacimiento), sexo y objetivo salen del **perfil**.
  - El nivel de actividad sale del perfil; si la persona no lo ha elegido, se usa el que anotó el instructor en la evaluación.
  - Si falta algo responde **422** con `faltantes` (p. ej. `["sexo", "objetivo"]`) y un mensaje que los nombra. Con % de grasa no se piden talla, edad ni sexo, porque Katch-McArdle no los usa.
- Las kcal se redondean al entero solo al final. Por eso el ejemplo de arriba da 2.369 kcal (TMB 1.389, gasto con actividad 2.153).
- La pantalla Nutrición muestra el resultado y cómo se llegó a él (fórmula, factor de actividad y ajuste por objetivo), para que la persona entienda de dónde sale el número.

## DT-08 · Despliegue en Render (API) y Vercel (web)

**Decisión:**
- **API:** Render, plan gratuito, definido en `render.yaml`. Verifica `/api/health` en cada despliegue.
- **Web:** Vercel, con Root Directory `apps/web`. Crea una vista previa por cada PR.

**Por qué:** los dos tienen plan gratuito, despliegan solos desde `main` y se configuran como código.

**Implica:**
- En el plan gratuito, Render apaga el API tras 15 minutos sin uso, así que la primera petición tarda unos segundos.
- Las variables de entorno de producción se configuran en cada plataforma, nunca en el repo.

## DT-09 · Diseño en Claude Design en lugar de Figma

**Decisión:** los wireframes de GYMM-17 y el sistema de diseño (paleta, tipografía, componentes base) se hicieron en Claude Design.

**Por qué:** así el sistema de diseño salió de los mismos tokens del frontend, y diseño y código no se desalinean.

**Implica:**
- Los colores y las fuentes se cambian primero en `apps/web/src/index.css` y después se actualiza el sistema de diseño.
- Los enlaces son privados hasta que se comparten desde el menú Share.

## DT-10 · Modo demo local con un simulador de Supabase Auth

**Decisión:** `pnpm demo` (`scripts/demo/`) levanta la app completa sin el proyecto de Supabase:
- PostgreSQL local, en Docker o en Codespaces (`.devcontainer/`).
- Un simulador mínimo de Supabase Auth que firma tokens HS256 con un secreto público de la demo. El API ya los acepta por la vía del secreto heredado (DT-05).
- La web reenvía `/api` y `/auth/v1` para que todo funcione desde un solo puerto.

**Por qué:** probar un PR o mostrar el avance exigía las credenciales de la base compartida. Además, cada prueba ensuciaba los datos que usa todo el equipo.

**Implica:**
- La demo no reemplaza probar contra Supabase antes de desplegar: el simulador implementa solo el inicio de sesión con contraseña, la renovación y el cierre de sesión.
- Si la web empieza a usar otra función de Supabase Auth (p. ej. recuperar contraseña), hay que agregarla al simulador o la demo fallará en esa pantalla.
- El secreto y la contraseña de la demo son públicos a propósito. El script se niega a correr contra una URL de Supabase.

## DT-11 · Rediseño visual minimalista y app responsive

**Decisión:**
- Paleta en blanco y negro con un solo acento: el verde del logo de la universidad (`#94B43B`). Se usa para Entrenar y para lo que la persona eligió, siempre con texto negro encima (el blanco no alcanza el contraste mínimo).
- Tipografía Archivo (variable, con eje de ancho) en lugar de Barlow. Los titulares son estrechos, gruesos y en mayúsculas (utilidad `titular` de `index.css`); el texto va a ancho normal.
- La app es responsive, con tres tamaños de referencia (prefijos de Tailwind):
  - Celular (menos de 768 px): una columna y barra de navegación abajo.
  - Tableta (`md:`, desde 768 px): más ancho y listas en dos columnas; la barra sigue abajo.
  - Computador (`lg:`, desde 1024 px): barra superior con el logo de la universidad.
  - El manifest de la PWA ya no fija la orientación vertical.
- Ícono de la PWA: GYMTRACK en blanco sobre negro (`apps/web/public/logo.svg`, con las letras convertidas a trazos). Dentro de la app se usa el logo de la Universidad Nacional (`apps/web/src/assets/logo-unal.webp`).

**Por qué:** el equipo pidió un estilo minimalista y profesional, al estilo de las apps de Nike o Adidas, y que la app también sirva en computador.

**Implica:**
- El sistema de diseño en Claude Design se rehízo con los tokens nuevos (DT-09). El enlace está en el [inicio de la wiki](Home.md).
- Los campos de formulario conservan un borde fino con contraste 3:1 para que se distingan del fondo.
- El uso del logo de la universidad debe seguir su manual de identidad visual.
- Cada pantalla se prueba a 390 px (celular), 768 px (tableta) y 1280 px (computador).

## DT-12 · Rutinas por días y catálogo de la ficha del gimnasio

**Decisión:**
- Cada ejercicio de una rutina lleva un `dia` (1 a 7) y la rutina se arma por días (Día 1, Día 2…), igual que la ficha de entrenamiento personalizado del Centro de Acondicionamiento: el número que el instructor escribe junto a cada ejercicio es el día en que se hace ("3-1" = días 3 y 1).
- Un ejercicio puede repetirse en días distintos, pero no dos veces el mismo día.
- El catálogo del seed son los 71 ejercicios de la ficha, con sus nombres. Las zonas de la ficha se asignan al grupo muscular más cercano: Muslo → cuádriceps o isquiotibiales, Cadera → glúteos.
- "Cuerpo completo" ya no se ofrece en los filtros ni al crear ejercicios; sigue en la base solo por ejercicios antiguos.
- Al asignar una rutina nueva, la anterior deja de estar vigente en la misma transacción (GYMM-21).

**Por qué:** que la app lleve las mismas rutinas que el gimnasio ya usa en papel.

**Implica:**
- Los días van seguidos desde el 1: el API rechaza una rutina con huecos (p. ej. días 1 y 3 sin el 2).
- Los ejercicios del catálogo de prueba anterior quedan desactivados, no borrados.
- Algunos ejercicios con nombre propio del gimnasio (Voladora, Copa, Cabina pecho…) no tienen descripción: la escribe un instructor desde el catálogo.

## DT-13 · Horarios de la cancha en hora de Colombia

**Decisión:**
- Las franjas (`franja_cancha.hora_inicio`/`hora_fin`, tipo `time`) son horas de Colombia: "14:00" son las 2 p. m. en Manizales.
- Colombia está en UTC−5 todo el año (no tiene horario de verano), así que el API convierte con un desfase fijo de 5 horas, sin librerías de zonas horarias. Las funciones están en `apps/api/src/cancha/cancha.horario.ts`.
- La semana va de lunes a domingo y se calcula con la fecha de Colombia, no la del servidor: el domingo a las 10 p. m. sigue siendo la misma semana aunque en UTC ya sea lunes.
- Las fechas del calendario viajan entre el API y la web como texto `AAAA-MM-DD`, sin zona, para que el navegador no las corra un día.
- Una franja está **reservada** si alguna reserva confirmada se cruza con ella, aunque sea en parte, y **pasada** si ya empezó (GYMM-20).

**Por qué:** el servidor de Render y la base de Supabase corren en UTC; sin fijar la zona, una franja de las 8 p. m. caería en el día siguiente.

**Implica:**
- **La base de datos debe estar en UTC.** El adaptador `@prisma/adapter-pg` lee los `timestamptz` sin tener en cuenta el desfase de la sesión: con una base en `America/Bogota`, las reservas se leen corridas 5 horas. Supabase, el PostgreSQL de Docker de la demo y el del CI ya están en UTC; si alguien usa un PostgreSQL local propio, debe ejecutar `ALTER DATABASE <base> SET timezone TO 'UTC'`.
- GYMM-28 (reservar) debe guardar `inicio` y `fin` con la misma conversión (`instanteEnColombia`).
- Si algún día hay sedes en otra zona horaria, el desfase fijo se reemplaza por una zona IANA por cancha.

