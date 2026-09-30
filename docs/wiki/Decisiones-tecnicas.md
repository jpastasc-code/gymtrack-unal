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
| DT-05 | Autenticación con Supabase Auth, validada en el backend | Aceptada (implementación en GYMM-10) | 2026-09-29 |
| DT-06 | Simulación de las credenciales UNAL con una tabla precargada | Aceptada (implementación en GYMM-9) | 2026-09-23 |
| DT-07 | Fórmulas nutricionales: Katch-McArdle y Mifflin-St Jeor | Aceptada; factores de objetivo y macros en **propuesta** | 2026-09-29 |
| DT-08 | Despliegue en Render (API) y Vercel (web) | Aceptada | 2026-09-29 |
| DT-09 | Diseño en Claude Design en lugar de Figma | Aceptada | 2026-09-29 |

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
- El frontend ya tiene el punto de conexión: `configurarProveedorToken` en `apps/web/src/lib/api/client.ts`.
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
