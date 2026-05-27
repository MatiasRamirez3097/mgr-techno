"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
    orderId: string;

    type:
        | "non_fiscal_receipt"
        | "fiscal_invoice"
        | "credit_note"
        | "debit_note";

    fiscalType?: "A" | "B" | "C" | "M";

    relatedVoucherId?: string;

    label?: string;
}

export function GenerateVoucherButton({
    orderId,
    type,
    fiscalType,
    relatedVoucherId,
    label,
}: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    async function handleGenerate() {
        try {
            setLoading(true);

            const response = await fetch(
                `/api/admin/orders/${orderId}/vouchers/generate`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        type,
                        fiscalType,
                        relatedVoucherId,
                    }),
                },
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "No se pudo generar el comprobante",
                );
            }

            router.refresh();
        } catch (error: any) {
            console.error(error);

            alert(error.message || "Error al generar comprobante");
        } finally {
            setLoading(false);
        }
    }

    function getButtonStyle() {
        switch (type) {
            case "non_fiscal_receipt":
                return "bg-white text-black hover:bg-gray-200";

            case "fiscal_invoice":
                return "bg-green-600 text-white hover:bg-green-500";

            case "credit_note":
                return "bg-yellow-600 text-white hover:bg-yellow-500";

            case "debit_note":
                return "bg-orange-600 text-white hover:bg-orange-500";

            default:
                return "bg-gray-800 text-white hover:bg-gray-700";
        }
    }

    function getLabel() {
        if (label) return label;

        switch (type) {
            case "non_fiscal_receipt":
                return "Generar comprobante";

            case "fiscal_invoice":
                return `Generar factura ${fiscalType ?? ""}`;

            case "credit_note":
                return "Generar nota de crédito";

            case "debit_note":
                return "Generar nota de débito";

            default:
                return "Generar documento";
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            className={`
                px-4 py-2.5
                rounded-xl
                text-sm
                font-medium
                transition-colors
                disabled:opacity-50
                ${getButtonStyle()}
            `}
        >
            {loading ? "Generando..." : getLabel()}
        </button>
    );
}
