import { ProductDTO } from "@/types/shared/product";
import { smartTitleCase, cleanMetaDescription } from "@/lib/utils/seoUtils";
import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";

interface Props {
    product: ProductDTO;
    categoryName?: string;
    categorySlug?: string;
}

export function ProductSchema({ product, categoryName, categorySlug }: Props) {
    const formattedTitle = smartTitleCase(product.name);
    const cleanDesc = cleanMetaDescription(
        product.shortDescription || product.description,
        `Comprá ${formattedTitle} al mejor precio en MGR Techno con garantía y envíos a todo el país.`,
    );

    // Calcular imágenes válidas con URLs completas
    const rawImages = [product.image, ...(product.images || [])].filter(Boolean) as string[];
    const validImages = rawImages.map((img) => getOptimizedImageUrl(img, 1000));

    // Determinar precio efectivo real
    const actualPrice = product.effectivePrice ?? product.salePrice ?? product.regularPrice;

    // Determinar stock exacto (evitando el bug de 0 falso)
    const isInStock = Boolean(
        product.isAvailable !== false &&
        (typeof product.availableStock === "number" ? product.availableStock > 0 : true),
    );

    // Determinar marca real
    const brandName = typeof product.brand === "object" && product.brand !== null
        ? (product.brand as any).name || "MGR Techno"
        : (typeof product.brand === "string" && product.brand.trim() ? product.brand : "MGR Techno");

    const productUrl = `https://mgrtechno.com.ar/productos/${product.slug}`;

    const schema: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: formattedTitle,
        description: cleanDesc,
        image: validImages.length > 0 ? validImages : undefined,
        sku: product.sku || product.id,
        mpn: product.sku || product.id,
        gtin: product.gtin || undefined,
        category: categoryName || undefined,
        brand: {
            "@type": "Brand",
            name: brandName,
        },
        offers: {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "ARS",
            price: actualPrice,
            priceValidUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            itemCondition: product.isOutlet
                ? "https://schema.org/RefurbishedCondition"
                : "https://schema.org/NewCondition",
            availability: isInStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: {
                "@type": "Organization",
                name: "MGR Techno",
                url: "https://mgrtechno.com.ar",
            },
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
