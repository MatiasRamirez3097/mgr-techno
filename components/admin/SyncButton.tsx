"use client";

import { useState } from "react";

export function SyncButton() {
    const [loading, setLoading] = useState<"products" | "customers" | null>(
        null,
    );
    const [results, setResults] = useState<Record<string, string>>({});

    const handleSync = async (type: "products" | "customers") => {
        const msg =
            type === "products"
                ? "¿Sincronizar todos los productos y categorías desde WooCommerce?"
                : "¿Migrar clientes desde WooCommerce? Los clientes existentes no serán sobreescritos.";

        if (!confirm(msg)) return;

        setLoading(type);
        setResults((prev) => ({ ...prev, [type]: "" }));

        try {
            if (type === "products") {
                const res = await fetch("/api/sync/products", {
                    method: "POST",
                });
                const data = await res.json();
                setResults((prev) => ({
                    ...prev,
                    products: `✓ ${data.productsSynced} productos, ${data.categoriesSynced} categorías`,
                }));
            } else {
                // Clientes — procesamos página por página
                let page = 1;
                let totalSynced = 0;
                let totalSkipped = 0;
                let hasMore = true;

                while (hasMore) {
                    setResults((prev) => ({
                        ...prev,
                        customers: `Procesando página ${page}...`,
                    }));

                    const res = await fetch("/api/sync/customers", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ page }),
                    });
                    const data = await res.json();

                    totalSynced += data.synced;
                    totalSkipped += data.skipped;
                    hasMore = data.hasMore;
                    page++;
                }

                setResults((prev) => ({
                    ...prev,
                    customers: `✓ ${totalSynced} migrados, ${totalSkipped} salteados`,
                }));
            }
        } catch {
            setResults((prev) => ({
                ...prev,
                [type]: "✗ Error al sincronizar",
            }));
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {results.products && (
                <span
                    className={`text-xs ${results.products.startsWith("✓") ? "text-green-400" : "text-red-400"}`}
                >
                    {results.products}
                </span>
            )}
            <button
                onClick={() => handleSync("products")}
                disabled={loading !== null}
                className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
                {loading === "products"
                    ? "Sincronizando..."
                    : "↻ Sincronizar productos"}
            </button>

            {results.customers && (
                <span
                    className={`text-xs ${results.customers.startsWith("✓") ? "text-green-400" : "text-red-400"}`}
                >
                    {results.customers}
                </span>
            )}
            <button
                onClick={() => handleSync("customers")}
                disabled={loading !== null}
                className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
                {loading === "customers" ? "Migrando..." : "↻ Migrar clientes"}
            </button>
        </div>
    );
}
