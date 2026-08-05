"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

export function ClientSignInTrigger({ token }: { token: string }) {
    const hasAttempted = useRef(false);

    useEffect(() => {
        // El useRef evita que el useEffect se dispare dos veces en modo estricto de React
        if (hasAttempted.current) return;
        hasAttempted.current = true;

        signIn("credentials", {
            magicToken: token,
            callbackUrl: "/", // Redirige automáticamente a la raíz (o "/checkout") tras el éxito
        });
    }, [token]);

    // No renderiza absolutamente nada, la interfaz ya la hizo el servidor.
    return null;
}
