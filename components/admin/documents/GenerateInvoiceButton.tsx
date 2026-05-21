"use client";

import { useState } from "react";

export function GenerateInvoiceButton({ orderId }: { orderId: string }) {
    const [loading, setLoading] = useState(false);

    async function handleGenerate() {
        try {
            setLoading(true);

            const response = await fetch("/api/afip/wsfe/create", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    orderId,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            alert("Factura generada correctamente");

            window.location.reload();
        } catch (error: any) {
            console.error(error);

            alert(error.message || "Error al generar factura");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            className="
                w-full
                px-4 py-2.5
                rounded-xl
                bg-green-600
                hover:bg-green-500
                disabled:opacity-50
                text-white
                text-sm
                font-medium
                transition-colors
            "
        >
            {loading ? "Generando..." : "Generar factura AFIP"}
        </button>
    );
}
