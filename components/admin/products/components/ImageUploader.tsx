"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useCloudinaryUpload } from "@/components/admin/cloudinary/useCloudinaryUpload";

interface Props {
    image: string;
    images: string[];
    onChange: (data: { image: string; images: string[] }) => void;
}

export const ImageUploader = ({ image, images, onChange }: Props) => {
    const [uploadingLocal, setUploadingLocal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [manualUrl, setManualUrl] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Integración de Cloudinary Upload Widget y Media Library
    const { openUploadWidget, openMediaLibrary, isLoading: cldLoading, error: cldError } =
        useCloudinaryUpload({
            folder: "mgrtechno/products",
            onUploadSuccess: (newUrl) => {
                addImageToState(newUrl);
            },
            onBatchUploadSuccess: (newUrls) => {
                addBatchImagesToState(newUrls);
            },
        });

    const addImageToState = useCallback(
        (newUrl: string) => {
            if (!newUrl) return;
            if (!image) {
                onChange({ image: newUrl, images });
            } else {
                if (!images.includes(newUrl)) {
                    onChange({ image, images: [...images, newUrl] });
                }
            }
        },
        [image, images, onChange],
    );

    const addBatchImagesToState = useCallback(
        (newUrls: string[]) => {
            if (!newUrls || newUrls.length === 0) return;
            let nextMain = image;
            let nextGallery = [...images];

            newUrls.forEach((url) => {
                if (!nextMain) {
                    nextMain = url;
                } else if (!nextGallery.includes(url) && url !== nextMain) {
                    nextGallery.push(url);
                }
            });

            onChange({ image: nextMain, images: nextGallery });
        },
        [image, images, onChange],
    );

    // Soporte para subir archivos locales clásicos (fallback / drop directo)
    const handleLocalFiles = async (files: FileList | File[] | null) => {
        if (!files || files.length === 0) return;
        setUploadingLocal(true);

        try {
            const uploadedUrls: string[] = [];

            for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) continue;
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (data.url) {
                    uploadedUrls.push(data.url);
                }
            }

            addBatchImagesToState(uploadedUrls);
        } catch (err) {
            console.error("Error al subir archivo:", err);
        } finally {
            setUploadingLocal(false);
        }
    };

    // Pegar imagen desde el portapapeles (Ctrl + V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Solo capturar si el foco está cerca o no está en un input de texto
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                handleLocalFiles(imageFiles);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [handleLocalFiles]);

    // Drag and Drop en el contenedor
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleLocalFiles(e.dataTransfer.files);
        }
    };

    // Reordenar galería
    const moveImage = (index: number, direction: "left" | "right") => {
        const newImages = [...images];
        const targetIndex = direction === "left" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newImages.length) return;

        const temp = newImages[index];
        newImages[index] = newImages[targetIndex];
        newImages[targetIndex] = temp;

        onChange({ image, images: newImages });
    };

    // Establecer como principal
    const handleSetMain = (index: number) => {
        const selected = images[index];
        const restOfImages = images.filter((_, i) => i !== index);
        const nextImages = image ? [image, ...restOfImages] : restOfImages;

        onChange({
            image: selected,
            images: nextImages,
        });
    };

    // Quitar imagen principal
    const removeMainImage = () => {
        const nextMain = images[0] || "";
        onChange({
            image: nextMain,
            images: images.slice(1),
        });
    };

    // Quitar imagen de galería
    const removeGalleryImage = (index: number) => {
        onChange({
            image,
            images: images.filter((_, i) => i !== index),
        });
    };

    // Agregar imagen por URL manual
    const handleAddManualUrl = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = manualUrl.trim();
        if (trimmed) {
            addImageToState(trimmed);
            setManualUrl("");
            setShowUrlInput(false);
        }
    };

    const isUploading = uploadingLocal || cldLoading;

    return (
        <div ref={containerRef} className="flex flex-col gap-3">
            {/* IMAGEN PRINCIPAL */}
            {image && (
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-brand flex items-center gap-1">
                            ★ Portada principal
                        </span>
                        <span className="text-[11px] text-gray-500">
                            Visible en tarjetas y búsquedas
                        </span>
                    </div>

                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800/80 border border-gray-700 w-full group">
                        <Image
                            src={image}
                            alt="Imagen principal del producto"
                            fill
                            sizes="350px"
                            className="object-contain p-2"
                        />

                        {/* Botones sobre imagen principal */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPreviewUrl(image)}
                                className="px-3 py-1.5 rounded-lg bg-gray-900/90 text-white text-xs font-medium hover:bg-gray-800 transition flex items-center gap-1"
                                title="Ver en pantalla completa"
                            >
                                🔍 Ampliar
                            </button>
                            <button
                                type="button"
                                onClick={removeMainImage}
                                className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium hover:bg-red-500 transition flex items-center gap-1"
                                title="Eliminar foto principal"
                            >
                                ✕ Quitar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GALERÍA SECUNDARIA */}
            {images.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-400">
                            Galería ({images.length} {images.length === 1 ? "foto" : "fotos"})
                        </span>
                        <span className="text-[11px] text-gray-500">
                            Usa las flechas para reordenar
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {images.map((img, i) => (
                            <div
                                key={`${img}-${i}`}
                                className="relative aspect-square rounded-lg overflow-hidden bg-gray-800/60 border border-gray-700/60 group"
                            >
                                <Image
                                    src={img}
                                    alt={`Foto de galería ${i + 1}`}
                                    fill
                                    sizes="120px"
                                    className="object-contain p-1"
                                />

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => moveImage(i, "left")}
                                            disabled={i === 0}
                                            className="w-5 h-5 rounded bg-gray-900/80 text-white text-[10px] disabled:opacity-30 hover:bg-brand flex items-center justify-center transition"
                                            title="Mover a la izquierda"
                                        >
                                            ◀
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveImage(i, "right")}
                                            disabled={i === images.length - 1}
                                            className="w-5 h-5 rounded bg-gray-900/80 text-white text-[10px] disabled:opacity-30 hover:bg-brand flex items-center justify-center transition"
                                            title="Mover a la derecha"
                                        >
                                            ▶
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleSetMain(i)}
                                            className="px-1.5 py-0.5 rounded bg-brand text-white text-[10px] font-semibold hover:brightness-110 flex items-center gap-0.5"
                                            title="Hacer foto principal"
                                        >
                                            ★ Portada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewUrl(img)}
                                            className="w-5 h-5 rounded bg-gray-900/80 text-white text-[10px] hover:bg-gray-700 flex items-center justify-center"
                                            title="Ver ampliada"
                                        >
                                            🔍
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(i)}
                                            className="w-5 h-5 rounded bg-red-600/90 text-white text-[10px] hover:bg-red-500 flex items-center justify-center"
                                            title="Eliminar de la galería"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ZONA DE CARGA INTERACTIVA / DROPZONE */}
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center ${
                    dragActive
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-gray-700 bg-gray-900/50 hover:border-gray-600 text-gray-400"
                }`}
            >
                {/* BOTÓN PRINCIPAL CLOUDINARY WIDGET */}
                <button
                    type="button"
                    onClick={() => openUploadWidget({ cropping: true, multiple: true, aspectRatio: 1 })}
                    disabled={isUploading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <span>☁️</span>
                    <span>
                        {isUploading
                            ? "Subiendo..."
                            : image
                              ? "+ Subir / Recortar fotos (Cloudinary)"
                              : "Subir imagen con Cloudinary"}
                    </span>
                </button>

                {/* ACCIONES SECUNDARIAS */}
                <div className="flex items-center gap-2 w-full pt-1">
                    <button
                        type="button"
                        onClick={() => openMediaLibrary({ multiple: true })}
                        disabled={isUploading}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium border border-gray-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        title="Seleccionar imágenes ya existentes en tu cuenta de Cloudinary"
                    >
                        <span>🗂️</span>
                        <span>Biblioteca existente</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium border border-gray-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        title="Subida rápida desde tu PC"
                    >
                        <span>💻</span>
                        <span>PC directa</span>
                    </button>
                </div>

                {/* BOTÓN EXPANDIR URL MANUAL */}
                <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors mt-1 underline"
                >
                    {showUrlInput ? "Ocultar ingreso por URL" : "o pegar link de imagen web"}
                </button>

                {showUrlInput && (
                    <form onSubmit={handleAddManualUrl} className="flex gap-1.5 w-full mt-1">
                        <input
                            type="url"
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            className="flex-1 bg-gray-950 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-brand"
                        />
                        <button
                            type="submit"
                            disabled={!manualUrl.trim()}
                            className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:brightness-110 disabled:opacity-50"
                        >
                            Agregar
                        </button>
                    </form>
                )}

                {/* AYUDA VISUAL */}
                <p className="text-[11px] text-gray-500 mt-1">
                    Tip: Podes arrastrar archivos aquí o pegar capturas con{" "}
                    <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-300 font-mono">
                        Ctrl+V
                    </kbd>
                </p>

                {cldError && (
                    <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 w-full text-center">
                        {cldError}
                    </p>
                )}
            </div>

            {/* INPUT FILE OCULTO PARA SUBIDA LOCAL */}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleLocalFiles(e.target.files)}
            />

            {/* LIGHTBOX / MODAL DE PREVISUALIZACIÓN */}
            {previewUrl && (
                <div
                    onClick={() => setPreviewUrl(null)}
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-3xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl"
                    >
                        <div className="flex items-center justify-between w-full border-b border-gray-800 pb-2">
                            <span className="text-sm font-semibold text-white">
                                Vista previa de la imagen
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewUrl(null)}
                                className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative w-[70vw] max-w-xl aspect-square rounded-xl overflow-hidden bg-black/40">
                            <Image
                                src={previewUrl}
                                alt="Vista ampliada"
                                fill
                                sizes="800px"
                                className="object-contain"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand hover:underline font-medium"
                            >
                                Abrir original en pestaña nueva ↗
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
