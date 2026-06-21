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
    inventoryItemId: string | any; // Acepta string o el objeto populado de MongoDB
    quantity: number;
    serialNumber?: string;
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
    // INITIAL STATE (PRE-SELECCIÓN FIFO)
    // ============================================
    const initialAllocations = useMemo(() => {
        return allocationSuggestions.map((item) => {
            if (item.isSerialized) {
                const fifoSelection = item.suggestions.slice(0, item.quantity);
                return {
                    productId: item.productId,
                    allocations: fifoSelection.map((s) => ({
                        inventoryItemId: s.inventoryItemId,
                        quantity: s.quantity,
                    })),
                };
            } else {
                return {
                    productId: item.productId,
                    allocations: item.suggestions.map((s) => ({
                        inventoryItemId: s.inventoryItemId,
                        quantity: s.quantity,
                    })),
                };
            }
        });
    }, [allocationSuggestions]);

    const [selectedAllocations, setSelectedAllocations] =
        useState(initialAllocations);

    // ============================================
    // SERIALIZED TOGGLE CON LÍMITE
    // ============================================
    function toggleSerializedAllocation(
        productId: string,
        inventoryItemId: string,
        maxQuantity: number,
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

                if (item.allocations.length >= maxQuantity) {
                    alert(
                        `Solo puedes asignar ${maxQuantity} seriales para este producto.`,
                    );
                    return item;
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
                            { inventoryItemId, quantity },
                        ],
                    };
                }

                return {
                    ...item,
                    allocations: item.allocations.map((a) =>
                        a.inventoryItemId === inventoryItemId
                            ? { ...a, quantity }
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

            const missingAllocations = allocationSuggestions.some((sug) => {
                const sel = selectedAllocations.find(
                    (a) => a.productId === sug.productId,
                );
                if (sug.isSerialized) {
                    return !sel || sel.allocations.length !== sug.quantity;
                }
                return false;
            });

            if (missingAllocations) {
                throw new Error(
                    "Por favor, asegúrate de seleccionar la cantidad exacta de números de serie requeridos.",
                );
            }

            const res = await fetch(`/api/admin/orders/${orderId}/allocate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: selectedAllocations }),
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
                            : "Revisa las sugerencias FIFO o selecciona seriales alternativos."}
                    </p>
                </div>
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

                    const selectedCount =
                        currentSelection?.allocations.length || 0;
                    const isSelectionComplete =
                        selectedCount === itemSuggestion.quantity;

                    return (
                        <div
                            key={itemSuggestion.productId}
                            className="border border-gray-800 rounded-2xl p-4 bg-gray-800/20"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-white">
                                        {itemSuggestion.productName}
                                    </h3>

                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                        <span>
                                            Requeridos:{" "}
                                            {itemSuggestion.quantity}
                                        </span>
                                        {itemSuggestion.isSerialized &&
                                            !isAllocated && (
                                                <span
                                                    className={`font-medium ${isSelectionComplete ? "text-green-400" : "text-amber-400"}`}
                                                >
                                                    (Seleccionados:{" "}
                                                    {selectedCount})
                                                </span>
                                            )}
                                    </div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {orderItem?.allocations?.map(
                                            (allocation, idx) => {
                                                // NUEVO: Normalizamos el ID por si viene como String o como Objeto Populado
                                                const invId =
                                                    typeof allocation.inventoryItemId ===
                                                    "object"
                                                        ? allocation
                                                              .inventoryItemId
                                                              ._id
                                                        : allocation.inventoryItemId;

                                                const populatedSerial =
                                                    typeof allocation.inventoryItemId ===
                                                    "object"
                                                        ? allocation
                                                              .inventoryItemId
                                                              .serialNumber
                                                        : undefined;

                                                // Si por algún milagro sigue en sugerencias, lo sacamos de ahí
                                                const matchedSuggestion =
                                                    itemSuggestion.suggestions.find(
                                                        (s) =>
                                                            s.inventoryItemId ===
                                                            invId,
                                                    );

                                                // Prioridades: 1. Serial guardado plano, 2. Serial populado de MongoDB, 3. Sugerencia, 4. ID crudo
                                                const serialToShow =
                                                    allocation.serialNumber ||
                                                    populatedSerial ||
                                                    matchedSuggestion?.serialNumber ||
                                                    `Ref: ${String(invId).slice(-6)}`;

                                                return (
                                                    <div
                                                        key={invId || idx}
                                                        className="flex items-center gap-3 p-3 rounded-xl border border-green-500/20 bg-green-500/10"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-white font-mono">
                                                                {itemSuggestion.isSerialized
                                                                    ? serialToShow
                                                                    : `Lote ${String(invId).slice(-6)}`}
                                                            </span>
                                                            <span className="text-xs text-green-300">
                                                                {itemSuggestion.isSerialized
                                                                    ? "Serial asignado"
                                                                    : `Cantidad: ${allocation.quantity}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ===================================== */}
                                    {/* SUGERENCIAS Y ALTERNATIVAS */}
                                    {/* ===================================== */}
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-gray-500">
                                            {itemSuggestion.isSerialized
                                                ? "Seriales disponibles"
                                                : "Sugerencias FIFO"}
                                        </p>

                                        <div
                                            className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${itemSuggestion.isSerialized ? "max-h-60 overflow-y-auto pr-2 custom-scrollbar" : ""}`}
                                        >
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
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                                                            ${checked ? "border-brand/50 bg-brand/10" : "border-gray-800 hover:border-gray-700"}
                                                        `}
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
                                                                            itemSuggestion.quantity,
                                                                        )
                                                                    }
                                                                    className="rounded border-gray-700 bg-gray-800 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
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
                                                                    className="w-20 px-2 py-1 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-brand focus:outline-none"
                                                                />
                                                            )}

                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-white font-mono">
                                                                    {suggestion.serialNumber ||
                                                                        `Lote ${suggestion.inventoryItemId.slice(-6)}`}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {itemSuggestion.isSerialized
                                                                        ? "Disponible"
                                                                        : `Stock del lote: ${suggestion.availableQuantity}`}
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
                                                este producto. No se pueden
                                                asignar todos los ítems.
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
                            className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors shadow-lg shadow-green-600/20"
                        >
                            {loading ? "Asignando..." : "Confirmar asignación"}
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
