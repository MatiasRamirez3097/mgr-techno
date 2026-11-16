import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
    title: ReactNode;
    description?: ReactNode;
    // Link "volver" arriba del título (ej: del detalle al listado)
    back?: { href: string; label: string };
    // Botones / filtros de la página: a la derecha en escritorio, debajo y a todo el ancho en el celular
    actions?: ReactNode;
    className?: string;
}

/** Encabezado común de las páginas del panel. */
export function AdminPageHeader({ title, description, back, actions, className = "" }: Props) {
    return (
        <header className={`mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
            <div className="min-w-0">
                {back && (
                    <Link
                        href={back.href}
                        className="mb-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                        ← {back.label}
                    </Link>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{title}</h1>
                {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
            </div>
            {actions && (
                <div className="flex flex-wrap items-stretch gap-2 sm:items-center max-sm:[&>*]:flex-1 lg:justify-end">
                    {actions}
                </div>
            )}
        </header>
    );
}
