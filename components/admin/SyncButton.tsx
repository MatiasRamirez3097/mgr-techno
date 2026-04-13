"use client";

import { useState } from "react";

export function SyncButton() {
    const [loading, setLoading] = useState<
        "products" | "customers" | "images" | null
    >(null);
    const [results, setResults] = useState<Record<string, string>>({});

    const handleSync = async (type: "products" | "customers" | "images") => {
        const messages = {
            products:
                "¿Sincronizar todos los productos y categorías desde WooCommerce?",
            customers:
                "¿Migrar clientes desde WooCommerce? Los clientes existentes no serán sobreescritos.",
            images: "¿Migrar imágenes a Cloudinary? Esto puede tardar varios minutos dependiendo de la cantidad de productos.",
        };

        if (!confirm(messages[type])) return;

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
            } else if (type === "customers") {
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
            } else if (type === "images") {
                let page = 1;
                let totalMigrated = 0;
                let hasMore = true;

                while (hasMore) {
                    setResults((prev) => ({
                        ...prev,
                        images: `Migrando página ${page}... (${totalMigrated} imágenes migradas)`,
                    }));

                    const res = await fetch("/api/sync/images", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ page }),
                    });
                    const data = await res.json();
                    totalMigrated += data.migrated;
                    hasMore = data.hasMore;

                    // Si hay más páginas, reseteamos a página 1 porque
                    // los productos ya migrados no aparecen más en el query
                    if (hasMore) page = 1;
                }

                setResults((prev) => ({
                    ...prev,
                    images: `✓ ${totalMigrated} productos con imágenes migradas`,
                }));
            }
        } catch {
            setResults((prev) => ({ ...prev, [type]: "✗ Error" }));
        } finally {
            setLoading(null);
        }
    };

    const buttons = [
        { type: "products" as const, label: "↻ Sincronizar productos" },
        { type: "customers" as const, label: "↻ Migrar clientes" },
        { type: "images" as const, label: "↻ Migrar imágenes a Cloudinary" },
    ];

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {buttons.map(({ type, label }) => (
                <div key={type} className="flex items-center gap-2">
                    {results[type] && (
                        <span
                            className={`text-xs ${results[type].startsWith("✓") ? "text-green-400" : results[type].startsWith("✗") ? "text-red-400" : "text-gray-400"}`}
                        >
                            {results[type]}
                        </span>
                    )}
                    <button
                        onClick={() => handleSync(type)}
                        disabled={loading !== null}
                        className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-all"
                    >
                        {loading === type ? "Procesando..." : label}
                    </button>
                </div>
            ))}
        </div>
    );
}
