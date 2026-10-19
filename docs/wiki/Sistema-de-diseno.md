# Sistema de diseño

Guía para que todas las pantallas de GymTrack se vean y se sientan como la misma app. La decisión de fondo está en [DT-11](Decisiones-tecnicas.md#dt-11--rediseño-visual-minimalista-y-app-responsive).

## Referencia visual

**[Rediseño GymTrack UNAL](https://claude.ai/artifact/2VMdDupNQX1ruBPaSKT166)** es la referencia de cómo se ve la app. Muestra Inicio, Catálogo de ejercicios, Perfil e Iniciar sesión en un celular de 390 px, y Inicio y Catálogo en computador. Cada pantalla se puede comparar con la versión anterior al rediseño. Ábrela antes de diseñar una pantalla nueva y busca la que más se parezca.

Los colores, la tipografía, los componentes y los logos también están en el [sistema de diseño en Claude Design](https://claude.ai/artifact/J4Mv4BJRYuAwKbgdz5eWkw).

La referencia fue la propuesta. Al pasarla al código se ajustaron algunos detalles, sobre todo de accesibilidad: los campos y chips llevan un borde `borde-control` para que se distingan del fondo, y los títulos de sección usan `titular`. **Si la referencia y esta guía no coinciden, mandan esta guía y los componentes.**

> **Regla de oro:** las pantallas se arman con los componentes de `apps/web/src/components/` y los tokens de `apps/web/src/index.css`. Si falta algo, se agrega ahí (con un PR que lo explique), no en la pantalla.

## La esencia

- **Minimalista y profesional**, al estilo de las apps de Nike o Adidas. El contenido manda y la interfaz no decora.
- **Blanco y negro con un solo acento:** el verde del logo de la universidad. Si una pantalla tiene más de un color llamativo, algo está mal.
- **Titulares que pesan:** estrechos, gruesos y en mayúsculas. Es lo que más identifica a la app.
- **Pensada para el celular en el gimnasio:** botones grandes, una mano y el pulgar, poco texto. Después se adapta a tableta y computador.
- **Clara cuando algo falla:** cada estado (cargando, error, vacío) dice qué pasó y cómo seguir.

## Colores

Se usan solo como clases de Tailwind (`bg-negro`, `text-grafito`, `border-linea`…). Nunca valores sueltos como `#333`, `bg-[#...]`, `text-gray-500` o `red-600`.

| Token | Valor | Para qué |
| ----- | ----- | -------- |
| `blanco` | `#ffffff` | Fondo de la app y texto sobre negro. |
| `negro` | `#000000` | Texto principal y acciones principales (botón primario). |
| `negro-suave` | `#2b2b29` | Hover del botón primario. |
| `grafito` | `#5d5d59` | Texto secundario: ayudas, contadores, "Cargando…". Contraste 6.6:1 sobre blanco. |
| `hueso` | `#f2f2ef` | Rellenos suaves: campos, avisos, hover de filas. |
| `linea` | `#e3e3df` | Divisores de listas y bordes de estados vacíos. |
| `borde-control` | `#8a8a84` | Borde de campos, chips y opciones sin marcar. |
| `verde` | `#94b43b` | **Solo** para Entrenar y para lo que la persona eligió (filtro activo, opción marcada). |
| `verde-claro` | `#eef4dd` | Fondo de avisos de éxito. |
| `verde-tinta` | `#26300f` | Texto sobre `verde-claro` y detalle de una opción marcada. |
| `alerta` | `#b3261e` | Errores: borde del campo con error y mensaje. |

Reglas del verde:
- Encima del verde el texto va **siempre en negro**: negro sobre verde da 8.8:1, blanco sobre verde solo 2.4:1.
- El verde marca dos cosas: el camino a Entrenar (la pestaña, el botón de la barra superior, la flecha del bloque "Tu rutina de hoy") y lo que la persona eligió (filtro activo, opción marcada). Fuera de eso solo aparece en estados positivos (el punto de "Conectado al servidor", `verde-claro` en avisos de éxito).
- No se usa el verde para botones normales, enlaces ni para decorar. Una acción principal que no es Entrenar va en negro.

## Tipografía

- Una sola familia: **Archivo** (variable). No se agregan otras fuentes.
- **Titulares:** la utilidad `titular` (62 % de ancho, peso 850, mayúsculas). Tamaños en uso:
  - Título de pantalla: lo pone `Pantalla` (`text-5xl md:text-6xl lg:text-7xl`).
  - Título de sección: `titular text-3xl`.
- **Texto:** ancho normal (100 %) y pesos de 400 a 650. `text-lg` para el contenido principal y los controles; `text-sm` para ayudas y datos secundarios. Las etiquetas van en `font-semibold`.
- No se ponen en mayúsculas las etiquetas ni el texto corriente: las mayúsculas son de los titulares.

## Componentes

Antes de escribir clases, busca aquí:

| Necesitas… | Usa | Dónde |
| ---------- | --- | ----- |
| La estructura de una pantalla (titular, botón de atrás, ancho) | `Pantalla` (`volverA`, `estrecha` para formularios) | `components/Pantalla.tsx` |
| Un botón | `Boton` (`variante`: `primario`, `secundario`, `texto`; `bloque`; `grande`) | `components/Boton.tsx` |
| Un enlace que se ve como botón primario | `ENLACE_PRIMARIO` | `components/estilos.ts` |
| Un campo de texto o número (con unidad, ayuda y error) | `Campo` | `components/Campo.tsx` |
| Una lista desplegable o texto largo | `Selector`, `AreaTexto` | `components/Controles.tsx` |
| Elegir una opción entre varias | `GrupoOpciones` (`forma`: `fila` o `lista`) | `components/GrupoOpciones.tsx` |
| Un filtro que se queda marcado | `Chip` | `components/Chip.tsx` |
| Un buscador | `BUSCADOR` | `components/estilos.ts` |
| Un aviso de error o información | `AVISO` | `components/estilos.ts` |
| Un aviso de éxito ("Cambios guardados.") | `AVISO_EXITO` | `components/estilos.ts` |
| Un estado vacío | `VACIO` | `components/estilos.ts` |
| Una pantalla que llega en otra historia | `EnConstruccion` | `components/EnConstruccion.tsx` |
| Un ícono | `iconos.tsx` (trazo de 24×24, heredan el color del texto) | `components/iconos.tsx` |

Formas:
- Botones, chips y enlaces de acción: píldora (`rounded-full`).
- Campos, avisos, opciones y tarjetas: `rounded-xl`.
- No hay sombras salvo en avisos flotantes. La separación se logra con espacio y líneas (`border-linea`), no con cajas.

## Patrones de pantalla

Pantallas de referencia para copiar: [`CatalogoPage`](../../apps/web/src/features/rutinas/ejercicios/CatalogoPage.tsx) (lista con buscador, filtros y estados) y [`PerfilPage`](../../apps/web/src/features/auth/PerfilPage.tsx) (formulario).

- **Cargando:** `<p className="text-grafito" role="status">Cargando tus …</p>`.
- **Error:** `AVISO` con `role="alert"`, el mensaje en `font-medium text-alerta` y un botón "Intentar de nuevo".
- **Vacío:** `VACIO`, con una frase que explica por qué está vacío y, si se puede, la acción para salir de ahí ("Quitar filtros").
- **Listas:** filas separadas por `border-b border-linea` dentro de una `ul` con `border-t border-linea`. Desde la tableta pasan a dos columnas (`md:grid md:grid-cols-2`).
- **Formularios:** `Pantalla estrecha`, campos en columna con `gap`, y el botón de guardar `bloque grande` al final. Mientras guarda dice "Guardando…" y queda deshabilitado.

### Pantalla por pantalla

Lo que muestra la [referencia visual](https://claude.ai/artifact/2VMdDupNQX1ruBPaSKT166) y que conviene repetir en pantallas parecidas:

- **Inicio:** arriba, la fecha en `grafito` y el saludo. El acceso a la rutina es un bloque negro a todo el ancho, con el titular grande y una flecha verde. Las demás secciones van como filas (nombre en negrita, una línea de descripción en `grafito`, flecha a la derecha) separadas por líneas finas.
- **Catálogo:** sin tarjetas ni etiquetas de color. Buscador en `hueso`, chips de filtro con el activo en verde, el conteo ("27 ejercicios") y filas con separadores finos. En computador, la lista pasa a dos columnas.
- **Perfil:** secciones separadas por una línea (datos institucionales, datos personales, objetivo). Los datos que no se editan van como pares etiqueta/valor, con una ayuda que explica por qué no se pueden cambiar. Las opciones excluyentes usan `GrupoOpciones`, con la elegida en verde y texto negro.
- **Iniciar sesión:** el logo de la Universidad Nacional en sus colores originales (no el ícono de la app), el titular "GymTrack UNAL", una frase que dice para qué entrar, los campos y el botón principal en negro.
- **Computador (desde 1024 px):** la barra de abajo sube a una barra superior con el logo y la pestaña activa subrayada en negro. Entrenar queda como botón verde a la derecha y el contenido aprovecha el ancho en dos columnas.

## Responsive

Se diseña primero para el celular (390 px) y se amplía con los prefijos de Tailwind:
- **Celular** (menos de 768 px): una columna y barra de navegación abajo.
- **Tableta** (`md:`): más aire y listas en dos columnas. La barra sigue abajo.
- **Computador** (`lg:`): la barra sube con el logo de la universidad.

El ancho y los márgenes de la pantalla ya los pone `Pantalla`, así que no hay que repetirlos.

## Accesibilidad

- Todo lo que se toca mide al menos 44 px de alto (`min-h-11`). Las acciones principales, 56 px (`grande` / `min-h-14`).
- Cada control tiene una etiqueta visible (o `sr-only` en el buscador). Los errores se enlazan con `aria-describedby`, como hacen `Campo` y `Controles`.
- El foco se ve con el contorno negro del sistema. No se quita con `outline-none` sin reemplazarlo.
- Los íconos decorativos llevan `aria-hidden`. Un botón que solo tiene ícono lleva `aria-label`.

## Textos

- En español y tuteando: "Tu rutina de hoy", "Cargando tu perfil…".
- Cortos y concretos. Los botones dicen lo que hacen: "Guardar cambios", "Agregar ejercicio", no "Aceptar" o "Enviar".
- Los errores dicen qué pasó y cómo seguir. Nada de "Error 500" ni de mensajes técnicos.

## Así no

- Colores fuera de la tabla, degradados o un segundo color de acento.
- Otra fuente, o titulares sin la utilidad `titular`.
- Un `<button>` o un `<input>` con clases propias cuando ya existe `Boton`, `Campo` o `Controles`.
- Tarjetas con sombra y borde para todo: aquí se separa con espacio y líneas.
- Etiquetas en mayúsculas, numeración (01 / 02) que no es una secuencia o adornos sin información.

## Cuando falta algo

1. Revisa si un componente existente lo resuelve con sus props.
2. Si no, crea o amplía el componente en `components/` (o un token en `index.css`) y úsalo desde la pantalla.
3. Explica en el PR por qué hacía falta y agrega una captura. Si cambia el estilo de la app, regístralo en [Decisiones técnicas](Decisiones-tecnicas.md) y en esta guía.
