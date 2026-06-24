"use client";

import { useState } from "react";

interface Props {
    url: string;
    fileName: string;
}

export function DownloadPdfButton({ url, fileName }: Props) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault(); // Evitamos que abra en una nueva pestaña directamente
        setIsDownloading(true);

        try {
            // 1. Descargamos el archivo a la memoria local del navegador (bypassea la regla de dominios)
            const response = await fetch(url);

            if (!response.ok) throw new Error("Error al descargar");

            const blob = await response.blob();

            // 2. Creamos una URL local temporal
            const blobUrl = window.URL.createObjectURL(blob);

            // 3. Forzamos la descarga con nuestro propio nombre
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName; // ¡Acá está la magia del nombre!

            document.body.appendChild(link);
            link.click();

            // 4. Limpiamos la memoria
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error forzando la descarga del PDF:", error);
            // Fallback: Si falla por algún motivo de red, lo abrimos en una nueva pestaña normal
            window.open(url, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="
                mt-4
                inline-flex items-center gap-2
                text-sm
                text-cyan-400
                hover:text-cyan-300
                disabled:opacity-50
                transition-colors
            "
        >
            {isDownloading ? (
                <>
                    <svg
                        className="animate-spin h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    Descargando...
                </>
            ) : (
                "Descargar PDF"
            )}
        </button>
    );
}
