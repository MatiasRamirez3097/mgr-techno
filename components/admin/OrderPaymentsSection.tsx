"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Payment = {
    id?: string;

    method:
        | "cash"
        | "bank_transfer"
        | "debit_card"
        | "credit_card"
        | "mercadopago"
        | "other";

    amount: number;

    status: "pending" | "paid" | "failed" | "refunded";

    reference?: string;

    paidAt?: string | Date | null;
};

type Props = {
    mode: "draft" | "persisted";

    orderId?: string;

    total: number;

    payments: Payment[];

    editable?: boolean;

    onChange?: (payments: Payment[]) => void;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    mercadopago: "MercadoPago",
    bank_transfer: "Transferencia bancaria",
    cash: "Efectivo",
};

const PAYMENT_STATUS_LABELS: Record<
    string,
    {
        label: string;
        color: string;
    }
> = {
    pending: {
        label: "Pendiente",
        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },

    paid: {
        label: "Pagado",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
    },

    failed: {
        label: "Fallido",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },

    refunded: {
        label: "Reembolsado",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    },

    partial: {
        label: "Parcial",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
};

export function OrderPaymentsSection({
    mode,
    orderId,
    total,
    payments,
    editable = true,
    onChange,
}: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const paidAmount = useMemo(() => {
        return payments
            .filter((p) => p.status === "paid")
            .reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const remaining = Math.max(total - paidAmount, 0);

    const paymentStatus = useMemo(() => {
        if (!payments.length) return "pending";

        if (paidAmount >= total) {
            return "paid";
        }

        if (paidAmount > 0) {
            return "partial";
        }

        if (payments.some((p) => p.status === "failed")) {
            return "failed";
        }

        return "pending";
    }, [payments, paidAmount, total]);

    const paymentStatusMeta =
        PAYMENT_STATUS_LABELS[paymentStatus] || PAYMENT_STATUS_LABELS.pending;

    const updateDraftPayments = (next: Payment[]) => {
        onChange?.(next);
    };

    const addPayment = async () => {
        const newPayment: Payment = {
            method: "cash",
            amount: remaining,
            status: "pending",
            reference: "",
        };

        if (mode === "draft") {
            updateDraftPayments([...payments, newPayment]);
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`/api/admin/orders/${orderId}/payments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newPayment),
            });

            if (!res.ok) {
                throw new Error("Error agregando pago");
            }

            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    const removePayment = async (index: number) => {
        if (mode === "draft") {
            updateDraftPayments(payments.filter((_, i) => i !== index));

            return;
        }

        const payment = payments[index];

        if (!payment?.id) return;

        try {
            setLoading(true);

            const res = await fetch(
                `/api/admin/orders/${orderId}/payments/${payment.id}`,
                {
                    method: "DELETE",
                },
            );

            if (!res.ok) {
                throw new Error("Error eliminando pago");
            }

            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    const updatePayment = async (
        index: number,
        field: keyof Payment,
        value: any,
    ) => {
        if (mode === "draft") {
            const next = [...payments];

            next[index] = {
                ...next[index],
                [field]: value,
            };
            updateDraftPayments(next);

            return;
        }

        const payment = payments[index];

        if (!payment?.id) return;

        try {
            console.log("try>>>", value);
            setLoading(true);

            const res = await fetch(
                `/api/admin/orders/${orderId}/payments/${payment.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        [field]: value,
                    }),
                },
            );

            if (!res.ok) {
                throw new Error("Error actualizando pago");
            }

            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 focus:border-brand outline-none transition-colors";
    console.log(payments);
    return (
        <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Pagos</h2>

                <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${paymentStatusMeta.color}`}
                >
                    {paymentStatusMeta.label}
                </span>
            </div>

            <div className="flex flex-col gap-4">
                {payments.map((payment, index) => {
                    console.log("payment>>>", payment);
                    const meta = PAYMENT_STATUS_LABELS[payment.status];

                    return (
                        <div
                            key={payment.id || index}
                            className="rounded-xl border border-gray-700 bg-gray-800/40 p-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {/* Método */}
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">
                                        Método
                                    </label>

                                    <select
                                        name="method"
                                        disabled={!editable}
                                        value={payment.method}
                                        onChange={(e) => {
                                            console.log("e>>>");
                                            updatePayment(
                                                index,
                                                "method",
                                                e.target.value,
                                            );
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="cash">Efectivo</option>

                                        <option value="bank_transfer">
                                            Transferencia
                                        </option>

                                        <option value="mercadopago">
                                            MercadoPago
                                        </option>
                                    </select>
                                </div>

                                {/* Monto */}
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">
                                        Monto
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        disabled={!editable}
                                        value={payment.amount}
                                        onChange={(e) =>
                                            updatePayment(
                                                index,
                                                "amount",
                                                Number(e.target.value),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                {/* Estado */}
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">
                                        Estado
                                    </label>

                                    <select
                                        value={payment.status}
                                        onChange={(e) =>
                                            updatePayment(
                                                index,
                                                "status",
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="pending">
                                            Pendiente
                                        </option>

                                        <option value="paid">Pagado</option>

                                        <option value="failed">Fallido</option>

                                        <option value="refunded">
                                            Reembolsado
                                        </option>
                                    </select>
                                </div>

                                {/* Eliminar */}
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        disabled={!editable}
                                        onClick={() => removePayment(index)}
                                        className="w-full py-2 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>

                            {/* Referencia */}
                            <div className="mt-3">
                                <label className="text-xs text-gray-400 mb-1 block">
                                    Referencia
                                </label>

                                <input
                                    value={payment.reference || ""}
                                    disabled={!editable}
                                    onChange={(e) =>
                                        updatePayment(
                                            index,
                                            "reference",
                                            e.target.value,
                                        )
                                    }
                                    className={inputClass}
                                    placeholder="Referencia / ID / Alias..."
                                />
                            </div>

                            {/* Badge */}
                            <div className="mt-3 flex items-center justify-between">
                                <span
                                    className={`text-[11px] font-medium px-2 py-1 rounded-full border ${meta.color}`}
                                >
                                    {meta.label}
                                </span>

                                {payment.paidAt && (
                                    <span className="text-xs text-gray-500">
                                        Pagado el{" "}
                                        {new Date(
                                            payment.paidAt,
                                        ).toLocaleDateString("es-AR")}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="border-t border-gray-700 mt-6 pt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-gray-400">
                    <span>Total orden</span>

                    <span>${total.toLocaleString("es-AR")}</span>
                </div>

                <div className="flex justify-between text-green-400">
                    <span>Pagado</span>

                    <span>${paidAmount.toLocaleString("es-AR")}</span>
                </div>

                <div className="flex justify-between text-yellow-400">
                    <span>Restante</span>

                    <span>${remaining.toLocaleString("es-AR")}</span>
                </div>
            </div>

            {/* Add */}
            {editable && (
                <button
                    type="button"
                    disabled={loading || remaining <= 0}
                    onClick={addPayment}
                    className="w-full mt-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                >
                    + Agregar pago
                </button>
            )}
        </section>
    );
}
