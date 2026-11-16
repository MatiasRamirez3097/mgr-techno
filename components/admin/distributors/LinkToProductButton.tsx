"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormModal } from "@/components/admin/FormModal";
import { ProductSelector, type ProductOption } from "@/components/admin/ProductSelector";
import type { NormalizedProduct } from "@/types/shared/distributor";

interface Props {
    item: NormalizedProduct;
    linkedProducts: { productId: string; productName: string }[];
}

/** Vincula un resultado del comparador con un producto propio (o muestra a cuál está vinculado). */
export function LinkToProductButton({ item, linkedProducts }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ProductOption | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function save() {
        if (!selected) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/products/${selected.id}/distributor-links`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    distributor: item.distributor,
                    distributorProductId: String(item.id),
                    distributorSku: item.sku,
                    name: item.name,
                    link: item.link,
                    image: item.image,
                    price: item.price,
                    stock: item.stock,
                    stockLabel: item.stockLabel ?? null,
                    matchMethod: "manual",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al vincular");
            setOpen(false);
            setSelected(null);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al vincular");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="flex flex-col items-start gap-1">
                {linkedProducts.map((p) => (
                    <Link
                        key={p.productId}
                        href={`/admin/products/${p.productId}`}
                        className="text-xs text-emerald-300 hover:underline line-clamp-1 max-w-[180px]"
                        title={p.productName}
                    >
                        🔗 {p.productName}
                    </Link>
                ))}
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="text-xs text-gray-400 hover:text-white underline"
                >
                    {linkedProducts.length > 0 ? "Vincular otro" : "Vincular"}
                </button>
            </div>

            {open && (
                <FormModal title="Vincular con un producto de la tienda">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            <span className="text-white font-medium">{item.name}</span>
                            <span className="block text-xs font-mono">
                                {item.distributor} · {item.sku}
                            </span>
                        </p>
                        <ProductSelector value={selected} statusAll excludeBundles onChange={setSelected} />
                        <p className="text-xs text-gray-500">
                            Si el producto ya estaba vinculado con otro ítem de {item.distributor}, se reemplaza.
                        </p>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    setSelected(null);
                                    setError("");
                                }}
                                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={!selected || saving}
                                className="px-4 py-2 rounded-lg bg-brand text-white font-semibold text-sm disabled:opacity-50"
                            >
                                {saving ? "Vinculando…" : "Vincular"}
                            </button>
                        </div>
                    </div>
                </FormModal>
            )}
        </>
    );
}
