"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
    inventoryItemId: string;
    serialNumber?: string;
    quantity: number;
    availableQuantity?: number;
};

type AllocationSuggestion = {
    productId: string;
    productName: string;
    quantity: number;

    isSerialized: boolean;

    hasInsufficientInventory: boolean;

    suggestions: Suggestion[];
};

type ExistingAllocation = {
    inventoryItemId: string;
    quantity: number;
};

type OrderItem = {
    productId: string;
    name: string;
    quantity: number;

    allocations?: ExistingAllocation[];
};

type Props = {
    orderId: string;

    inventoryAllocatedAt?: string | null;

    items: OrderItem[];

    allocationSuggestions: AllocationSuggestion[];
};

export function InventoryAllocationSection({
    orderId,
    inventoryAllocatedAt,
    items,
    allocationSuggestions,
}: Props) {
    const router = useRouter();

    const isAllocated = !!inventoryAllocatedAt;

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [success, setSuccess] = useState(false);

    // ============================================
    // INITIAL STATE
    // ============================================

    const initialAllocations = useMemo(() => {
        return allocationSuggestions.map((item) => ({
            productId: item.productId,

            allocations: item.suggestions.map((s) => ({
                inventoryItemId: s.inventoryItemId,

                quantity: s.quantity,
            })),
        }));
    }, [allocationSuggestions]);

    const [selectedAllocations, setSelectedAllocations] =
        useState(initialAllocations);

    // ============================================
    // SERIALIZED TOGGLE
    // ============================================

    function toggleSerializedAllocation(
        productId: string,
        inventoryItemId: string,
    ) {
        setSelectedAllocations((prev) =>
            prev.map((item) => {
                if (item.productId !== productId) return item;

                const exists = item.allocations.find(
                    (a) => a.inventoryItemId === inventoryItemId,
                );

                if (exists) {
                    return {
                        ...item,

                        allocations: item.allocations.filter(
                            (a) => a.inventoryItemId !== inventoryItemId,
                        ),
                    };
                }

                return {
                    ...item,

                    allocations: [
                        ...item.allocations,
                        {
                            inventoryItemId,
                            quantity: 1,
                        },
                    ],
                };
            }),
        );
    }

    // ============================================
    // NON SERIALIZED QUANTITY
    // ============================================

    function updateNonSerializedQuantity(
        productId: string,
        inventoryItemId: string,
        quantity: number,
    ) {
        setSelectedAllocations((prev) =>
            prev.map((item) => {
                if (item.productId !== productId) return item;

                const exists = item.allocations.find(
                    (a) => a.inventoryItemId === inventoryItemId,
                );

                if (!exists) {
                    return {
                        ...item,

                        allocations: [
                            ...item.allocations,
                            {
                                inventoryItemId,
                                quantity,
                            },
                        ],
                    };
                }

                return {
                    ...item,

                    allocations: item.allocations.map((a) =>
                        a.inventoryItemId === inventoryItemId
                            ? {
                                  ...a,
                                  quantity,
                              }
                            : a,
                    ),
                };
            }),
        );
    }

    // ============================================
    // SUBMIT
    // ============================================

    async function handleAllocate() {
        try {
            setLoading(true);

            setError(null);

            setSuccess(false);

            const res = await fetch(`/api/admin/orders/${orderId}/allocate`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    items: selectedAllocations,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error asignando inventario");
            }

            setSuccess(true);

            router.refresh();
        } catch (err: any) {
            setError(err.message || "Error asignando inventario");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-base font-bold text-white">
                        {isAllocated
                            ? "Inventario asignado"
                            : "Asignación de inventario"}
                    </h2>

                    <p className="text-sm text-gray-400 mt-1">
                        {isAllocated
                            ? `Asignado el ${new Date(
                                  inventoryAllocatedAt!,
                              ).toLocaleString("es-AR")}`
                            : "Asigná seriales o lotes a los productos de la orden."}
                    </p>
                </div>

                {!isAllocated && (
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
                    >
                        Auto asignar FIFO
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-6">
                {allocationSuggestions.map((itemSuggestion) => {
                    const currentSelection = selectedAllocations.find(
                        (a) => a.productId === itemSuggestion.productId,
                    );

                    const orderItem = items.find(
                        (i) =>
                            i.productId.toString() ===
                            itemSuggestion.productId.toString(),
                    );

                    return (
                        <div
                            key={itemSuggestion.productId}
                            className="border border-gray-800 rounded-2xl p-4"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-white">
                                        {itemSuggestion.productName}
                                    </h3>

                                    <p className="text-xs text-gray-400 mt-1">
                                        Cantidad: {itemSuggestion.quantity}
                                    </p>
                                </div>

                                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    {itemSuggestion.isSerialized
                                        ? "Serializado"
                                        : "Lotes"}
                                </span>
                            </div>

                            {/* ===================================== */}
                            {/* YA ASIGNADO */}
                            {/* ===================================== */}

                            {isAllocated ? (
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">
                                        Inventario asignado
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {orderItem?.allocations?.map(
                                            (allocation) => (
                                                <div
                                                    key={
                                                        allocation.inventoryItemId
                                                    }
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-green-500/20 bg-green-500/10"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-white">
                                                            {
                                                                allocation.inventoryItemId
                                                            }
                                                        </span>

                                                        <span className="text-xs text-green-300">
                                                            {itemSuggestion.isSerialized
                                                                ? "Serial asignado"
                                                                : `Cantidad: ${allocation.quantity}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ===================================== */}
                                    {/* SUGERENCIAS */}
                                    {/* ===================================== */}

                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-gray-500">
                                            Sugerencias FIFO
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {itemSuggestion.suggestions.map(
                                                (suggestion) => {
                                                    const checked =
                                                        !!currentSelection?.allocations.find(
                                                            (a) =>
                                                                a.inventoryItemId ===
                                                                suggestion.inventoryItemId,
                                                        );

                                                    return (
                                                        <label
                                                            key={
                                                                suggestion.inventoryItemId
                                                            }
                                                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
                                                        >
                                                            {itemSuggestion.isSerialized ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onChange={() =>
                                                                        toggleSerializedAllocation(
                                                                            itemSuggestion.productId,
                                                                            suggestion.inventoryItemId,
                                                                        )
                                                                    }
                                                                    className="rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={
                                                                        suggestion.availableQuantity
                                                                    }
                                                                    value={
                                                                        currentSelection?.allocations.find(
                                                                            (
                                                                                a,
                                                                            ) =>
                                                                                a.inventoryItemId ===
                                                                                suggestion.inventoryItemId,
                                                                        )
                                                                            ?.quantity ||
                                                                        0
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateNonSerializedQuantity(
                                                                            itemSuggestion.productId,
                                                                            suggestion.inventoryItemId,
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="w-20 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm"
                                                                />
                                                            )}

                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-white">
                                                                    {suggestion.serialNumber ||
                                                                        `Lote ${suggestion.inventoryItemId.slice(
                                                                            -6,
                                                                        )}`}
                                                                </span>

                                                                <span className="text-xs text-gray-500">
                                                                    {itemSuggestion.isSerialized
                                                                        ? "Serial sugerido FIFO"
                                                                        : `Disponible: ${suggestion.availableQuantity}`}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>

                                    {itemSuggestion.hasInsufficientInventory && (
                                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                                            <p className="text-sm text-red-300">
                                                Stock físico insuficiente para
                                                este producto.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isAllocated && (
                <>
                    {error && (
                        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                            <p className="text-sm text-green-300">
                                Inventario asignado correctamente.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end mt-6">
                        <button
                            type="button"
                            onClick={handleAllocate}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
                        >
                            {loading ? "Asignando..." : "Confirmar asignación"}
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
