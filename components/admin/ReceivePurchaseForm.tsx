"use client";

import { useState } from "react";

type ReceiveItem = {
    productId: string;
    receiveQuantity: number;
    hasSerialNumber?: boolean;
    serials?: string[];
};

export function ReceivePurchaseForm({ purchase }: any) {
    console.log(">>>", purchase.items[0].productId._id);
    const [items, setItems] = useState(
        purchase.items.map((item: any) => ({
            productId: item.productId._id,
            name: item.name,
            hasSerialNumber: item.productId.hasSerialNumber,
            quantity: item.quantity,
            receiveQuantity: item.quantity,
            serials: Array(item.quantity).fill(""),
        })),
    );
    console.log(items);
    const handleQuantityChange = (index: number, value: number) => {
        const newItems = [...items];
        newItems[index].receiveQuantity = value;

        // ajustar seriales si cambia cantidad
        if (newItems[index].hasSerialNumber) {
            newItems[index].serials = Array(value).fill("");
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

    const handleSubmit = async () => {
        // 🔒 validación básica frontend
        for (const item of items) {
            if (item.receiveQuantity < 0) {
                return alert("Cantidad inválida");
            }

            if (item.hasSerialNumber) {
                const filled = item.serials.filter(
                    (s: string) => s.trim() !== "",
                );
                if (filled.length !== item.receiveQuantity) {
                    return alert(`Faltan seriales en ${item.name}`);
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
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-sm text-gray-400 mb-2">
                        Comprado: {item.quantity}
                    </p>

                    {/* 🟢 NO SERIAL */}
                    {!item.hasSerialNumber && (
                        <input
                            type="number"
                            value={item.receiveQuantity}
                            onChange={(e) =>
                                handleQuantityChange(
                                    index,
                                    Number(e.target.value),
                                )
                            }
                            className="bg-gray-800 text-white px-3 py-2 rounded w-32"
                        />
                    )}

                    {/* 🔴 SERIAL */}
                    {item.hasSerialNumber && (
                        <div className="space-y-2 mt-2">
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
                                        className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={handleSubmit}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:brightness-110"
            >
                Confirmar recepción
            </button>
        </div>
    );
}
