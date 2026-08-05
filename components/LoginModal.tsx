"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type LoginMode = "magic" | "password";

export function LoginModal({ isOpen, onClose }: Props) {
    const router = useRouter();
    const [mode, setMode] = useState<LoginMode>("magic");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            if (mode === "password") {
                // LOGIN TRADICIONAL
                const res = await signIn("credentials", {
                    username: email,
                    password,
                    redirect: false,
                });

                if (res?.error) {
                    setMessage({
                        text: "Credenciales inválidas.",
                        type: "error",
                    });
                } else {
                    setMessage({ text: "¡Ingreso exitoso!", type: "success" });
                    router.refresh(); // Actualiza la sesión en la página actual
                    onClose();
                }
            } else {
                // MAGIC LINK
                const res = await fetch("/api/auth/magic-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });

                if (res.ok) {
                    setMessage({
                        text: "¡Te enviamos un link de acceso a tu correo! Revisá tu bandeja de entrada.",
                        type: "success",
                    });
                    // Opcional: limpiar el input
                    // setEmail("");
                } else {
                    setMessage({
                        text: "Hubo un error al solicitar el link.",
                        type: "error",
                    });
                }
            }
        } catch (error) {
            setMessage({ text: "Ocurrió un error inesperado.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
                {/* Botón Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>

                <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-white mb-6">
                        Iniciar sesión
                    </h2>

                    {/* Selector de modo (Pestañas) */}
                    <div className="flex bg-gray-800 rounded-lg p-1 mb-6 border border-gray-700">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("magic");
                                setMessage({ text: "", type: "" });
                            }}
                            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                                mode === "magic"
                                    ? "bg-gray-700 text-white shadow"
                                    : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                            Link al correo
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode("password");
                                setMessage({ text: "", type: "" });
                            }}
                            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                                mode === "password"
                                    ? "bg-gray-700 text-white shadow"
                                    : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                            Contraseña
                        </button>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4"
                    >
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="tu@email.com"
                                className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                            />
                        </div>

                        {mode === "password" && (
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                        )}

                        {message.text && (
                            <div
                                className={`p-3 rounded-lg text-sm ${
                                    message.type === "success"
                                        ? "bg-green-900/30 text-green-400 border border-green-900/50"
                                        : "bg-red-900/30 text-red-400 border border-red-900/50"
                                }`}
                            >
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : mode === "magic" ? (
                                "Enviar link de acceso"
                            ) : (
                                "Ingresar"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
