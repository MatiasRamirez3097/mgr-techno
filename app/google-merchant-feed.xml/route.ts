import { ProductModel } from "@/models";

export async function GET() {
    const products = await ProductModel.find({
        status: {
            $in: ["publish", "pending_review"],
        },
    }).populate("brand");

    const items = products
        .map((product) => {
            const price = product.salePrice ?? product.regularPrice;

            return `
<item>
    <g:id>${product._id}</g:id>
    <g:gtin>${product.gtin ? product.gtin : ""}</g:gtin>
    <title><![CDATA[${product.name}]]></title>

    <description><![CDATA[${
        product.shortDescription || product.description || product.name
    }]]></description>

    <link>
        https://mgrtechno.com.ar/productos/${product.slug}
    </link>

    <g:image_link>
        ${product.image}
    </g:image_link>

    <g:condition>new</g:condition>

    <g:availability>
        ${product.availableStock > 0 ? "in_stock" : "out_of_stock"}
    </g:availability>

    <g:price>${price} ARS</g:price>

    ${
        product.salePrice
            ? `<g:sale_price>${product.salePrice} ARS</g:sale_price>`
            : ""
    }

    ${product.brand ? `<g:brand>${product.brand.name}</g:brand>` : ""}

    ${product.sku ? `<g:mpn>${product.sku}</g:mpn>` : ""}

</item>`;
        })
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
xmlns:g="http://base.google.com/ns/1.0">
<channel>

<title>MGR Techno</title>

<link>
https://mgrtechno.com.ar
</link>

<description>
Catálogo de productos
</description>

${items}

</channel>
</rss>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
}
