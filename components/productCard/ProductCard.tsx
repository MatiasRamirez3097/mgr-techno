// components/ProductCard.tsx
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";

export function ProductCard({ product }: { product: Product }) {
    return (
        <Link href={`/products/${product.slug}`}>
            <div className="group relative rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-50">
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.onSale && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                            Oferta
                        </span>
                    )}
                </div>

                <div className="p-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                        {product.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">
                            ${product.price.toLocaleString("es-AR")}
                        </span>
                        {product.onSale && (
                            <span className="text-sm text-gray-400 line-through">
                                ${product.regularPrice.toLocaleString("es-AR")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
