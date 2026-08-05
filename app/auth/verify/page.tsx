"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyMagicLink() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [status, setStatus] = useState("Verificando tu inicio de sesión...");

    useEffect(() => {
        if (!token) {
            setStatus("Link inválido o no encontrado.");
            return;
        }

        // Disparamos el login pasándole únicamente el token mágico
        signIn("credentials", {
            magicToken: token,
            redirect: false, // Manejamos la redirección manualmente
        }).then((res) => {
            if (res?.error) {
                setStatus(
                    "El link expiró o es inválido. Por favor, solicitá uno nuevo.",
                );
            } else {
                setStatus("¡Sesión iniciada correctamente! Redirigiendo...");
                // Lo mandamos al inicio o al checkout según prefieras
                router.push("/");
                router.refresh(); // Refrescamos para actualizar el estado global de la sesión
            }
        });
    }, [token, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center max-w-md w-full">
                <h1 className="text-xl font-bold mb-4">Ingresando</h1>
                <p className="text-gray-400">{status}</p>
                {/* Acá podés poner un spinner de carga */}
            </div>
        </div>
    );
}
