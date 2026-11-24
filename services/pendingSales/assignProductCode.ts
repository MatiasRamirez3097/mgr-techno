import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { gtinCandidates, isGtinLike, normalizeScanCode } from "@/lib/scan/productCode";
import { assignProductCodeSchema } from "@/lib/validators/pendingSaleSchema";
import { ProductModel } from "@/models";
import { PRODUCT_CODE_COLLATION } from "@/models/Product";

/**
 * Guarda en un producto el código escaneado que no se encontró, para que la próxima vez se
 * reconozca. Reemplaza el valor anterior del campo y rechaza códigos que ya usa otro producto.
 */
export async function assignProductCode(data: unknown) {
    const parsed = assignProductCodeSchema.safeParse(data);
    if (!parsed.success) throw new BusinessError("Datos inválidos", 400);

    const { productId, field } = parsed.data;
    const code = normalizeScanCode(parsed.data.code);
    if (!code) throw new BusinessError("Código vacío", 400);
    if (field === "gtin" && !isGtinLike(code)) {
        throw new BusinessError("Un GTIN debe tener 8, 12, 13 o 14 dígitos", 400);
    }

    await connectDB();

    const conflict = await ProductModel.findOne({
        _id: { $ne: productId },
        ...(field === "gtin" ? { gtin: { $in: gtinCandidates(code) } } : { [field]: code }),
    })
        .collation(PRODUCT_CODE_COLLATION)
        .select("name")
        .lean<{ name: string }>();

    if (conflict) {
        throw new BusinessError(`El código ya está cargado en "${conflict.name}"`, 409);
    }

    const updated = await ProductModel.findByIdAndUpdate(
        productId,
        { $set: { [field]: code } },
        { new: true },
    )
        .select("name gtin sku mpn")
        .lean<{ _id: unknown; name: string; gtin?: string; sku?: string; mpn?: string }>();

    if (!updated) throw new BusinessError("Producto no encontrado", 404);

    return {
        id: String(updated._id),
        name: updated.name,
        gtin: updated.gtin ?? "",
        sku: updated.sku ?? "",
        mpn: updated.mpn ?? "",
    };
}
