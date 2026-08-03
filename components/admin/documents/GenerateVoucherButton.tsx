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
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Calculamos las fechas mínima y máxima permitidas (ajustadas a la zona horaria local)
    const today = new Date();
    const localToday = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000,
    );
    const maxDate = localToday.toISOString().split("T")[0];

    const minDateObj = new Date(localToday);
    minDateObj.setDate(minDateObj.getDate() - 5);
    const minDate = minDateObj.toISOString().split("T")[0];

    // Por defecto, inicializamos con la fecha de hoy
    const [selectedDate, setSelectedDate] = useState(maxDate);

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
                        date: selectedDate, // Enviamos la fecha seleccionada al backend
                    }),
                },
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "No se pudo generar el comprobante",
                );
            }

            // Ocultamos el selector de fecha si todo sale bien
            setShowDatePicker(false);
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
                return "bg-white text-black hover:bg-gray-200 border border-gray-300";

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

    // Si el usuario hizo clic en el botón principal, mostramos el selector de fechas
    if (showDatePicker) {
        return (
            <div className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-700">
                        Fecha de facturación:
                    </label>
                    <input
                        type="date"
                        min={minDate}
                        max={maxDate}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex gap-2 mt-1">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${getButtonStyle()}`}
                    >
                        {loading ? "Generando..." : "Confirmar"}
                    </button>
                    <button
                        onClick={() => setShowDatePicker(false)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    // Botón inicial
    return (
        <button
            onClick={() => setShowDatePicker(true)}
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
            {getLabel()}
        </button>
    );
}
