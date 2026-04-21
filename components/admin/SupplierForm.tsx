import { useState } from "react";

export function SupplierForm({
    onSuccess,
    onCancel,
}: {
    onSuccess: (supplier: any) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onSuccess(data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none"
                required
            />

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-brand text-white text-sm"
                >
                    {loading ? "Creando..." : "Crear"}
                </button>
            </div>
        </form>
    );
}
