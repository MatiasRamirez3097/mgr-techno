"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";
import { ProductDTO } from "@/types/shared/product";

interface OutletUnit {
    id: string;
    defectDescription: string;
}

interface Props {
    product: ProductDTO;
    units: OutletUnit[];
}

export function OutletSelector({ product, units }: Props) {
    // Seleccionamos por defecto la primera unidad disponible
    const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id);

    if (units.length === 0) {
        return (
            <p className="text-sm text-red-500 font-medium">
                Sin stock de outlet disponible.
            </p>
        );
    }

    const selectedUnit = units.find((u) => u.id === selectedUnitId);

    // ==========================================
    // TRUCO PARA EL CARRITO:
    // ==========================================
    // Modificamos el objeto del producto al vuelo.
    // Al alterar el ID (product.id + unit.id), obligamos al carrito a tratar
    // cada unidad de outlet como un ítem único e independiente.
    // Además, el cliente verá la falla específica escrita en su carrito de compras.
    const productForCart: ProductDTO = selectedUnit
        ? {
              ...product,
              id: `${product.id}|${selectedUnit.id}`, // Separador | para luego separarlo en el backend al crear la orden
              name: `${product.name} (Falla: ${selectedUnit.defectDescription})`,
              availableStock: 1, // Es una unidad única física
          }
        : product;

    return (
        <div className="flex flex-col gap-5">
            <div className="space-y-3">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    Unidades disponibles (Elegí la falla):
                </label>

                <div className="flex flex-col gap-2">
                    {units.map((unit) => (
                        <label
                            key={unit.id}
                            className={`
                                flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all
                                ${
                                    selectedUnitId === unit.id
                                        ? "bg-purple-900/20 border-purple-500"
                                        : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                                }
                            `}
                        >
                            <input
                                type="radio"
                                name="outletUnit"
                                value={unit.id}
                                checked={selectedUnitId === unit.id}
                                onChange={() => setSelectedUnitId(unit.id)}
                                className="mt-0.5 w-4 h-4 text-purple-500 bg-gray-800 border-gray-600 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                            />
                            <span
                                className={`text-sm leading-snug transition-colors ${
                                    selectedUnitId === unit.id
                                        ? "text-purple-100 font-medium"
                                        : "text-gray-400"
                                }`}
                            >
                                {unit.defectDescription}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Le pasamos nuestro producto adulterado al botón de siempre */}
            <AddToCartButton product={productForCart} />
        </div>
    );
}
