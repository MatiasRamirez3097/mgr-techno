import Link from "next/link";
import { Product } from "@/types/product";
import { ProductCard } from "@/components/productCard/ProductCard";

interface Props {
    title: string;
    products: Product[];
    href: string;
    linkLabel?: string;
}

export function ProductRow({
    title,
    products,
    href,
    linkLabel = "Ver todos",
}: Props) {
    if (products.length === 0) return null;

    return (
        <section>
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <Link
                    href={href}
                    className="text-sm text-brand hover:brightness-125 transition-all"
                >
                    {linkLabel} →
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}
