"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface Slide {
    image: string;
    title: string;
    subtitle: string;
    cta: string;
    href: string;
}

const SLIDES: Slide[] = [
    {
        image: "/banners/banner1.jpg",
        title: "Componentes de PC",
        subtitle: "Las mejores marcas al mejor precio",
        cta: "Ver productos",
        href: "/products?category=componentes-de-pc",
    },
    {
        image: "/banners/banner2.jpg",
        title: "Ofertas imperdibles",
        subtitle: "Descuentos en periféricos y más",
        cta: "Ver ofertas",
        href: "/products?category=ofertas",
    },
    {
        image: "/banners/banner3.jpg",
        title: "Refrigeración",
        subtitle: "Mantené tu equipo al límite",
        cta: "Explorar",
        href: "/products?category=refrigeracion",
    },
];

export function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, []);

    const prev = () => {
        setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    };

    useEffect(() => {
        if (paused) return;
        const interval = setInterval(next, 5000);
        return () => clearInterval(interval);
    }, [paused, next]);

    const slide = SLIDES[current];

    return (
        <div
            className="relative w-full aspect-[21/9] min-h-[280px] max-h-[520px] overflow-hidden rounded-2xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Imagen */}
            {SLIDES.map((s, i) => (
                <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
                >
                    <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover"
                        priority={i === 0}
                    />
                </div>
            ))}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

            {/* Contenido */}
            <div className="absolute inset-0 flex items-center px-8 sm:px-14">
                <div className="max-w-lg">
                    <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 drop-shadow">
                        {slide.title}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-200 mb-6 drop-shadow">
                        {slide.subtitle}
                    </p>
                    <Link
                        href={slide.href}
                        className="inline-block px-6 py-3 rounded-xl bg-brand text-white font-medium hover:brightness-110 transition-all"
                    >
                        {slide.cta}
                    </Link>
                </div>
            </div>

            {/* Flechas */}
            <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
                ‹
            </button>
            <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
                ›
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === current ? "w-6 bg-brand" : "w-1.5 bg-white/50"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
