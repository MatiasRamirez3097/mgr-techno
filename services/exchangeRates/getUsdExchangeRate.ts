import { connectDB } from "@/lib/mongodb";
import { ExchangeRateModel } from "@/models/ExchangeRate";

const RATE_ID = "USD_OFICIAL";
const SOURCE_URL = "https://dolarapi.com/v1/dolares/oficial";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

export interface UsdExchangeRate {
    rate: number;
    updatedAt: Date;
}

interface StoredRate {
    sell: number;
    sourceUpdatedAt: Date | null;
    fetchedAt: Date;
}

/**
 * Cotización del dólar oficial BNA (venta). Se guarda en DB y se refresca
 * si tiene más de una hora; si la fuente falla se usa la última guardada.
 */
export async function getUsdExchangeRate(
    { forceRefresh = false }: { forceRefresh?: boolean } = {},
): Promise<UsdExchangeRate | null> {
    await connectDB();

    const stored = await ExchangeRateModel.findById(RATE_ID).lean<StoredRate>();
    const isFresh =
        stored && Date.now() - new Date(stored.fetchedAt).getTime() < MAX_AGE_MS;

    if (stored && isFresh && !forceRefresh) {
        return {
            rate: stored.sell,
            updatedAt: stored.sourceUpdatedAt || stored.fetchedAt,
        };
    }

    try {
        const response = await fetch(SOURCE_URL, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const sell = Number(data.venta);
        const buy = Number(data.compra);
        if (!sell || sell <= 0) {
            throw new Error("Respuesta sin cotización de venta");
        }

        const sourceUpdatedAt = data.fechaActualizacion
            ? new Date(data.fechaActualizacion)
            : null;

        await ExchangeRateModel.updateOne(
            { _id: RATE_ID },
            {
                $set: {
                    buy: buy || sell,
                    sell,
                    source: "dolarapi.com (oficial BNA)",
                    sourceUpdatedAt,
                    fetchedAt: new Date(),
                },
            },
            { upsert: true },
        );

        return { rate: sell, updatedAt: sourceUpdatedAt || new Date() };
    } catch (error) {
        console.error("Error obteniendo la cotización del dólar:", error);
        if (stored) {
            return {
                rate: stored.sell,
                updatedAt: stored.sourceUpdatedAt || stored.fetchedAt,
            };
        }
        return null;
    }
}
