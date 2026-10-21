import { ProductModel } from "@/models/Product";
import type { ClientSession } from "mongoose";

export const CUSTOM_PC_SYSTEM_SLUG = "pc-armada-sistema";
export const CUSTOM_PC_SYSTEM_SKU = "SYS-PC-ARMADA";

export async function ensureCustomPcProduct(session?: ClientSession) {
    const existing = await ProductModel.findOne({
        $or: [
            { slug: CUSTOM_PC_SYSTEM_SLUG },
            { sku: CUSTOM_PC_SYSTEM_SKU },
        ],
    }).session(session || null);

    if (existing) {
        return existing;
    }

    const [created] = await ProductModel.create(
        [
            {
                name: "PC Armada",
                slug: CUSTOM_PC_SYSTEM_SLUG,
                sku: CUSTOM_PC_SYSTEM_SKU,
                type: "simple",
                status: "private",
                description:
                    "Producto contenedor de sistema para facturación y armado de PCs personalizadas.",
                shortDescription: "PC Armada a medida",
                regularPrice: 0,
                salePrice: 0,
                effectivePrice: 0,
                taxRate: 10.5,
                manageStock: false,
                hasSerialNumber: false,
                totalStock: 0,
                availableStock: 0,
                reservedStock: 0,
                isAvailable: false,
                shippingSize: "bulky",
                weight: 8,
                dimensions: {
                    length: 45,
                    width: 25,
                    height: 45,
                },
            },
        ],
        { session },
    );

    return created;
}
