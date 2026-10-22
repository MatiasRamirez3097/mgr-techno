import { connectDB } from "@/lib/mongodb";
import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";
import { ProductModel } from "@/models";
import { smartTitleCase, cleanMetaDescription } from "@/lib/utils/seoUtils";

function escapeXml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Feed RSS (formato Google, namespace g:) de productos publicados y disponibles.
 * Lo comparten los comparadores de precios (HardGamers, BuscaHard, BestGaming).
 */
export async function buildProductFeedResponse(description: string) {
    await connectDB();
    const products = await ProductModel.find({
        status: "publish",
        isAvailable: true,
    }).populate("brand");

    const items = products
        .map((product) => {
            const title = smartTitleCase(product.name);
            const desc = cleanMetaDescription(
                product.shortDescription || product.description,
                title,
            );
            const imageUrl = getOptimizedImageUrl(product.image, 800);
            const brandName = product.brand?.name || "MGR Techno";
            const inStock = Boolean(
                product.availableStock && product.availableStock > 0,
            );

            return `
<item>
    <g:id>${product._id}</g:id>
    <g:gtin>${escapeXml(product.gtin)}</g:gtin>
    <title><![CDATA[${title}]]></title>
    <description><![CDATA[${desc}]]></description>
    <link>https://mgrtechno.com.ar/productos/${escapeXml(product.slug)}</link>
    <g:image_link>${escapeXml(imageUrl)}</g:image_link>
    <g:condition>${product.isOutlet ? "refurbished" : "new"}</g:condition>
    <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
    <g:price>${Number(product.regularPrice || 0).toFixed(2)} ARS</g:price>
    ${
        product.salePrice && product.salePrice < product.regularPrice
            ? `<g:sale_price>${Number(product.salePrice).toFixed(2)} ARS</g:sale_price>`
            : ""
    }
    <g:brand><![CDATA[${brandName}]]></g:brand>
    ${product.sku ? `<g:mpn>${escapeXml(product.sku)}</g:mpn>` : ""}
</item>`;
        })
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>MGR Techno</title>
<link>https://mgrtechno.com.ar</link>
<description>${escapeXml(description)}</description>
${items}
</channel>
</rss>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
        },
    });
}
