import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types/category";

const CATEGORY_ICONS: Record<string, string> = {
    "componentes-de-pc": "🖥️",
    perifericos: "🖱️",
    refrigeracion: "❄️",
    monitores: "🖥️",
    conectividad: "🌐",
    outlet: "🏷️",
    smartphones: "📱",
    combos: "📦",
};

export function CategoryGrid({ categories }: { categories: Category[] }) {
    return (
        <section>
            <h2 className="text-xl font-bold text-white mb-5">Categorías</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {categories.map((cat) => (
                    <Link
                        key={cat._id}
                        href={`/products?category=${cat.slug}`}
                        className="group flex flex-col items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-brand rounded-2xl p-4 transition-all"
                    >
                        {/* Imagen o ícono */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
                            {cat.image ? (
                                <Image
                                    src={cat.image}
                                    alt={cat.name}
                                    fill
                                    sizes="56px"
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                                />
                            ) : (
                                <span className="text-2xl">
                                    {CATEGORY_ICONS[cat.slug] || "📦"}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-center text-gray-300 group-hover:text-white transition-colors font-medium leading-tight">
                            {cat.name}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
