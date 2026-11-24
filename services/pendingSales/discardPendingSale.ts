import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { mapPendingSaleToDTO } from "@/lib/mappers/pendingSaleMapper";
import { PendingSaleModel } from "@/models/PendingSale";
import type { PendingSaleDoc } from "@/types/backend/pendingSale";
import { updateProductStock } from "@/services/products/updateProductStock";

/** Descarta una venta pendiente (escaneo por error) y libera el stock reservado. */
export async function discardPendingSale(id: string, resolvedBy: string) {
    if (!mongoose.isValidObjectId(id)) throw new BusinessError("ID inválido", 400);

    await connectDB();
    const session = await mongoose.startSession();

    try {
        let updated: PendingSaleDoc | null = null;
        await session.withTransaction(async () => {
            // El filtro por status evita liberar dos veces si se descarta en paralelo
            updated = await PendingSaleModel.findOneAndUpdate(
                { _id: id, status: "pending" },
                { $set: { status: "discarded", resolvedBy, resolvedAt: new Date() } },
                { new: true, session },
            ).lean<PendingSaleDoc>();

            if (!updated) {
                throw new BusinessError("La venta no existe o ya fue resuelta", 409);
            }

            await updateProductStock(
                updated.productId.toString(),
                updated.quantity,
                -updated.quantity,
                session,
            );
        });

        return mapPendingSaleToDTO(updated!);
    } finally {
        await session.endSession();
    }
}
