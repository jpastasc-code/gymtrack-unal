/** Clases compartidas del sistema de diseño para elementos que no son un componente propio. */

/** Enlace que se ve como el Boton primario grande (p. ej. "Agregar ejercicio"). */
export const ENLACE_PRIMARIO =
  'flex min-h-14 items-center justify-center rounded-full bg-negro px-6 text-lg font-semibold text-blanco hover:bg-negro-suave'

/** Enlace que se ve como el Boton secundario: píldora con borde negro (p. ej. "Entrenar como deportista"). */
export const ENLACE_SECUNDARIO =
  'flex min-h-11 items-center justify-center gap-2 rounded-full bg-blanco px-6 text-lg font-semibold text-negro shadow-[inset_0_0_0_1.5px_var(--color-negro)] hover:bg-hueso'

/** Campo de búsqueda: relleno suave, borde fino y foco negro. */
export const BUSCADOR =
  'min-h-13 w-full rounded-xl border border-borde-control bg-hueso px-4 text-lg placeholder:text-grafito focus:border-negro focus:outline-3 focus:outline-offset-2 focus:outline-negro'

/** Aviso de error o información sobre relleno suave. */
export const AVISO = 'rounded-xl bg-hueso p-4'

/** Aviso de éxito ("Cambios guardados."). */
export const AVISO_EXITO = 'rounded-xl bg-verde-claro p-4 font-semibold text-verde-tinta'

/** Estado vacío: borde punteado, sin relleno. */
export const VACIO = 'rounded-xl border-2 border-dashed border-linea p-5 text-lg'
