"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
    orderId: string;
    paymentId: string;
    currentStatus: string;
}

export function PaymentStatusSelector({
    orderId,
    paymentId,
    currentStatus,
}: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const handleChange = async (status: string) => {
        try {
            setLoading(true);

            const res = await fetch(
                `/api/admin/orders/${orderId}/payments/${paymentId}`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        status,
                    }),
                },
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al actualizar");
            }

            router.refresh();
        } catch (error) {
            console.log(error);

            alert("No se pudo actualizar el pago");
        } finally {
            setLoading(false);
        }
    };

    return (
        <select
            disabled={loading}
            value={currentStatus}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50"
        >
            <option value="pending">Pendiente</option>

            <option value="paid">Pagado</option>

            <option value="failed">Fallido</option>

            <option value="refunded">Reembolsado</option>
        </select>
    );
}
