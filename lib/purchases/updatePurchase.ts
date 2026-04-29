import { PurchaseModel } from "@/models/Purchase";

export async function updatePurchase(id: string, data: any) {
    const purchase = await PurchaseModel.findById(id);

    if (!purchase) {
        throw new Error("Compra no encontrada");
    }

    // 🔒 Regla de negocio CLAVE
    if (purchase.status === "received") {
        throw new Error("No se puede editar una compra ya recepcionada");
    }

    // opcional: validar con Zod acá también

    const updated = await PurchaseModel.findByIdAndUpdate(id, data, {
        new: true,
    });

    return updated;
}
