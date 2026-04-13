"use client";

import { useState } from "react";

export function SyncButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");

    const handleSync = async () => {
        if (
            !confirm(
                "¿Sincronizar todos los productos desde WooCommerce? Esto puede tardar unos minutos.",
            )
        )
            return;

        setLoading(true);
        setResult("");

        try {
            const res = await fetch("/api/sync/products", { method: "POST" });
            const data = await res.json();
            setResult(`✓ ${data.synced} productos sincronizados`);
        } catch {
            setResult("✗ Error al sincronizar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {result && (
                <span
                    className={`text-xs ${result.startsWith("✓") ? "text-green-400" : "text-red-400"}`}
                >
                    {result}
                </span>
            )}
            <button
                onClick={handleSync}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
                {loading ? "Sincronizando..." : "↻ Sincronizar desde Woo"}
            </button>
        </div>
    );
}
