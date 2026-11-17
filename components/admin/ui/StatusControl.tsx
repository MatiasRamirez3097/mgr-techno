"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { buttonClass, cardClass, selectClass } from "./styles";

export interface StatusStep {
    key: string;
    label: string;
    // Cambia a este estado…
    status?: string;
    // …o lleva a otra página (ej: "Recepcionar")…
    href?: string;
    // …o ejecuta otra acción (ej: "Convertir a venta")
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
}

interface Props {
    status: string;
    meta: (status: string) => { label: string; color: string };
    // Pasos habituales desde el estado actual (botones principales)
    nextSteps: (status: string) => StatusStep[];
    // Todos los estados elegibles a mano en "Otro estado"
    options: { value: string; label: string }[];
    // Estado no permitido ahora (ej: requiere pago); se muestra deshabilitado
    isBlocked?: (status: string) => boolean;
    // Mensaje de confirmación antes de cambiar (null = sin confirmar)
    confirmFor?: (status: string) => string | null;
    // Guarda el cambio; si falla, debe lanzar un Error con el mensaje para el admin
    onChange: (status: string) => Promise<void>;
    // Avisos debajo (ej: pago sin confirmar)
    notice?: ReactNode;
    // Sin acciones (ej: compra ya recibida)
    readOnly?: boolean;
    className?: string;
}

const DESTRUCTIVE = ["cancelled", "rejected", "refunded", "failed"];

/**
 * Estado en una sola fila: etiqueta del estado actual, el siguiente paso habitual como botón y
 * "Otro estado" para el resto. Se usa en órdenes, presupuestos y compras.
 */
export function StatusControl({
    status: initialStatus,
    meta,
    nextSteps,
    options,
    isBlocked = () => false,
    confirmFor = () => null,
    onChange,
    notice,
    readOnly = false,
    className = "",
}: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showOther, setShowOther] = useState(false);
    const [other, setOther] = useState("");

    const current = meta(status);
    const steps = readOnly ? [] : nextSteps(status);
    const otherOptions = options.filter((o) => o.value !== status);

    const change = async (target: string) => {
        if (!target || target === status) return;
        const label = meta(target).label;
        if (isBlocked(target)) {
            setError(`No se puede pasar a "${label}" por ahora.`);
            return;
        }
        const message = confirmFor(target);
        if (message && !confirm(message)) return;

        setSaving(target);
        setError("");
        setSuccess("");
        try {
            await onChange(target);
            setStatus(target);
            setSuccess(`Estado actualizado a "${label}"`);
            setShowOther(false);
            setOther("");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
        } finally {
            setSaving(null);
        }
    };

    return (
        <section className={`${cardClass} p-4 sm:p-5 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Estado</span>
                    <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${current.color}`}>{current.label}</span>
                </div>

                {!readOnly && (
                    <div className="flex flex-1 flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
                        {steps.map((step) =>
                            step.href ? (
                                <Link key={step.key} href={step.href} className={buttonClass.primary}>
                                    {step.label}
                                </Link>
                            ) : (
                                <button
                                    key={step.key}
                                    type="button"
                                    onClick={() => (step.onClick ? step.onClick() : step.status && change(step.status))}
                                    disabled={
                                        saving !== null || step.disabled || (step.status ? isBlocked(step.status) : false)
                                    }
                                    title={step.title}
                                    className={buttonClass.primary}
                                >
                                    {saving && saving === step.status ? "Guardando..." : step.label}
                                </button>
                            ),
                        )}
                        {otherOptions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowOther((v) => !v)}
                                aria-expanded={showOther}
                                className={buttonClass.secondary}
                            >
                                Otro estado {showOther ? "▴" : "▾"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {notice}

            {showOther && !readOnly && (
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-800 pt-3 sm:flex-row sm:items-center">
                    <span className="text-sm text-gray-400 sm:shrink-0">Cambiar a</span>
                    <select
                        aria-label="Cambiar a otro estado"
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        className={`${selectClass} sm:max-w-xs`}
                    >
                        <option value="">Elegí un estado…</option>
                        {otherOptions.map((o) => (
                            <option key={o.value} value={o.value} disabled={isBlocked(o.value)}>
                                {o.label}
                                {isBlocked(o.value) ? " (no disponible)" : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => change(other)}
                        disabled={!other || saving !== null}
                        className={DESTRUCTIVE.includes(other) ? buttonClass.danger : buttonClass.secondary}
                    >
                        {saving && saving === other ? "Guardando..." : "Aplicar"}
                    </button>
                </div>
            )}

            {(error || success) && (
                <p className={`mt-3 text-sm ${error ? "text-red-400" : "text-green-400"}`}>{error || success}</p>
            )}
        </section>
    );
}
