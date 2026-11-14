import Image from "next/image";

interface Props {
    image: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    priority?: boolean;
}

// Imagen + texto de un banner del hero. Lo usa el carrusel de la home y la vista previa del admin.
export function HeroSlideContent({ image, title, subtitle, ctaLabel, priority }: Props) {
    const hasText = Boolean(title || subtitle || ctaLabel);

    return (
        <>
            {image && (
                <Image
                    src={image}
                    alt={title || "Banner MGR Techno"}
                    fill
                    sizes="(max-width: 1152px) 100vw, 1152px"
                    className="object-cover"
                    priority={priority}
                />
            )}

            {hasText && (
                <>
                    {/* Overlay para que el texto se lea sobre cualquier imagen */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

                    <div className="absolute inset-0 flex items-center px-8 sm:px-14">
                        <div className="max-w-lg">
                            {title && (
                                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 drop-shadow">
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
                                <p className="text-sm sm:text-base text-gray-200 mb-6 drop-shadow">
                                    {subtitle}
                                </p>
                            )}
                            {ctaLabel && (
                                <span className="inline-block px-6 py-3 rounded-xl bg-brand text-white font-medium group-hover:brightness-110 transition-all">
                                    {ctaLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
