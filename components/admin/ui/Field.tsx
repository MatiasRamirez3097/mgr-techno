import type { ReactNode } from "react";
import { errorTextClass, hintClass, labelClass } from "./styles";

interface Props {
    label: ReactNode;
    // id del control, para asociar la etiqueta
    htmlFor?: string;
    required?: boolean;
    hint?: ReactNode;
    error?: string | null;
    className?: string;
    children: ReactNode;
}

/** Etiqueta + control + ayuda/error. El control se pasa como hijo (con inputClass, selectClass…). */
export function Field({ label, htmlFor, required, hint, error, className = "", children }: Props) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className={labelClass}>
                {label}
                {required && <span className="ml-0.5 text-red-400">*</span>}
            </label>
            {children}
            {error ? <p className={errorTextClass}>{error}</p> : hint ? <p className={hintClass}>{hint}</p> : null}
        </div>
    );
}
