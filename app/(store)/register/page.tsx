"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
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
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email,
                    password: form.password,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Login automático después del registro
            await signIn("credentials", {
                username: form.email,
                password: form.password,
                redirect: false,
            });

            router.push("/account/orders");
            router.refresh();
        } catch (e: any) {
            setError(e.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <h1 className="text-2xl font-bold text-white mb-2">
                    Crear cuenta
                </h1>
                <p className="text-sm text-gray-400 mb-8">
                    Completá tus datos para registrarte
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Nombre
                            </label>
                            <input
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Apellido
                            </label>
                            <input
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                required
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className={inputClass}
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Contraseña
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className={inputClass}
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                            Confirmar contraseña
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

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                        {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </button>

                    <p className="text-sm text-center text-gray-400">
                        ¿Ya tenés cuenta?{" "}
                        <Link
                            href="/login"
                            className="text-brand hover:brightness-125 transition-all"
                        >
                            Iniciá sesión
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
