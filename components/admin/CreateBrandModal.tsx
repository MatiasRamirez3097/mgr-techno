"use client";

import { useState } from "react";

interface CreateBrandModalProps {
    onClose: () => void;

    onCreated: (brand: any) => void;
}

export function CreateBrandModal({
    onClose,
    onCreated,
}: CreateBrandModalProps) {
    const [name, setName] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setError("");

        if (!name.trim()) {
            setError("Ingresá un nombre");

            return;
        }

        try {
            setLoading(true);

            const response = await fetch("/api/admin/brands", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    name,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || "Error al crear marca");

                return;
            }

            onCreated(data.brand);
        } catch (error) {
            console.error(error);

            setError("Error al crear marca");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="
                fixed inset-0 z-50
                bg-black/70
                backdrop-blur-sm
                flex items-center justify-center
                p-4
            "
        >
            <div
                className="
                    w-full max-w-md
                    bg-gray-900
                    border border-gray-800
                    rounded-2xl
                    p-6
                "
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        Nueva marca
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            text-gray-400
                            hover:text-white
                            transition-colors
                        "
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-300">Nombre</label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Logitech"
                            className="
                                bg-gray-800
                                border border-gray-700
                                rounded-xl
                                px-4 py-3
                                text-white
                                outline-none
                                focus:border-brand
                            "
                        />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                px-4 py-2
                                rounded-xl
                                border border-gray-700
                                text-gray-300
                                hover:border-gray-500
                                hover:text-white
                                transition-all
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                px-5 py-2
                                rounded-xl
                                bg-brand
                                text-white
                                font-medium
                                hover:brightness-110
                                disabled:opacity-50
                                transition-all
                            "
                        >
                            {loading ? "Creando..." : "Crear marca"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
