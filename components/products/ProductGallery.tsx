"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
    images,
    name,
}: {
    images: string[];
    name: string;
}) {
    const [selected, setSelected] = useState(0);

    if (images.length === 0) return null;

    return (
        <div className="flex flex-col gap-3">
            {/* Imagen principal */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                <Image
                    src={images[selected]}
                    alt={name}
                    fill
                    className="object-cover transition-opacity duration-200"
                />
            </div>

            {/* Miniaturas — solo si hay más de una */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                        <button
                            key={i}
                            onClick={() => setSelected(i)}
                            className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                selected === i
                                    ? "border-brand"
                                    : "border-transparent hover:border-gray-600"
                            }`}
                        >
                            <Image
                                src={src}
                                alt={`${name} ${i + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
