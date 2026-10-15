"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PurchaseDTO } from "@/types/shared/purchase";

interface Props {
    purchase: PurchaseDTO;
}

type ReceiveItemState = {
    productId: string;
    name: string;
    totalQuantity: number;
    alreadyReceived: number;
    pendingQuantity: number;
    receiveQuantity: number;
    hasSerialNumber: boolean;
    isOutlet: boolean;
    serials: string[];
    defects: string[];
};

export function ReceivePurchaseForm({ purchase }: Props) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const initialItems: ReceiveItemState[] = purchase.items.map((item) => {
        const prodObj =
            typeof item.productId === "object" && item.productId !== null
                ? (item.productId as { id?: string; name?: string; hasSerialNumber?: boolean; isOutlet?: boolean })
                : null;
        const productId = prodObj?.id || String(item.productId || "");
        const hasSerialNumber = Boolean(prodObj?.hasSerialNumber);
        const isOutlet = Boolean(prodObj?.isOutlet);

        const totalQuantity = item.quantity || 0;
        const alreadyReceived = item.receivedQuantity || 0;
        const pendingQuantity = Math.max(0, totalQuantity - alreadyReceived);
        const initialReceive = pendingQuantity;

        return {
            productId,
            name: item.name || prodObj?.name || "Producto",
            totalQuantity,
            alreadyReceived,
            pendingQuantity,
            receiveQuantity: initialReceive,
            hasSerialNumber,
            isOutlet,
            serials: hasSerialNumber ? Array(initialReceive).fill("") : [],
            defects: isOutlet ? Array(initialReceive).fill("") : [],
        };
    });

    const [items, setItems] = useState<ReceiveItemState[]>(initialItems);

    const handleQuantityChange = (index: number, val: number) => {
        const newItems = [...items];
        const item = newItems[index];
        const safeVal = Math.max(0, Math.min(item.pendingQuantity, Math.floor(val || 0)));

        item.receiveQuantity = safeVal;

        if (item.hasSerialNumber) {
            const currentSerials = item.serials || [];
            if (safeVal > currentSerials.length) {
                item.serials = [
                    ...currentSerials,
                    ...Array(safeVal - currentSerials.length).fill(""),
                ];
            } else {
                item.serials = currentSerials.slice(0, safeVal);
            }
        }

        if (item.isOutlet) {
            const currentDefects = item.defects || [];
            if (safeVal > currentDefects.length) {
                item.defects = [
                    ...currentDefects,
                    ...Array(safeVal - currentDefects.length).fill(""),
                ];
            } else {
                item.defects = currentDefects.slice(0, safeVal);
            }
        }

        setItems(newItems);
    };

    const handleSerialChange = (
        itemIndex: number,
        serialIndex: number,
        value: string,
    ) => {
        const newItems = [...items];
        newItems[itemIndex].serials[serialIndex] = value;
        setItems(newItems);
    };

    const handleDefectChange = (
        itemIndex: number,
        defectIndex: number,
        value: string,
    ) => {
        const newItems = [...items];
        newItems[itemIndex].defects[defectIndex] = value;
        setItems(newItems);
    };

    const totalToReceive = items.reduce(
        (acc, item) => acc + (item.receiveQuantity || 0),
        0,
    );

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        if (totalToReceive <= 0) {
            setError("Debe ingresar al menos una unidad para recepcionar.");
            return;
        }

        // Validaciones en cliente
        const seenSerials = new Set<string>();

        for (const item of items) {
            if (item.receiveQuantity < 0) {
                setError(`Cantidad inválida en "${item.name}"`);
                return;
            }

            if (item.receiveQuantity > item.pendingQuantity) {
                setError(
                    `La cantidad a recibir de "${item.name}" (${item.receiveQuantity}) no puede ser mayor al saldo pendiente (${item.pendingQuantity})`,
                );
                return;
            }

            if (item.hasSerialNumber && item.receiveQuantity > 0) {
                const filled = item.serials.map((s) => s.trim()).filter(Boolean);
                if (filled.length !== item.receiveQuantity) {
                    setError(
                        `Faltan completar números de serie para "${item.name}" (${filled.length}/${item.receiveQuantity})`,
                    );
                    return;
                }

                for (const s of filled) {
                    if (seenSerials.has(s.toLowerCase())) {
                        setError(`El número de serie "${s}" está repetido en el formulario.`);
                        return;
                    }
                    seenSerials.add(s.toLowerCase());
                }
            }

            if (item.isOutlet && item.receiveQuantity > 0) {
                const filledDefects = item.defects.map((d) => d.trim()).filter(Boolean);
                if (filledDefects.length !== item.receiveQuantity) {
                    setError(
                        `Falta detallar la descripción de fallas de todas las unidades de Outlet para "${item.name}" (${filledDefects.length}/${item.receiveQuantity})`,
                    );
                    return;
                }
            }
        }

        if (
            !confirm(
                `¿Confirmar la recepción de ${totalToReceive} unidad(es)? Esta acción impactará directamente en el inventario.`,
            )
        ) {
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                items: items
                    .filter((item) => item.receiveQuantity > 0)
                    .map((item) => ({
                        productId: item.productId,
                        quantity: item.receiveQuantity,
                        serials: item.hasSerialNumber ? item.serials.map((s) => s.trim()) : undefined,
                        defects: item.isOutlet ? item.defects.map((d) => d.trim()) : undefined,
                    })),
            };

            const res = await fetch(`/api/admin/purchases/${purchase.id}/receive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al recepcionar");
            }

            setSuccess("Recepción registrada con éxito.");
            router.push(`/admin/purchases/${purchase.id}`);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al registrar la recepción");
        } finally {
            setSubmitting(false);
        }
    };

    const allFullyReceived = items.every((i) => i.pendingQuantity === 0);

    if (allFullyReceived) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-emerald-400 font-medium mb-3">
                    ✓ Todos los productos de esta compra ya fueron recepcionados en su totalidad.
                </p>
                <Link
                    href={`/admin/purchases/${purchase.id}`}
                    className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition"
                >
                    Ver detalle de la compra
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div>
                    <span className="text-gray-400">Proveedor:</span>{" "}
                    <span className="text-white font-medium">
                        {purchase.supplierName || "—"}
                    </span>
                </div>
                <div>
                    <span className="text-gray-400">Comprobante:</span>{" "}
                    <span className="text-white font-mono font-medium">
                        {purchase.document.number || "Sin número"}
                    </span>
                </div>
                <div>
                    <span className="text-gray-400">Total a recibir ahora:</span>{" "}
                    <span className="text-brand font-bold text-base font-mono">
                        {totalToReceive} u.
                    </span>
                </div>
            </div>

            {items.map((item, index) => {
                const isItemDone = item.pendingQuantity === 0;

                return (
                    <div
                        key={index}
                        className={`bg-gray-900 border rounded-xl p-5 transition-all ${
                            isItemDone
                                ? "border-gray-800/50 opacity-60"
                                : "border-gray-800"
                        }`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <p className="text-white font-medium text-base">
                                    {item.name}
                                </p>
                                {item.isOutlet && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                        OUTLET
                                    </span>
                                )}
                                {item.hasSerialNumber && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        SERIALIZADO
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="text-gray-400">
                                    Comprado:{" "}
                                    <strong className="text-gray-200">
                                        {item.totalQuantity}
                                    </strong>
                                </span>
                                <span className="text-emerald-400">
                                    Recibido previo:{" "}
                                    <strong>{item.alreadyReceived}</strong>
                                </span>
                                <span className="text-yellow-400">
                                    Pendiente:{" "}
                                    <strong>{item.pendingQuantity}</strong>
                                </span>
                            </div>
                        </div>

                        {isItemDone ? (
                            <p className="text-xs text-emerald-400">
                                ✓ Item completamente recibido
                            </p>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 my-4">
                                    <label className="text-sm text-gray-300">
                                        Cantidad a recepcionar en esta tanda:
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={item.pendingQuantity}
                                        value={item.receiveQuantity}
                                        onChange={(e) =>
                                            handleQuantityChange(
                                                index,
                                                Number(e.target.value),
                                            )
                                        }
                                        className="bg-gray-800 border border-gray-700 text-white font-semibold px-3 py-2 rounded-lg w-28 text-center focus:border-brand outline-none transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleQuantityChange(
                                                index,
                                                item.pendingQuantity,
                                            )
                                        }
                                        className="text-xs text-brand hover:underline"
                                    >
                                        Recibir todo ({item.pendingQuantity})
                                    </button>
                                </div>

                                {/* Seriales requeridos si el producto es serializado */}
                                {item.hasSerialNumber && item.receiveQuantity > 0 && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-blue-400">
                                                Números de serie ({item.receiveQuantity} requeridos):
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {item.serials.map(
                                                (serial, sIndex) => (
                                                    <input
                                                        key={`serial-${sIndex}`}
                                                        value={serial}
                                                        onChange={(e) =>
                                                            handleSerialChange(
                                                                index,
                                                                sIndex,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder={`Número de serie #${sIndex + 1}`}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:border-brand outline-none transition-colors font-mono"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Fallas de outlet */}
                                {item.isOutlet && item.receiveQuantity > 0 && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
                                        <label className="text-xs text-purple-400 font-medium">
                                            Detalle de fallas por unidad ({item.receiveQuantity} descripciones):
                                        </label>
                                        <div className="space-y-2">
                                            {item.defects.map(
                                                (defect, dIndex) => (
                                                    <input
                                                        key={`defect-${dIndex}`}
                                                        type="text"
                                                        value={defect}
                                                        onChange={(e) =>
                                                            handleDefectChange(
                                                                index,
                                                                dIndex,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder={`Unidad #${dIndex + 1}: ej. Caja abollada, detalle estético en tapa...`}
                                                        className="w-full bg-gray-800/60 border border-purple-500/30 text-white text-sm px-3 py-2 rounded-lg focus:border-purple-500 outline-none transition-colors"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            })}

            {error && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
                    {success}
                </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
                <Link
                    href={`/admin/purchases/${purchase.id}`}
                    className="px-5 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition text-sm"
                >
                    ← Volver a la compra
                </Link>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || totalToReceive <= 0}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-900/30 text-sm"
                >
                    {submitting ? "Procesando ingreso..." : `Confirmar recepción (${totalToReceive} u.)`}
                </button>
            </div>
        </div>
    );
}
