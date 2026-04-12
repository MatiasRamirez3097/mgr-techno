"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
    { value: "pending", label: "Pendiente" },
    { value: "processing", label: "En proceso" },
    { value: "on_hold", label: "En espera" },
    { value: "completed", label: "Completado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "refunded", label: "Reembolsado" },
];

export function OrderStatusSelector({
    orderId,
    currentStatus,
}: {
    orderId: number;
    currentStatus: string;
}) {
    const router = useRouter();
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = async (newStatus: string) => {
        setStatus(newStatus);
        setLoading(true);
        setSuccess(false);

        try {
            await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            setSuccess(true);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {STATUSES.map((s) => (
                <label
                    key={s.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        status === s.value
                            ? "border-brand bg-brand/10"
                            : "border-gray-700 hover:border-gray-600"
                    }`}
                >
                    <input
                        type="radio"
                        name="status"
                        value={s.value}
                        checked={status === s.value}
                        onChange={() => handleChange(s.value)}
                        className="accent-brand"
                        disabled={loading}
                    />
                    <span className="text-sm text-white">{s.label}</span>
                </label>
            ))}
            {loading && <p className="text-xs text-gray-400">Guardando...</p>}
            {success && !loading && (
                <p className="text-xs text-green-400">Estado actualizado</p>
            )}
        </div>
    );
}
