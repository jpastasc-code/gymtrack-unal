interface Props {
  /** Historia de Jira que implementa esta pantalla. */
  historia: string
  /** Qué podrá hacer la persona aquí, en sus palabras. */
  descripcion: string
}

/** Marcador para pantallas cuyo contenido llega en una historia posterior. */
export function EnConstruccion({ historia, descripcion }: Props) {
  return (
    <section className="rounded-2xl border-2 border-dashed border-linea bg-superficie p-5">
      <p className="text-lg leading-snug">{descripcion}</p>
      <p className="mt-3 text-sm text-gris">
        Pantalla en construcción ({historia}).
      </p>
    </section>
  )
}
