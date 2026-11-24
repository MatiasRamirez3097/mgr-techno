import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { mapPendingSaleToDTO } from "@/lib/mappers/pendingSaleMapper";
import { normalizeScanCode } from "@/lib/scan/productCode";
import { createPendingSaleSchema } from "@/lib/validators/pendingSaleSchema";
import { ProductModel } from "@/models";
import { PendingSaleModel } from "@/models/PendingSale";
import type { PendingSaleDoc } from "@/types/backend/pendingSale";
import { updateProductStock } from "@/services/products/updateProductStock";

/**
 * Registra una venta escaneada pendiente de formalizar y reserva su stock
 * (available−, reserved+), igual que al crear un pedido.
 */
export async function createPendingSale(data: unknown, createdBy: string) {
    const parsed = createPendingSaleSchema.safeParse(data);
    if (!parsed.success) {
        throw new BusinessError("Datos inválidos para registrar la venta", 400);
    }
    const { productId, quantity, scannedCode, notes } = parsed.data;

    await connectDB();
    const session = await mongoose.startSession();

    try {
        let created: PendingSaleDoc | undefined;
        await session.withTransaction(async () => {
            const product = await ProductModel.findById(productId)
                .select("name type")
                .session(session)
                .lean<{ name: string; type?: string }>();

            if (!product) throw new BusinessError("Producto no encontrado", 404);
            // Los combos reservan según sus componentes actuales; si cambian antes de
            // formalizar, la liberación no coincidiría. Se cargan como pedido normal.
            if (product.type === "bundle") {
                throw new BusinessError(
                    "Los combos no se pueden registrar por escaneo; cargalos como pedido",
                    400,
                );
            }

            await updateProductStock(productId, -quantity, quantity, session);

            const [doc] = await PendingSaleModel.create(
                [
                    {
                        productId,
                        productName: product.name,
                        quantity,
                        scannedCode: normalizeScanCode(scannedCode),
                        notes,
                        createdBy,
                    },
                ],
                { session },
            );
            created = doc.toObject() as PendingSaleDoc;
        });

        return mapPendingSaleToDTO(created!);
    } finally {
        await session.endSession();
    }
}
