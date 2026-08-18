"use client";

import { useState } from "react";

type ReceiveItem = {
    productId: string;
    receiveQuantity: number;
    hasSerialNumber?: boolean;
    isOutlet?: boolean; // NUEVO
    serials?: string[];
    defects?: string[]; // NUEVO
};

export function ReceivePurchaseForm({ purchase }: any) {
    const [items, setItems] = useState(
        purchase.items.map((item: any) => ({
            productId: item.productId.id,
            name: item.name,
            hasSerialNumber: item.productId.hasSerialNumber,
            isOutlet: item.productId.isOutlet, // Traemos el flag del producto
            quantity: item.quantity,
            receiveQuantity: item.quantity,
            serials: Array(item.quantity).fill(""),
            defects: Array(item.quantity).fill(""), // Inicializamos el array de fallas
        })),
    );

    const handleQuantityChange = (index: number, value: number) => {
        const newItems = [...items];
        newItems[index].receiveQuantity = value;

        // ajustar seriales si cambia cantidad
        if (newItems[index].hasSerialNumber) {
            newItems[index].serials = Array(value).fill("");
        }

        // NUEVO: ajustar inputs de fallas si cambia cantidad
        if (newItems[index].isOutlet) {
            newItems[index].defects = Array(value).fill("");
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

    // NUEVO: Manejador para los textos de las fallas
    const handleDefectChange = (
        itemIndex: number,
        defectIndex: number,
        value: string,
    ) => {
        const newItems = [...items];
        newItems[itemIndex].defects[defectIndex] = value;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        // 🔒 validación básica frontend
        for (const item of items) {
            if (item.receiveQuantity < 0) {
                return alert("Cantidad inválida");
            }

            // Validar seriales
            if (item.hasSerialNumber) {
                const filled = item.serials.filter(
                    (s: string) => s.trim() !== "",
                );
                if (filled.length !== item.receiveQuantity) {
                    return alert(`Faltan seriales en ${item.name}`);
                }
            }

            // NUEVO: Validar fallas de outlet
            if (item.isOutlet) {
                const filledDefects = item.defects.filter(
                    (d: string) => d.trim() !== "",
                );
                if (filledDefects.length !== item.receiveQuantity) {
                    return alert(
                        `Faltan detallar las fallas (Outlet) en ${item.name}`,
                    );
                }
            }
        }

        if (
            !confirm("¿Confirmar recepción? Esta acción no se puede deshacer.")
        ) {
            return;
        }

        const payload = {
            items: items.map((item: ReceiveItem) => ({
                productId: item.productId,
                quantity: item.receiveQuantity,
                serials: item.hasSerialNumber ? item.serials : undefined,
                defects: item.isOutlet ? item.defects : undefined, // Lo sumamos al payload
            })),
        };

        const res = await fetch(`/api/admin/purchases/${purchase.id}/receive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Error al recepcionar");
            return;
        }

        alert("Compra recepcionada correctamente");
        window.location.href = "/admin/purchases";
    };

    return (
        <div className="space-y-6">
            {items.map((item: any, index: number) => (
                <div
                    key={index}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium">{item.name}</p>
                        {item.isOutlet && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                OUTLET
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Comprado: {item.quantity}
                    </p>

                    {/* 🟢 CANTIDAD (Si no tiene serial, el usuario puede cambiar la cantidad) */}
                    {!item.hasSerialNumber && (
                        <div className="mb-4">
                            <label className="block text-xs text-gray-400 mb-1">
                                Cant. a recepcionar:
                            </label>
                            <input
                                type="number"
                                value={item.receiveQuantity}
                                onChange={(e) =>
                                    handleQuantityChange(
                                        index,
                                        Number(e.target.value),
                                    )
                                }
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded w-32 focus:border-brand outline-none transition-colors"
                            />
                        </div>
                    )}

                    {/* 🔴 SERIAL */}
                    {item.hasSerialNumber && (
                        <div className="space-y-2 mt-2">
                            <label className="block text-xs text-gray-400">
                                Números de serie:
                            </label>
                            {item.serials.map(
                                (serial: string, sIndex: number) => (
                                    <input
                                        key={sIndex}
                                        value={serial}
                                        onChange={(e) =>
                                            handleSerialChange(
                                                index,
                                                sIndex,
                                                e.target.value,
                                            )
                                        }
                                        placeholder={`Serial ${sIndex + 1}`}
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded focus:border-brand outline-none transition-colors"
                                    />
                                ),
                            )}
                        </div>
                    )}

                    {/* 🟣 DETALLES OUTLET */}
                    {item.isOutlet && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
                            <label className="block text-xs text-purple-400 font-medium">
                                Descripciones de falla por unidad:
                            </label>
                            {item.defects.map(
                                (defect: string, dIndex: number) => (
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
                                        placeholder={`Falla de la unidad ${dIndex + 1} (Ej: Caja rota, raya lateral...)`}
                                        className="w-full bg-gray-800/50 border border-purple-500/30 text-white px-3 py-2 rounded focus:border-purple-500 outline-none transition-colors"
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={handleSubmit}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:brightness-110 transition-all"
            >
                Confirmar recepción
            </button>
        </div>
    );
}
