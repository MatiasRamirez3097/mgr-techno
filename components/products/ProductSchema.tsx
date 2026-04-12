import { Product } from "@/types/product";

export function ProductSchema({ product }: { product: Product }) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description:
            product.shortDescription?.replace(/<[^>]*>/g, "") || product.name,
        image: product.images.length > 0 ? product.images : [product.image],
        sku: product.id,
        offers: {
            "@type": "Offer",
            url: `https://www.mgrtechno.com.ar/products/${product.slug}`,
            priceCurrency: "ARS",
            price: product.price,
            priceValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            availability:
                product.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
            seller: {
                "@type": "Organization",
                name: "MGR Techno",
            },
        },
        brand: {
            "@type": "Brand",
            name: "MGR Techno",
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
