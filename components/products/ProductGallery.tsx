"use client";

import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";
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

    if (images.length === 0) {
        return (
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 flex flex-col items-center justify-center p-6 text-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-16 h-16 text-gray-700 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                </svg>
                <span className="text-sm font-semibold text-gray-500">MGR TECHNO</span>
                <span className="text-xs text-gray-600 mt-1">Sin imagen disponible</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Imagen principal */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                <Image
                    src={getOptimizedImageUrl(images[selected])}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
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
                                src={getOptimizedImageUrl(src, 300)}
                                alt={`${name} ${i + 1}`}
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
