import type { ReactNode } from "react";

interface Props {
    // Botones (Cancelar, Guardar…); el principal va último
    children: ReactNode;
    // Mensaje a la izquierda (error / éxito)
    message?: ReactNode;
}

/**
 * Pie de un formulario dentro de `FormModal`: queda pegado abajo mientras se hace scroll en el
 * modal, así "Guardar" está siempre a mano. Los márgenes negativos lo llevan al borde del modal.
 */
export function ModalFormFooter({ children, message }: Props) {
    return (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6">
            <div className="min-w-0 text-sm">{message}</div>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none max-sm:[&>*]:flex-1">{children}</div>
        </div>
    );
}
