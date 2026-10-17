"use client";

import Image from "next/image";
import { getOptimizedImageUrl, hasOwnProductImage } from "@/lib/utils/imageUtils";
import type { BundleItemDTO } from "@/types/shared/product";

interface Props {
    bundleItems?: BundleItemDTO[];
    alt: string;
    compact?: boolean;
    priority?: boolean;
    imageWidth?: number;
}

export function BundleImageCollage({
    bundleItems = [],
    alt,
    compact = false,
    priority = false,
    imageWidth = 500,
}: Props) {
    const validItems = bundleItems.filter((item) =>
        hasOwnProductImage(item.image),
    );

    if (validItems.length === 0) {
        return null;
    }

    // Caso 1: Un único producto componente (ej: Pack 2x Memoria RAM idénticas)
    if (validItems.length === 1) {
        const single = validItems[0];
        return (
            <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                <Image
                    src={getOptimizedImageUrl(single.image!, imageWidth)}
                    alt={single.name || alt}
                    fill
                    sizes={compact ? "80px" : "(max-width: 640px) 50vw, 33vw"}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    priority={priority}
                />
                {!compact && single.quantity > 1 && (
                    <span className="absolute bottom-2 right-2 z-10 bg-gray-900/90 text-brand border border-brand/50 text-xs font-black px-2 py-0.5 rounded-md shadow-md">
                        x{single.quantity}
                    </span>
                )}
            </div>
        );
    }

    // Caso 2: Dos productos (mitad izquierda / mitad derecha)
    if (validItems.length === 2) {
        const [first, second] = validItems;
        return (
            <div className="relative w-full h-full grid grid-cols-2 gap-[2px] bg-gray-950 overflow-hidden">
                <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                    <Image
                        src={getOptimizedImageUrl(first.image!, imageWidth)}
                        alt={first.name || `${alt} 1`}
                        fill
                        sizes={compact ? "40px" : "25vw"}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        priority={priority}
                    />
                    {!compact && first.quantity > 1 && (
                        <span className="absolute bottom-1.5 left-1.5 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            x{first.quantity}
                        </span>
                    )}
                </div>

                <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                    <Image
                        src={getOptimizedImageUrl(second.image!, imageWidth)}
                        alt={second.name || `${alt} 2`}
                        fill
                        sizes={compact ? "40px" : "25vw"}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        priority={priority}
                    />
                    {!compact && second.quantity > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            x{second.quantity}
                        </span>
                    )}
                </div>

                {!compact && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <span className="w-7 h-7 rounded-full bg-gray-900/95 border border-brand/60 text-brand font-black text-sm flex items-center justify-center shadow-lg">
                            +
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Caso 3: Tres productos (1 arriba, 2 abajo)
    if (validItems.length === 3) {
        const [first, second, third] = validItems;
        return (
            <div className="relative w-full h-full grid grid-rows-2 gap-[2px] bg-gray-950 overflow-hidden">
                <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                    <Image
                        src={getOptimizedImageUrl(first.image!, imageWidth)}
                        alt={first.name || `${alt} 1`}
                        fill
                        sizes={compact ? "60px" : "33vw"}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        priority={priority}
                    />
                    {!compact && first.quantity > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            x{first.quantity}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-[2px] w-full h-full">
                    <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                        <Image
                            src={getOptimizedImageUrl(
                                second.image!,
                                imageWidth,
                            )}
                            alt={second.name || `${alt} 2`}
                            fill
                            sizes={compact ? "40px" : "20vw"}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {!compact && second.quantity > 1 && (
                            <span className="absolute bottom-1.5 left-1.5 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                x{second.quantity}
                            </span>
                        )}
                    </div>
                    <div className="relative w-full h-full bg-gray-800 overflow-hidden">
                        <Image
                            src={getOptimizedImageUrl(third.image!, imageWidth)}
                            alt={third.name || `${alt} 3`}
                            fill
                            sizes={compact ? "40px" : "20vw"}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {!compact && third.quantity > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                x{third.quantity}
                            </span>
                        )}
                    </div>
                </div>

                {!compact && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <span className="w-7 h-7 rounded-full bg-gray-900/95 border border-brand/60 text-brand font-black text-sm flex items-center justify-center shadow-lg">
                            +
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Caso 4+: Grilla 2x2 (con contador +N en el 4to cuadrante si hay más de 4)
    const firstFour = validItems.slice(0, 4);
    const extraCount = validItems.length - 4;

    return (
        <div className="relative w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px] bg-gray-950 overflow-hidden">
            {firstFour.map((item, idx) => {
                const isLastWithExtra = idx === 3 && extraCount > 0;
                return (
                    <div
                        key={item.productId || idx}
                        className="relative w-full h-full bg-gray-800 overflow-hidden"
                    >
                        <Image
                            src={getOptimizedImageUrl(item.image!, imageWidth)}
                            alt={item.name || `${alt} ${idx + 1}`}
                            fill
                            sizes={compact ? "40px" : "20vw"}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            priority={priority && idx === 0}
                        />
                        {!compact && item.quantity > 1 && !isLastWithExtra && (
                            <span className="absolute bottom-1 right-1 z-10 bg-gray-900/90 text-white border border-gray-700 text-[10px] font-bold px-1 py-0.5 rounded">
                                x{item.quantity}
                            </span>
                        )}
                        {isLastWithExtra && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                                <span className="text-white font-black text-sm">
                                    +{extraCount + 1}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}

            {!compact && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="w-7 h-7 rounded-full bg-gray-900/95 border border-brand/60 text-brand font-black text-sm flex items-center justify-center shadow-lg">
                        +
                    </span>
                </div>
            )}
        </div>
    );
}
