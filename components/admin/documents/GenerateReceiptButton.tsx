"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
    orderId: string;
    hasReceipt: boolean;
    receiptUrl?: string;
}

export function GenerateReceiptButton({
    orderId,
    hasReceipt,
    receiptUrl,
}: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    async function handleGenerate() {
        try {
            setLoading(true);

            const response = await fetch(
                `/api/admin/orders/${orderId}/receipt/generate`,
                {
                    method: "POST",
                },
            );

            if (!response.ok) {
                throw new Error("Failed to generate receipt");
            }

            router.refresh();
        } catch (error) {
            console.error(error);

            alert("No se pudo generar el comprobante");
        } finally {
            setLoading(false);
        }
    }

    if (hasReceipt) {
        return (
            <div className="flex flex-col gap-2">
                <a
                    href={receiptUrl}
                    target="_blank"
                    className="
                        w-full
                        text-center
                        bg-blue-500/10
                        border
                        border-blue-500/20
                        text-blue-300
                        rounded-xl
                        px-4
                        py-2.5
                        hover:bg-blue-500/20
                        transition-colors
                    "
                >
                    Ver comprobante
                </a>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="
                        w-full
                        bg-gray-800
                        text-white
                        rounded-xl
                        px-4
                        py-2.5
                        hover:bg-gray-700
                        transition-colors
                        disabled:opacity-50
                    "
                >
                    {loading ? "Regenerando..." : "Regenerar comprobante"}
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            className="
                w-full
                bg-white
                text-black
                font-medium
                rounded-xl
                px-4
                py-2.5
                hover:bg-gray-200
                transition-colors
                disabled:opacity-50
            "
        >
            {loading ? "Generando..." : "Generar comprobante"}
        </button>
    );
}
