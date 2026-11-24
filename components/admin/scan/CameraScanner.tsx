"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// BarcodeDetector todavía no está en los tipos de TypeScript
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = {
    new (options?: { formats?: string[] }): BarcodeDetectorInstance;
    getSupportedFormats?: () => Promise<string[]>;
};

// Los que traen las cajas: EAN/UPC (GTIN) y Code 128/39 (números de parte)
const WANTED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];
const SCAN_INTERVAL_MS = 200;

function getDetectorCtor(): BarcodeDetectorCtor | null {
    if (typeof window === "undefined") return null;
    return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

// Soporte del navegador: no cambia durante la sesión, así que no hace falta suscribirse
const noopSubscribe = () => () => {};
function getSupportError(): string | null {
    if (!getDetectorCtor()) {
        return "Este navegador no puede leer códigos de barras. Usá Chrome en Android o cargá el código a mano.";
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        return "No se puede acceder a la cámara (hace falta abrir la página con https).";
    }
    return null;
}

interface Props {
    // Se deja de escanear mientras está en false (por ejemplo, mientras se confirma un producto)
    active: boolean;
    onDetected: (code: string) => void;
}

/**
 * Cámara trasera + lector de códigos nativo del navegador (Chrome en Android). Si no está
 * disponible, muestra un aviso y queda la carga manual del código.
 */
export function CameraScanner({ active, onDetected }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onDetectedRef = useRef(onDetected);
    const supportError = useSyncExternalStore(noopSubscribe, getSupportError, () => null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        onDetectedRef.current = onDetected;
    }, [onDetected]);

    useEffect(() => {
        const Ctor = getDetectorCtor();
        if (!active || supportError || !Ctor) return;

        let cancelled = false;
        let stream: MediaStream | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const start = async () => {
            try {
                const supported = (await Ctor.getSupportedFormats?.()) ?? WANTED_FORMATS;
                const formats = WANTED_FORMATS.filter((f) => supported.includes(f));
                const detector = new Ctor(formats.length ? { formats } : undefined);

                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
                if (cancelled) return;

                const video = videoRef.current;
                if (!video) return;
                video.srcObject = stream;
                await video.play();
                setError(null);
                setReady(true);

                const tick = async () => {
                    if (cancelled) return;
                    try {
                        if (video.readyState >= 2) {
                            const [first] = await detector.detect(video);
                            const code = first?.rawValue?.trim();
                            if (code && !cancelled) {
                                navigator.vibrate?.(80);
                                onDetectedRef.current(code);
                                return; // el padre pone active=false; al reactivar se reinicia
                            }
                        }
                    } catch {
                        // Un frame que falla no corta el escaneo
                    }
                    timer = setTimeout(tick, SCAN_INTERVAL_MS);
                };
                tick();
            } catch (err) {
                if (cancelled) return;
                const denied = err instanceof DOMException && err.name === "NotAllowedError";
                setError(
                    denied
                        ? "No hay permiso para usar la cámara. Habilitalo en los ajustes del navegador."
                        : "No se pudo abrir la cámara.",
                );
            }
        };

        start();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            stream?.getTracks().forEach((t) => t.stop());
            setReady(false);
        };
    }, [active, supportError]);

    const message = supportError ?? error;
    if (message) {
        return (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                {message}
            </div>
        );
    }

    return (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-800 bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            {/* Guía de encuadre */}
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-brand/80" />
            {(!ready || !active) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-gray-300">
                    {active ? "Abriendo cámara…" : "Cámara en pausa"}
                </div>
            )}
        </div>
    );
}
