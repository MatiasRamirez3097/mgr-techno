"use client";

import { useState } from "react";

interface Props {
    orderId: string;
    voucherId: string;
}

export function SendVoucherEmailButton({ orderId, voucherId }: Props) {
    const [loading, setLoading] = useState(false);

    const handleSendEmail = async () => {
        if (
            !confirm(
                "¿Estás seguro de enviar este comprobante por email al cliente?",
            )
        ) {
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(
                `/api/admin/orders/${orderId}/vouchers/${voucherId}/send-email`,
                {
                    method: "POST",
                },
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al enviar el email");
            }

            alert("El email se ha enviado correctamente al cliente.");
        } catch (error: any) {
            console.error(error);
            alert(`Hubo un problema: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSendEmail}
            disabled={loading}
            className="
                flex-1
                flex items-center justify-center gap-2
                px-4 py-2
                rounded-xl
                bg-purple-500/10
                border border-purple-500/20
                text-purple-300
                hover:bg-purple-500/20
                transition-colors
                text-sm
                disabled:opacity-50
                disabled:cursor-not-allowed
            "
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
            </svg>
            {loading ? "Enviando..." : "Enviar Mail"}
        </button>
    );
}
