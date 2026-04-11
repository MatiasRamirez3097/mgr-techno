"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
    const { data: session, status } = useSession();

    if (status === "loading") return null;

    if (!session) {
        return (
            <Link
                href="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors"
            >
                Ingresar
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">
                {session.user?.name?.split(" ")[0]}
            </span>
            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
                Salir
            </button>
        </div>
    );
}
