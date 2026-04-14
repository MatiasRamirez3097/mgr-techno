"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setSent(true);
        } catch {
            setError("Error al enviar el email");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <main className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
                    <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Email enviado
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Si existe una cuenta con ese email, vas a recibir un
                        link para restablecer tu contraseña.
                    </p>
                    <Link
                        href="/login"
                        className="text-sm text-brand hover:brightness-125 transition-all"
                    >
                        Volver al login
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <h1 className="text-2xl font-bold text-white mb-2">
                    Olvidé mi contraseña
                </h1>
                <p className="text-sm text-gray-400 mb-8">
                    Ingresá tu email y te mandamos un link para restablecer tu
                    contraseña.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                            placeholder="tu@email.com"
                        />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                        {loading ? "Enviando..." : "Enviar link"}
                    </button>

                    <Link
                        href="/login"
                        className="text-sm text-center text-gray-400 hover:text-white transition-colors"
                    >
                        Volver al login
                    </Link>
                </form>
            </div>
        </main>
    );
}
