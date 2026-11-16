/**
 * Clases compartidas del panel de administración. Antes cada formulario definía las suyas;
 * los componentes nuevos (y los que se van migrando) usan éstas para verse iguales.
 */

const fieldBase =
    "w-full bg-gray-800 text-white text-sm rounded-lg border border-gray-700 outline-none transition-colors focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-gray-500";

// px-3 py-2.5 → 40 px de alto: cómodo de tocar en el celular sin agrandar el escritorio
export const inputClass = `${fieldBase} px-3 py-2.5`;
export const selectClass = `${fieldBase} px-3 py-2.5`;
export const textareaClass = `${fieldBase} px-3 py-2.5 min-h-24`;
// Para tablas y filas de ítems, donde el espacio es chico
export const compactInputClass = `${fieldBase} px-2.5 py-1.5`;

export const labelClass = "block text-sm font-medium text-gray-300 mb-1";
export const hintClass = "mt-1 text-xs text-gray-500";
export const errorTextClass = "mt-1 text-xs text-red-400";

export const cardClass = "bg-gray-900 rounded-2xl border border-gray-800";

const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-10 px-4 py-2";

export const buttonClass = {
    primary: `${buttonBase} bg-brand text-white hover:brightness-110`,
    secondary: `${buttonBase} bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700`,
    danger: `${buttonBase} bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20`,
    ghost: `${buttonBase} text-gray-400 hover:text-white hover:bg-gray-800`,
} as const;
