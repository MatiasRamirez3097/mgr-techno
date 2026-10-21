"use client";

import { useState, useCallback } from "react";
import {
    loadCloudinaryUploadWidget,
    loadCloudinaryMediaLibrary,
} from "@/lib/cloudinary/loadCloudinaryScript";

export interface CloudinaryAssetInfo {
    secure_url: string;
    public_id: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
    original_filename?: string;
    thumbnail_url?: string;
}

interface UseCloudinaryUploadProps {
    folder?: string;
    onUploadSuccess?: (url: string, info: CloudinaryAssetInfo) => void;
    onBatchUploadSuccess?: (urls: string[]) => void;
}

export function useCloudinaryUpload({
    folder = "mgrtechno/products",
    onUploadSuccess,
    onBatchUploadSuccess,
}: UseCloudinaryUploadProps = {}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openUploadWidget = useCallback(
        async (customOptions: { cropping?: boolean; multiple?: boolean; aspectRatio?: number } = {}) => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Obtener cloudName y apiKey del backend
                const configRes = await fetch("/api/admin/cloudinary/sign", {
                    method: "GET",
                });
                if (!configRes.ok) {
                    throw new Error("No se pudo obtener la configuración de Cloudinary");
                }
                const { cloudName, apiKey } = await configRes.json();

                if (!cloudName || !apiKey) {
                    throw new Error("Faltan credenciales públicas de Cloudinary en el servidor");
                }

                // 2. Cargar script si aún no está cargado
                const cld = await loadCloudinaryUploadWidget();

                // 3. Crear y abrir widget firmado
                const batchUrls: string[] = [];

                const widget = cld.createUploadWidget(
                    {
                        cloudName,
                        apiKey,
                        uploadSignature: async (
                            callback: (sig: string) => void,
                            paramsToSign: Record<string, any>,
                        ) => {
                            try {
                                const signRes = await fetch("/api/admin/cloudinary/sign", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ paramsToSign }),
                                });
                                const signData = await signRes.json();
                                if (signData.signature) {
                                    callback(signData.signature);
                                } else {
                                    throw new Error(signData.error || "Fallo al firmar");
                                }
                            } catch (err: any) {
                                setError(err.message || "Error al autenticar subida");
                            }
                        },
                        folder,
                        sources: ["local", "url", "camera", "unsplash"],
                        multiple: customOptions.multiple ?? true,
                        cropping: customOptions.cropping ?? true,
                        croppingAspectRatio: customOptions.aspectRatio ?? 1,
                        croppingShowDimensions: true,
                        showSkipCropButton: true,
                        maxFileSize: 25000000, // 25MB
                        clientAllowedFormats: ["png", "jpeg", "jpg", "webp", "avif"],
                        theme: "minimal",
                        styles: {
                            palette: {
                                window: "#0f172a",
                                windowBorder: "#334155",
                                tabIcon: "#38bdf8",
                                menuIcons: "#94a3b8",
                                textDark: "#000000",
                                textLight: "#ffffff",
                                link: "#38bdf8",
                                action: "#0284c7",
                                inactiveTabIcon: "#64748b",
                                error: "#f43f5e",
                                inProgress: "#38bdf8",
                                complete: "#10b981",
                                sourceBg: "#1e293b",
                            },
                            frame: {
                                background: "rgba(15, 23, 42, 0.75)",
                            },
                        },
                        language: "es",
                        text: {
                            es: {
                                or: "O",
                                back: "Volver",
                                advanced: "Avanzado",
                                close: "Cerrar",
                                no_results: "Sin resultados",
                                search_placeholder: "Buscar imágenes...",
                                menu: {
                                    files: "Mi Equipo (PC)",
                                    web: "URL Web",
                                    camera: "Cámara",
                                    unsplash: "Unsplash",
                                },
                                local: {
                                    browse: "Examinar archivos",
                                    dd_title_single: "Arrastrá tu imagen aquí",
                                    dd_title_multi: "Arrastrá tus imágenes aquí",
                                    drop_title_single: "Soltá la imagen",
                                    drop_title_multi: "Soltá las imágenes",
                                },
                                crop: {
                                    title: "Recortar imagen (1:1 recomendado)",
                                    crop_btn: "Recortar y usar",
                                    skip_btn: "Usar original (sin recortar)",
                                    reset_btn: "Reiniciar",
                                    close_btn: "Cerrar",
                                },
                            },
                        },
                    },
                    (widgetErr: any, result: any) => {
                        if (widgetErr) {
                            setError(widgetErr.message || "Error en el widget de Cloudinary");
                            return;
                        }

                        if (result?.event === "success") {
                            const url = result.info.secure_url;
                            batchUrls.push(url);
                            onUploadSuccess?.(url, result.info);
                        }

                        if (result?.event === "close") {
                            if (batchUrls.length > 0) {
                                onBatchUploadSuccess?.(batchUrls);
                            }
                            setIsLoading(false);
                        }
                    },
                );

                widget.open();
            } catch (err: any) {
                setError(err.message || "Error al abrir Cloudinary");
                setIsLoading(false);
            }
        },
        [folder, onUploadSuccess, onBatchUploadSuccess],
    );

    const openMediaLibrary = useCallback(
        async (customOptions: { multiple?: boolean } = {}) => {
            setIsLoading(true);
            setError(null);

            try {
                // Solicitar timestamp firmado para la Media Library
                const timestamp = Math.floor(Date.now() / 1000);
                const signRes = await fetch("/api/admin/cloudinary/sign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paramsToSign: { timestamp } }),
                });

                if (!signRes.ok) {
                    throw new Error("No se pudo autenticar la Biblioteca de Cloudinary");
                }
                const { signature, apiKey, cloudName } = await signRes.json();

                const cld = await loadCloudinaryMediaLibrary();

                cld.openMediaLibrary(
                    {
                        cloud_name: cloudName,
                        api_key: apiKey,
                        timestamp,
                        signature,
                        multiple: customOptions.multiple ?? true,
                        remove_header: false,
                        max_files: 20,
                        insert_caption: "Insertar seleccionadas",
                        default_transformations: [
                            [{ quality: "auto", fetch_format: "auto" }],
                        ],
                    },
                    {
                        insertHandler: (data: any) => {
                            const selectedAssets = data?.assets || [];
                            const urls = selectedAssets.map(
                                (asset: any) => asset.secure_url || asset.url,
                            );
                            if (urls.length > 0) {
                                onBatchUploadSuccess?.(urls);
                            }
                        },
                    },
                );
            } catch (err: any) {
                setError(err.message || "Error al abrir la Biblioteca de Medios");
            } finally {
                setIsLoading(false);
            }
        },
        [onBatchUploadSuccess],
    );

    return {
        openUploadWidget,
        openMediaLibrary,
        isLoading,
        error,
    };
}
