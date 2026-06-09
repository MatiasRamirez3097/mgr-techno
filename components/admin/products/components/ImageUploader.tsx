"use client";

import { useRef, useState } from "react";

import Image from "next/image";

interface Props {
    image: string;

    images: string[];

    onChange: (data: { image: string; images: string[] }) => void;
}

export const ImageUploader = ({ image, images, onChange }: Props) => {
    const [uploading, setUploading] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    // =========================
    // UPLOAD
    // =========================

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        setUploading(true);

        try {
            const uploaded: string[] = [];

            for (const file of Array.from(files)) {
                const formData = new FormData();

                formData.append("file", file);

                const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (data.url) {
                    uploaded.push(data.url);
                }
            }

            let nextImage = image;

            let nextImages = [...images];

            if (!nextImage && uploaded.length > 0) {
                nextImage = uploaded[0];

                nextImages = [...nextImages, ...uploaded.slice(1)];
            } else {
                nextImages = [...nextImages, ...uploaded];
            }
            onChange({
                image: nextImage,
                images: nextImages,
            });
        } finally {
            setUploading(false);
        }
    };

    // =========================
    // REMOVE MAIN IMAGE
    // =========================

    const removeImage = () => {
        const nextMain = images[0] || "";

        onChange({
            image: nextMain,
            images: images.slice(1),
        });
    };

    // =========================
    // REMOVE GALLERY IMAGE
    // =========================

    const removeGalleryImage = (index: number) => {
        onChange({
            image,
            images: images.filter((_, i) => i !== index),
        });
    };

    // =========================
    // SET MAIN IMAGE
    // =========================

    const handleSetMain = (index: number) => {
        const selected = images[index];

        onChange({
            image: selected,

            images: [image, ...images.filter((_, i) => i !== index)].filter(
                Boolean,
            ),
        });
    };

    return (
        <div className="flex flex-col gap-3">
            {/* ========================= */}
            {/* MAIN IMAGE */}
            {/* ========================= */}

            {image && (
                <div>
                    <p className="text-xs text-gray-400 mb-2">
                        Imagen principal
                    </p>

                    <div
                        className="
                            relative
                            aspect-square
                            rounded-xl
                            overflow-hidden
                            bg-gray-800
                            w-full
                        "
                    >
                        <Image
                            src={image}
                            alt="Imagen principal"
                            fill
                            sizes="300px"
                            className="object-cover"
                        />

                        <button
                            type="button"
                            onClick={removeImage}
                            className="
                                absolute
                                top-2
                                right-2
                                w-6
                                h-6
                                rounded-full
                                bg-red-500
                                text-white
                                text-xs
                                flex
                                items-center
                                justify-center
                                hover:bg-red-600
                                transition-colors
                            "
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ========================= */}
            {/* GALLERY */}
            {/* ========================= */}

            {images.length > 0 && (
                <div>
                    <p className="text-xs text-gray-400 mb-2">Galería</p>

                    <div className="grid grid-cols-3 gap-2">
                        {images.map((img, i) => (
                            <div
                                key={img}
                                className="
                                    relative
                                    aspect-square
                                    rounded-lg
                                    overflow-hidden
                                    bg-gray-800
                                    group
                                "
                            >
                                <Image
                                    src={img}
                                    alt={`Imagen ${i + 1}`}
                                    fill
                                    sizes="100px"
                                    className="object-cover"
                                />

                                <div
                                    className="
                                        absolute
                                        inset-0
                                        bg-black/50
                                        opacity-0
                                        group-hover:opacity-100
                                        transition-opacity
                                        flex
                                        items-center
                                        justify-center
                                        gap-1
                                    "
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSetMain(i)}
                                        className="
                                            w-7
                                            h-7
                                            rounded-full
                                            bg-brand
                                            text-white
                                            text-xs
                                            flex
                                            items-center
                                            justify-center
                                            hover:brightness-110
                                        "
                                        title="Establecer como principal"
                                    >
                                        ★
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => removeGalleryImage(i)}
                                        className="
                                            w-7
                                            h-7
                                            rounded-full
                                            bg-red-500
                                            text-white
                                            text-xs
                                            flex
                                            items-center
                                            justify-center
                                            hover:bg-red-600
                                        "
                                        title="Eliminar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================= */}
            {/* UPLOAD BUTTON */}
            {/* ========================= */}

            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="
                    w-full
                    py-3
                    rounded-xl
                    border-2
                    border-dashed
                    border-gray-700
                    hover:border-brand
                    text-sm
                    text-gray-400
                    hover:text-white
                    disabled:opacity-50
                    transition-all
                "
            >
                {uploading
                    ? "Subiendo..."
                    : images.length === 0
                      ? "Subir imágenes"
                      : "+ Agregar más imágenes"}
            </button>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
            />

            {images.length > 0 && (
                <p className="text-xs text-gray-500">
                    Hover en una imagen para establecerla como principal o
                    eliminarla.
                </p>
            )}
        </div>
    );
};
