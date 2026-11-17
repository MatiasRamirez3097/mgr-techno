import { connectDB } from "@/lib/mongodb";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";

/**
 * Recalcula el costo con IVA (`finalPrice`) de todo el catálogo de PCMODD según la configuración:
 * precio + IVA de la columna C, o el precio tal cual. Mismo cálculo que pcmoddFinalPrice. No toca el
 * historial de cambios: no es un cambio de precio del distribuidor.
 */
export async function recalculatePcmoddPrices(applyIva: boolean): Promise<number> {
    await connectDB();
    const finalPrice = applyIva
        ? { $round: [{ $multiply: ["$price", { $add: [1, { $divide: ["$ivaPercent", 100] }] }] }, 2] }
        : "$price";
    const result = await PcmoddCatalogItemModel.updateMany({}, [{ $set: { finalPrice } }], { updatePipeline: true });
    return result.modifiedCount;
}
