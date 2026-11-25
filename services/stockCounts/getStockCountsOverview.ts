import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { StockCountModel } from "@/models/StockCount";
import { mapStockCountToDTO, type StockCountDoc } from "@/lib/mappers/stockCountMapper";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { getStockCountSettings } from "@/services/settings/getStockCountSettings";
import type { StockCountDTO, StockCountOverview } from "@/types/shared/stockCount";
import { getStockCountQueue } from "./getStockCountQueue";

const HISTORY_LIMIT = 50;

async function withProducts(docs: StockCountDoc[]): Promise<StockCountDTO[]> {
    const ids = [...new Set(docs.map((d) => d.productId.toString()))];
    const products = await ProductModel.find({ _id: { $in: ids } }, { sku: 1, image: 1 }).lean<
        { _id: Types.ObjectId; sku?: string; image?: string }[]
    >();
    const byId = new Map(products.map((p) => [p._id.toString(), p]));
    return docs.map((d) => mapStockCountToDTO(d, byId.get(d.productId.toString())));
}

/** Pantalla del conteo rotativo: lista de hoy, diferencias sin resolver e historial. */
export async function getStockCountsOverview({
    now = new Date(),
    extra = 0,
}: { now?: Date; extra?: number } = {}): Promise<StockCountOverview> {
    await connectDB();
    const settings = await getStockCountSettings();
    const [{ queue, countedToday }, differences, history] = await Promise.all([
        getStockCountQueue(settings, { now, extra }),
        StockCountModel.find({ status: "difference" }).sort({ createdAt: -1 }).lean<StockCountDoc[]>(),
        StockCountModel.find({ status: { $ne: "superseded" } })
            .sort({ createdAt: -1 })
            .limit(HISTORY_LIMIT)
            .lean<StockCountDoc[]>(),
    ]);

    return {
        settings,
        today: todayInStoreTimeZone(now),
        countedToday,
        queue,
        differences: await withProducts(differences),
        history: await withProducts(history),
    };
}
