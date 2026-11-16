"use client";

import { buttonClass, cardClass, labelClass, selectClass } from "@/components/admin/ui/styles";

type FieldError = { path?: (string | number)[]; message: string };

interface Props {
    mode: "create" | "edit";
    // Slug del producto guardado, para "Ver en tienda"
    slug?: string;
    status: string;
    onStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    loading: boolean;
    deleting: boolean;
    error: string | FieldError[] | null;
    success: string;
    dirty: boolean;
    onDelete: () => void;
}

/**
 * Publicación del producto: estado, guardar, eliminar y ver en tienda. En escritorio va en la
 * columna derecha (pegada al hacer scroll); en el celular arriba del formulario, y "Guardar" pasa
 * a la barra fija de abajo.
 */
export function ProductPublishPanel({
    mode,
    slug,
    status,
    onStatusChange,
    loading,
    deleting,
    error,
    success,
    dirty,
    onDelete,
}: Props) {
    return (
        <section className={`${cardClass} p-4 sm:p-6`}>
            <h2 className="mb-4 text-base font-bold text-white">Publicación</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label htmlFor="product-status" className={labelClass}>
                        Estado
                    </label>
                    <select id="product-status" name="status" value={status} onChange={onStatusChange} className={selectClass}>
                        <option value="publish">Publicado</option>
                        <option value="pending_review">Pendiente de revisión</option>
                        <option value="draft">Borrador</option>
                        <option value="private">Privado</option>
                    </select>
                </div>

                <FormMessages error={error} success={success} />

                {/* En el celular se guarda desde la barra fija de abajo */}
                <div className="hidden flex-col gap-2 lg:flex">
                    {dirty && <span className="text-xs text-amber-300">● Cambios sin guardar</span>}
                    <button type="submit" disabled={loading} className={`${buttonClass.primary} w-full py-3`}>
                        {loading ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear producto"}
                    </button>
                </div>

                {mode === "edit" && (
                    <div className="flex flex-wrap gap-2 border-t border-gray-800 pt-4 lg:flex-col">
                        {slug && (
                            <a
                                href={`/productos/${slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${buttonClass.ghost} flex-1`}
                            >
                                Ver en tienda →
                            </a>
                        )}
                        <button type="button" onClick={onDelete} disabled={deleting} className={`${buttonClass.danger} flex-1`}>
                            {deleting ? "Eliminando..." : "Eliminar producto"}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

/** Error (texto o lista de errores de validación) y mensaje de éxito del guardado. */
export function FormMessages({ error, success }: { error: string | FieldError[] | null; success: string }) {
    if (!error && !success) return null;
    return (
        <div className="flex flex-col gap-1">
            {error &&
                (Array.isArray(error) ? (
                    error.map((e, i) => (
                        <p key={i} className="text-sm text-red-400">
                            {e.message}
                        </p>
                    ))
                ) : (
                    <p className="text-sm text-red-400">{error}</p>
                ))}
            {success && <p className="text-sm text-green-400">{success}</p>}
        </div>
    );
}
