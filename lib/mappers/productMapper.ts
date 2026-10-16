import { ProductDB } from "@/types/backend/product";
import { ProductDTO } from "@/types/shared/product";

export function mapProductToDTO(product: ProductDB): ProductDTO {
    return {
        id: product._id.toString(),
        categories: product.categories
            ? product.categories.map((id) => id.toString())
            : [],
        image:
            product.image ||
            "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780913722/noimage_gamsgz.png",
        images: product.images || [],
        name: product.name,
        salePrice: product.salePrice || null,
        regularPrice: product.regularPrice || 0,
        effectivePrice: product.effectivePrice,
        description: product.description || "",
        shortDescription: product.shortDescription || "",
        slug: product.slug,
        sku: product.sku || "",
        mpn: product.mpn || "",
        gtin: product.gtin || "",
        hasSerialNumber: product.hasSerialNumber,
        status:
            product.status === "publish" ||
            product.status === "draft" ||
            product.status === "private" ||
            product.status === "pending_review"
                ? product.status
                : "draft",
        taxRate: product.taxRate || null,
        weight: product.weight || 0,
        dimensions: {
            height: product.dimensions?.height || 0,
            length: product.dimensions?.length || 0,
            width: product.dimensions?.width || 0,
        },
        availableStock: product.availableStock,
        reservedStock: product.reservedStock,
        totalStock: product.totalStock,
        brand: product.brand ? product.brand.toString() : "",
        featured: product.featured,
        isAvailable: Boolean(product.isAvailable),
        isOutlet: product.isOutlet,
        hasFreeShipping: product.hasFreeShipping,
        shippingSize: product.shippingSize,
        manageStock: product.manageStock ?? true,
        type: product.type || "simple",
        bundleItemsCount:
            product.bundleItemsCount ||
            (product.bundleItems ? product.bundleItems.length : 0),
        bundleItems: product.bundleItems
            ? product.bundleItems.map((b: any) => {
                  const isPopulated =
                      b.productId &&
                      typeof b.productId === "object" &&
                      "_id" in b.productId;
                  return {
                      productId: isPopulated
                          ? b.productId._id.toString()
                          : b.productId.toString(),
                      quantity: b.quantity,
                      name: isPopulated ? b.productId.name : undefined,
                      sku: isPopulated ? b.productId.sku : undefined,
                      image: isPopulated ? b.productId.image : undefined,
                      regularPrice: isPopulated
                          ? b.productId.regularPrice
                          : undefined,
                      availableStock: isPopulated
                          ? b.productId.availableStock
                          : undefined,
                  };
              })
            : [],
        attributes: Array.isArray((product as any).attributes)
            ? (product as any).attributes.map((attr: any) => ({
                  key: attr.key,
                  label: attr.label,
                  value: attr.value,
                  unit: attr.unit || "",
              }))
            : [],
    };
}
