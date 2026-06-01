"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

export function WhatsAppFloatingButton() {
    const phone = "5493417223739"; // 👈 tu número
    const message = encodeURIComponent(
        "¡Hola! Quería hacer una consulta sobre un producto.",
    );
    // =========================
    // HIDE IN ADMIN
    // =========================
    const pathname = usePathname();
    if (pathname.startsWith("/admin")) {
        return null;
    }
    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-end gap-3">
            {/* Tooltip */}
            <div className="hidden sm:flex bg-zinc-900/95 border border-zinc-800 text-white text-sm px-4 py-2 rounded-xl shadow-2xl backdrop-blur">
                ¿Necesitás ayuda?
            </div>

            {/* Botón */}
            <Link
                href={`https://wa.me/${phone}?text=${message}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="
                    group
                    relative
                    flex
                    items-center
                    justify-center
                    w-16
                    h-16
                    rounded-full
                    bg-green-500
                    shadow-[0_0_30px_rgba(34,197,94,0.45)]
                    transition-all
                    duration-300
                    hover:scale-110
                    hover:bg-green-400
                    active:scale-95
                "
            >
                {/* Glow */}
                <div className="absolute inset-0 rounded-full bg-green-500 blur-xl opacity-40 group-hover:opacity-70 transition-opacity" />

                {/* Icono WhatsApp */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    fill="currentColor"
                    className="relative z-10 w-8 h-8 text-white"
                >
                    <path d="M19.11 17.2c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.5.7.3 1.25.47 1.67.6.7.22 1.35.2 1.85.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
                    <path d="M16.02 3C8.84 3 3 8.82 3 15.98c0 2.53.74 5 2.13 7.12L3 29l6.1-2.08a13 13 0 0 0 6.92 1.98H16c7.18 0 13.02-5.82 13.02-12.98C29.02 8.82 23.18 3 16.02 3zm0 23.6h-.01a10.6 10.6 0 0 1-5.4-1.48l-.38-.22-3.62 1.23 1.18-3.53-.25-.36a10.58 10.58 0 0 1-1.67-5.74c0-5.84 4.76-10.6 10.62-10.6 2.83 0 5.48 1.1 7.48 3.1a10.5 10.5 0 0 1 3.1 7.47c0 5.84-4.76 10.6-10.62 10.6z" />
                </svg>
            </Link>
        </div>
    );
}
