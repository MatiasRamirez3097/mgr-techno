"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { HeroSlideContent } from "@/components/home/HeroSlideContent";
import type { HeroSlideDTO } from "@/types/shared/heroSlide";

interface Props {
    slides: HeroSlideDTO[];
}

export function HeroCarousel({ slides }: Props) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const total = slides.length;

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % total);
    }, [total]);

    const prev = () => {
        setCurrent((prev) => (prev - 1 + total) % total);
    };

    useEffect(() => {
        if (paused || total < 2) return;
        const interval = setInterval(next, 5000);
        return () => clearInterval(interval);
    }, [paused, next, total]);

    if (total === 0) return null;

    return (
        <div
            className="relative w-full aspect-[21/9] min-h-[280px] max-h-[520px] overflow-hidden rounded-2xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Slides: toda la imagen (y su texto) es el vínculo. Las ocultas no reciben clicks. */}
            {slides.map((s, i) => {
                const visible = i === current;
                const className = `group absolute inset-0 block transition-opacity duration-700 ${
                    visible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`;
                const content = (
                    <HeroSlideContent
                        image={s.image}
                        title={s.title}
                        subtitle={s.subtitle}
                        ctaLabel={s.ctaLabel}
                        priority={i === 0}
                    />
                );

                if (!s.href) {
                    return (
                        <div key={s.id} className={className} aria-hidden={!visible}>
                            {content}
                        </div>
                    );
                }

                return (
                    <Link
                        key={s.id}
                        href={s.href}
                        className={className}
                        aria-hidden={!visible}
                        tabIndex={visible ? 0 : -1}
                        aria-label={s.title || s.ctaLabel || undefined}
                        {...(s.openInNewTab
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                    >
                        {content}
                    </Link>
                );
            })}

            {total > 1 && (
                <>
                    {/* Flechas */}
                    <button
                        type="button"
                        onClick={prev}
                        aria-label="Anterior"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        aria-label="Siguiente"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    >
                        ›
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {slides.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setCurrent(i)}
                                aria-label={`Ir al banner ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === current ? "w-6 bg-brand" : "w-1.5 bg-white/50"
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
