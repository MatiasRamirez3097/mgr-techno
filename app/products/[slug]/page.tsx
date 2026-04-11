import { getProductBySlug } from "@/lib/products";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params;
    console.log(">>> params:", params); // 👈 temporal

    const product = await getProductBySlug(slug);

    if (!product) notFound();

    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Imagen */}
                <ProductGallery images={product.images} name={product.name} />

                {/* Info */}
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold title-color">
                        {product.name}
                    </h1>

                    {/* Precio */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold price-color">
                            ${product.price.toLocaleString("es-AR")}
                        </span>
                        {product.onSale && (
                            <span className="text-lg text-gray-400 line-through">
                                ${product.regularPrice.toLocaleString("es-AR")}
                            </span>
                        )}
                    </div>

                    {/* Descripción (viene como HTML de Woo) */}
                    <div
                        className="text-sm text-gray-600 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: product.shortDescription,
                        }}
                    />

                    {/* Stock */}
                    {product.stock === 0 ? (
                        <p className="text-sm text-red-500 font-medium stock-color">
                            Sin stock
                        </p>
                    ) : (
                        <p className="text-sm text-red-300 font-medium stock-color">
                            {product.stock} unidades disponibles
                        </p>
                    )}

                    {/* Botón carrito — componente cliente */}
                    <AddToCartButton product={product} />
                </div>
            </div>
        </main>
    );
}
