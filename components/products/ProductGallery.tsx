"use client";

import {
    getOptimizedImageUrl,
    hasOwnProductImage,
} from "@/lib/utils/imageUtils";
import type { BundleItemDTO } from "@/types/shared/product";
import Image from "next/image";
import { useState, useMemo } from "react";
import { BundleImageCollage } from "./BundleImageCollage";

type GallerySlide =
    | {
          type: "collage";
      }
    | {
          type: "image";
          src: string;
          caption?: string;
          quantity?: number;
      };

export function ProductGallery({
    images,
    name,
    bundleItems = [],
    hasOwnMainImage = true,
}: {
    images: string[];
    name: string;
    bundleItems?: BundleItemDTO[];
    hasOwnMainImage?: boolean;
}) {
    const [selected, setSelected] = useState(0);

    const slides = useMemo<GallerySlide[]>(() => {
        const result: GallerySlide[] = [];
        const seenUrls = new Set<string>();

        const validBundleItems = bundleItems.filter((bi) =>
            hasOwnProductImage(bi.image),
        );

        // Si es un combo sin imagen principal propia y tiene al menos 2 componentes con imagen,
        // agregamos primero la vista compuesta (collage) de todos los productos del combo
        if (!hasOwnMainImage && validBundleItems.length >= 2) {
            result.push({ type: "collage" });
        }

        // Imágenes propias del producto/combo
        for (const rawUrl of images) {
            if (!hasOwnProductImage(rawUrl)) continue;
            if (seenUrls.has(rawUrl)) continue;
            seenUrls.add(rawUrl);
            result.push({
                type: "image",
                src: rawUrl,
            });
        }

        // Imágenes principales de cada producto que compone el combo
        for (const bi of validBundleItems) {
            const imgUrl = bi.image!;
            if (seenUrls.has(imgUrl)) continue;
            seenUrls.add(imgUrl);
            result.push({
                type: "image",
                src: imgUrl,
                caption: bi.name,
                quantity: bi.quantity,
            });
        }

        return result;
    }, [images, bundleItems, hasOwnMainImage]);

    if (slides.length === 0) {
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
                <span className="text-sm font-semibold text-gray-500">
                    MGR TECHNO
                </span>
                <span className="text-xs text-gray-600 mt-1">
                    Sin imagen disponible
                </span>
            </div>
        );
    }

    const activeSlide = slides[selected] || slides[0];

    return (
        <div className="flex flex-col gap-3">
            {/* Imagen principal */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-800">
                {activeSlide.type === "collage" ? (
                    <BundleImageCollage
                        bundleItems={bundleItems}
                        alt={name}
                        priority
                        imageWidth={800}
                    />
                ) : (
                    <>
                        <Image
                            src={getOptimizedImageUrl(activeSlide.src)}
                            alt={activeSlide.caption || name}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover transition-opacity duration-200"
                        />
                        {activeSlide.caption && (
                            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 backdrop-blur-md shadow-lg">
                                <span className="text-xs text-gray-200 font-medium truncate">
                                    <span className="text-brand font-bold mr-1.5">
                                        {activeSlide.quantity &&
                                        activeSlide.quantity > 1
                                            ? `${activeSlide.quantity}x`
                                            : "Incluye:"}
                                    </span>
                                    {activeSlide.caption}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Miniaturas — solo si hay más de una */}
            {slides.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {slides.map((slide, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setSelected(i)}
                            title={
                                slide.type === "collage"
                                    ? "Vista completa del combo"
                                    : slide.caption || `${name} ${i + 1}`
                            }
                            className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                selected === i
                                    ? "border-brand"
                                    : "border-transparent hover:border-gray-600"
                            }`}
                        >
                            {slide.type === "collage" ? (
                                <BundleImageCollage
                                    bundleItems={bundleItems}
                                    alt={name}
                                    compact
                                    imageWidth={200}
                                />
                            ) : (
                                <Image
                                    src={getOptimizedImageUrl(slide.src, 300)}
                                    alt={slide.caption || `${name} ${i + 1}`}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
