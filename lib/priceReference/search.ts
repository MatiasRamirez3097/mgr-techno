/** Escapa los caracteres especiales de una expresión regular */
export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Regex de una palabra que tolera espacios entre sus caracteres: "rtx4060" encuentra
 * "rtx 4060" y "8gb", "8 gb" (las tiendas separan distinto que nosotros).
 */
export const looseWordPattern = (word: string) =>
    [...word.slice(0, 40)].map(escapeRegex).join("\\s*");
