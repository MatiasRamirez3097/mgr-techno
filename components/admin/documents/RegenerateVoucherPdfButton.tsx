"use client";

import { useRouter } from "next/navigation";

import { useState } from "react";

interface Props {
    orderId: string;

    voucherId: string;
}

export function RegenerateVoucherPdfButton({ orderId, voucherId }: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    async function handleClick() {
        try {
            setLoading(true);

            const response = await fetch(
                `/api/admin/orders/${orderId}/vouchers/${voucherId}/regenerate`,
                {
                    method: "POST",
                },
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            router.refresh();
        } catch (error: any) {
            console.error(error);

            alert(error.message || "Error al regenerar PDF");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="
                px-4 py-2
                rounded-xl
                bg-gray-800
                hover:bg-gray-700
                disabled:opacity-50
                text-white
                text-sm
                transition-colors
            "
        >
            {loading ? "Regenerando..." : "Regenerar PDF"}
        </button>
    );
}
