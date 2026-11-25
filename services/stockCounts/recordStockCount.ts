import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { ProductModel } from "@/models/Product";
import { StockCountModel } from "@/models/StockCount";
import { recordStockCountSchema } from "@/lib/validators/stockCountSchema";
import { mapStockCountToDTO, type StockCountDoc } from "@/lib/mappers/stockCountMapper";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import type { StockCountDTO } from "@/types/shared/stockCount";
import { getExpectedStock } from "./getExpectedStock";

interface ProductLean {
    name: string;
    sku?: string;
    image?: string;
    slug?: string;
    type?: string;
    hasSerialNumber?: boolean;
    manageStock?: boolean;
}

/**
 * Guarda un conteo físico y lo compara con lo que debería haber. Si había una diferencia sin
 * resolver del mismo producto, el conteo nuevo la reemplaza (es un reconteo).
 */
export async function recordStockCount(data: unknown, countedBy: string): Promise<StockCountDTO> {
    const parsed = recordStockCountSchema.safeParse(data);
    if (!parsed.success) {
        throw new BusinessError(parsed.error.issues[0]?.message || "Datos inválidos para el conteo", 400);
    }
    const { productId, counted, notes } = parsed.data;

    await connectDB();
    const product = await ProductModel.findById(productId, {
        name: 1,
        sku: 1,
        image: 1,
        slug: 1,
        type: 1,
        hasSerialNumber: 1,
        manageStock: 1,
    }).lean<ProductLean>();
    if (!product) throw new BusinessError("Producto no encontrado", 404);
    if (product.type === "bundle" || product.slug === CUSTOM_PC_SYSTEM_SLUG) {
        throw new BusinessError("Los combos no se cuentan: contá sus componentes", 400);
    }
    if (product.hasSerialNumber) {
        throw new BusinessError("Los productos con número de serie se controlan por serial, no por conteo", 400);
    }
    if (product.manageStock === false) throw new BusinessError("Este producto no maneja stock", 400);

    const expected = (await getExpectedStock([productId])).get(productId)!;
    const difference = counted - expected.expected;

    await StockCountModel.updateMany(
        { productId, status: "difference" },
        { $set: { status: "superseded", resolvedBy: countedBy, resolvedAt: new Date() } },
    );
    const doc = await StockCountModel.create({
        productId,
        productName: product.name,
        expected,
        counted,
        difference,
        status: difference === 0 ? "matched" : "difference",
        notes,
        countedBy,
    });

    return mapStockCountToDTO(doc.toObject() as StockCountDoc, product);
}
