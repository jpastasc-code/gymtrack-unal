# GymTrack UNAL

App web (PWA) del gimnasio de la Universidad Nacional. Monorepo con pnpm: `apps/api` (NestJS + Prisma + Supabase), `apps/web` (React 19 + Vite + Tailwind CSS 4) y `packages/shared`.

- Responde y escribe en español: código del dominio, textos de la interfaz, commits y PRs.
- Cómo instalar, correr y probar: [README.md](README.md).
- Reglas del equipo: [Convenciones](docs/wiki/Convenciones.md) y [Definition of Done](docs/wiki/Definition-of-Done.md).
- Antes de terminar: `pnpm lint`, `pnpm typecheck` y `pnpm test`.

## Diseño de la interfaz

Antes de crear o cambiar una pantalla, lee [docs/wiki/Sistema-de-diseno.md](docs/wiki/Sistema-de-diseno.md) y síguelo. La referencia visual de las pantallas es el artifact [Rediseño GymTrack UNAL](https://claude.ai/artifact/2VMdDupNQX1ruBPaSKT166). Si no coincide con la guía o con los componentes, mandan la guía y los componentes. Lo esencial:

- La app ya tiene un sistema de diseño. **No propongas una estética nueva**: nada de otra paleta, otra fuente ni otro estilo de tarjetas. Las pautas genéricas de diseño (por ejemplo, la skill `frontend-design`) solo valen aquí en lo que no contradiga esta guía.
- Blanco y negro con un solo acento, `verde`, reservado para Entrenar y para lo que la persona eligió. Siempre con texto negro encima.
- Arma las pantallas con los componentes de `apps/web/src/components/` (`Pantalla`, `Boton`, `Campo`, `Selector`, `AreaTexto`, `GrupoOpciones`, `Chip`) y las clases de `components/estilos.ts`. No escribas un `<button>` o un `<input>` con clases propias si ya existe el componente.
- Usa solo los tokens de `apps/web/src/index.css` (`bg-negro`, `text-grafito`, `border-linea`…). Nunca colores sueltos (`#333`, `bg-[#...]`, `text-gray-500`).
- Titulares con la utilidad `titular`. El texto corriente nunca va en mayúsculas.
- Primero el celular (390 px), luego `md:` y `lg:`. Todo lo que se toca mide al menos `min-h-11`.
- Cada pantalla con datos tiene estados de carga, error y vacío, como en `features/rutinas/ejercicios/CatalogoPage.tsx`.
- Si falta una pieza, agrégala en `components/` o como token en `index.css`, y actualiza la guía.
