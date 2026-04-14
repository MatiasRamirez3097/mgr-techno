"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [form, setForm] = useState({ password: "", confirm: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirm) {
            setError("Las contraseñas no coinciden");
            return;
        }
        if (form.password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: form.password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            router.push("/login?reset=success");
        } catch (e: any) {
            setError(e.message || "Error al restablecer la contraseña");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center">
                <p className="text-red-400 mb-4">Link inválido</p>
                <Link
                    href="/forgot-password"
                    className="text-brand hover:brightness-125"
                >
                    Solicitar nuevo link
                </Link>
            </div>
        );
    }

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="text-sm text-gray-400 mb-1 block">
                    Nueva contraseña
                </label>
                <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                        }))
                    }
                    required
                    className={inputClass}
                />
            </div>
            <div>
                <label className="text-sm text-gray-400 mb-1 block">
                    Confirmar contraseña
                </label>
                <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            confirm: e.target.value,
                        }))
                    }
                    required
                    className={inputClass}
                />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
            >
                {loading ? "Guardando..." : "Restablecer contraseña"}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <h1 className="text-2xl font-bold text-white mb-2">
                    Nueva contraseña
                </h1>
                <p className="text-sm text-gray-400 mb-8">
                    Ingresá tu nueva contraseña.
                </p>
                <Suspense
                    fallback={
                        <p className="text-gray-400 text-sm">Cargando...</p>
                    }
                >
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </main>
    );
}
