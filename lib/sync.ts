import { connectDB } from "./mongodb";
import { ProductModel } from "@/models/Product";

export function mapWooToMongo(p: any) {
    const price = parseFloat(p.price || "0");
    return {
        wooId: p.id,
        name: p.name,
        slug: p.slug,
        price,
        listPrice: parseFloat(p.price_list || "0") || Math.round(price * 1.1),
        regularPrice: parseFloat(p.regular_price || "0"),
        regularListPrice:
            parseFloat(p.regular_price_list || "0") ||
            Math.round(parseFloat(p.regular_price || "0") * 1.1),
        priceNoTax:
            parseFloat(p.price_excl_tax || "0") || Math.round(price / 1.21),
        onSale: p.on_sale,
        salePrice: parseFloat(p.sale_price || "0"),
        image: p.images?.[0]?.src || "",
        images: p.images?.map((img: any) => img.src) || [],
        stock: p.stock_quantity,
        stockStatus: p.stock_status,
        shortDescription: p.short_description || "",
        description: p.description || "",
        weight: parseFloat(p.weight || "0"),
        dimensions: {
            length: parseFloat(p.dimensions?.length || "0"),
            width: parseFloat(p.dimensions?.width || "0"),
            height: parseFloat(p.dimensions?.height || "0"),
        },
        categories:
            p.categories?.map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
            })) || [],
        featured: p.featured,
        status: p.status,
        sku: p.sku || "",
        syncedAt: new Date(),
    };
}

export async function syncProduct(wooProduct: any) {
    await connectDB();
    const data = mapWooToMongo(wooProduct);

    await ProductModel.findOneAndUpdate({ wooId: wooProduct.id }, data, {
        upsert: true,
        new: true,
    });
}

export async function deleteProduct(wooId: number) {
    await connectDB();
    await ProductModel.findOneAndDelete({ wooId });
}
