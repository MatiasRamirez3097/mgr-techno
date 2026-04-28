import { ProductDB } from "@/types/backend/product";
import { ProductDTO } from "@/types/shared/product";

export function mapProductToDTO(product: ProductDB): ProductDTO {
    return {
        id: product._id.toString(),
        categories: product.categories
            ? product.categories.map((id) => id.toString())
            : [],
        image: product.image || "",
        images: product.images || [],
        name: product.name,
        salePrice: product.salePrice || null,
        regularPrice: product.regularPrice || 0,
        shortDescription: product.shortDescription || "",
        slug: product.slug,
        sku: product.sku || "",
        hasSerialNumber: product.hasSerialNumber,
        status:
            product.status === "publish" ||
            product.status === "draft" ||
            product.status === "private"
                ? product.status
                : "draft",
        taxRate: product.taxRate || 10.5,
        weight: product.weight || 0,
        dimensions: {
            height: product.dimensions?.height || 0,
            length: product.dimensions?.length || 0,
            width: product.dimensions?.width || 0,
        },
        availableStock: product.availableStock,
    };
}
