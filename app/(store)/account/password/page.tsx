"use client";

import { useState } from "react";

export default function PasswordPage() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }
        if (form.newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setLoading(true);
        setSuccess(false);
        setError("");

        try {
            const res = await fetch("/api/account/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(true);
            setForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (e: any) {
            setError(e.message || "Error al cambiar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl font-bold text-white">Cambiar contraseña</h1>

            <form
                onSubmit={handleSubmit}
                className="bg-gray-900 rounded-2xl p-6 border border-gray-800 max-w-md flex flex-col gap-4"
            >
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                        Contraseña actual
                    </label>
                    <input
                        name="currentPassword"
                        type="password"
                        value={form.currentPassword}
                        onChange={handleChange}
                        required
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                        Nueva contraseña
                    </label>
                    <input
                        name="newPassword"
                        type="password"
                        value={form.newPassword}
                        onChange={handleChange}
                        required
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                        Confirmar nueva contraseña
                    </label>
                    <input
                        name="confirmPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                        className={inputClass}
                    />
                </div>

                {success && (
                    <p className="text-sm text-green-400">
                        Contraseña actualizada correctamente.
                    </p>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                >
                    {loading ? "Guardando..." : "Cambiar contraseña"}
                </button>
            </form>
        </div>
    );
}

export const dynamic = "force-dynamic";
