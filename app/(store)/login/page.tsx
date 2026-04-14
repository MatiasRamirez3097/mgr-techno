"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resetSuccess = searchParams.get("reset") === "success";
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const form = e.currentTarget;
        const username = (
            form.elements.namedItem("username") as HTMLInputElement
        ).value;
        const password = (
            form.elements.namedItem("password") as HTMLInputElement
        ).value;

        const res = await signIn("credentials", {
            username,
            password,
            redirect: false,
        });
        setLoading(false);

        if (res?.error) {
            setError("Email o contraseña incorrectos");
            return;
        }

        router.push("/");
        router.refresh();
    };

    return (
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <h1 className="text-2xl font-bold text-white mb-2">
                Iniciar sesión
            </h1>
            <p className="text-sm text-gray-400 mb-8">
                Usá tu cuenta de MGR Techno
            </p>

            {resetSuccess && (
                <div className="bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3 mb-4">
                    <p className="text-sm text-green-400">
                        Contraseña actualizada correctamente. Podés iniciar
                        sesión.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                        Email
                    </label>
                    <input
                        name="username"
                        type="email"
                        required
                        className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
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
                        required
                        className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                        placeholder="••••••••"
                    />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                >
                    {loading ? "Ingresando..." : "Ingresar"}
                </button>

                <Link
                    href="/forgot-password"
                    className="text-sm text-center text-gray-400 hover:text-white transition-colors"
                >
                    ¿Olvidaste tu contraseña?
                </Link>

                <p className="text-sm text-center text-gray-400">
                    ¿No tenés cuenta?{" "}
                    <Link
                        href="/register"
                        className="text-brand hover:brightness-125 transition-all"
                    >
                        Registrate
                    </Link>
                </p>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-4">
            <Suspense fallback={null}>
                <LoginForm />
            </Suspense>
        </main>
    );
}
