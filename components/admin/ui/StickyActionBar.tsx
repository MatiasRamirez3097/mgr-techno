import type { ReactNode } from "react";

interface Props {
    // Botones (Guardar, Cancelar…). El principal conviene ponerlo último: queda a la derecha.
    children: ReactNode;
    // Texto o resumen a la izquierda (ej: total del presupuesto, mensaje de error)
    info?: ReactNode;
    // Muestra "Cambios sin guardar"
    dirty?: boolean;
    // Contenido que se despliega arriba de la barra (ej: detalle de importes)
    top?: ReactNode;
    className?: string;
}

/**
 * Barra de acciones de un formulario, pegada al borde inferior de la pantalla mientras el
 * formulario está a la vista: "Guardar" queda siempre a mano sin bajar hasta el final.
 */
export function StickyActionBar({ children, info, dirty, top, className = "" }: Props) {
    return (
        <div
            className={`sticky bottom-0 z-30 -mx-4 mt-6 border-t border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:mx-0 md:rounded-2xl md:border md:bg-gray-900/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${className}`}
        >
            {top}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-sm text-gray-400">
                    {dirty && <span className="mr-3 text-amber-300">● Cambios sin guardar</span>}
                    {info}
                </div>
                <div className="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none max-sm:[&>*]:flex-1">{children}</div>
            </div>
        </div>
    );
}
