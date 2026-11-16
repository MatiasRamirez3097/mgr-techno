import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { buildInvidProductUrl, convertToArs } from "@/lib/distributors/invidMapper";
import { getAirStockLabel, type AirWarehouse } from "@/lib/distributors/airMapper";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";

/**
 * Ítem de los catálogos locales (Invid y AIR) con el costo ya en ARS con IVA. Se usa para
 * sugerir vínculos y para mostrar el costo vigente de los productos vinculados.
 */
export interface LocalCatalogItem {
    distributor: "invid" | "air";
    distributorProductId: string;
    distributorSku: string;
    partNumber: string;
    ean: string;
    name: string;
    link: string | null;
    image: string | null;
    price: number;
    stock: number;
    stockLabel?: string;
    available: boolean;
}

interface InvidLean {
    invidId: string;
    title: string;
    partNumber: string;
    ean: string;
    finalPrice: number;
    currency: string;
    stock: number | null;
    stockStatus: string;
    imageUrl: string | null;
    available: boolean;
}

interface AirLean {
    airId: string;
    title: string;
    partNumber: string;
    brand: string;
    finalPrice: number;
    currency: string;
    stock: number;
    stockByWarehouse?: Partial<Record<AirWarehouse, number>>;
    available: boolean;
}

const INVID_FIELDS = {
    invidId: 1, title: 1, partNumber: 1, ean: 1, finalPrice: 1, currency: 1,
    stock: 1, stockStatus: 1, imageUrl: 1, available: 1,
};
const AIR_FIELDS = {
    airId: 1, title: 1, partNumber: 1, brand: 1, finalPrice: 1, currency: 1,
    stock: 1, stockByWarehouse: 1, available: 1,
};

function fromInvid(item: InvidLean, usdRate: number): LocalCatalogItem {
    return {
        distributor: "invid",
        distributorProductId: item.invidId,
        distributorSku: item.partNumber || item.invidId,
        partNumber: item.partNumber || "",
        ean: item.ean || "",
        name: item.title,
        link: buildInvidProductUrl(item.title, item.invidId),
        image: item.imageUrl,
        price: convertToArs(item.finalPrice, item.currency, usdRate),
        stock: item.stock ?? 0,
        ...(item.stock === null && item.stockStatus ? { stockLabel: item.stockStatus } : {}),
        available: item.available,
    };
}

function fromAir(item: AirLean, usdRate: number): LocalCatalogItem {
    const stockLabel = getAirStockLabel(item.stockByWarehouse);
    return {
        distributor: "air",
        distributorProductId: item.airId,
        distributorSku: item.partNumber || item.airId,
        partNumber: item.partNumber || "",
        ean: "",
        name:
            item.brand && !item.title.toLowerCase().includes(item.brand.toLowerCase())
                ? `${item.title} (${item.brand})`
                : item.title,
        link: null,
        image: null,
        price: convertToArs(item.finalPrice, item.currency, usdRate),
        stock: item.stock,
        ...(stockLabel ? { stockLabel } : {}),
        available: item.available,
    };
}

async function getRate(): Promise<number | null> {
    const usd = await getUsdExchangeRate();
    if (!usd) console.error("Vínculos de distribuidores: sin cotización del dólar");
    return usd?.rate ?? null;
}

/** Ítems de los catálogos locales por ID propio del distribuidor (incluye los no disponibles). */
export async function getLocalCatalogItemsByIds(ids: {
    invid: string[];
    air: string[];
}): Promise<LocalCatalogItem[]> {
    if (ids.invid.length === 0 && ids.air.length === 0) return [];
    await connectDB();
    const rate = await getRate();
    if (!rate) return [];

    const [invid, air] = await Promise.all([
        ids.invid.length > 0
            ? InvidCatalogItemModel.find({ invidId: { $in: ids.invid } }, INVID_FIELDS).lean<InvidLean[]>()
            : [],
        ids.air.length > 0
            ? AirCatalogItemModel.find({ airId: { $in: ids.air } }, AIR_FIELDS).lean<AirLean[]>()
            : [],
    ]);

    return [...invid.map((i) => fromInvid(i, rate)), ...air.map((i) => fromAir(i, rate))];
}

/**
 * Busca en los catálogos locales los ítems disponibles cuyo part number (o EAN, en Invid)
 * coincide con alguno de los regex dados.
 */
export async function findLocalCatalogItemsByCodes(
    partNumberRegexes: RegExp[],
    ean: string,
): Promise<LocalCatalogItem[]> {
    if (partNumberRegexes.length === 0 && !ean) return [];
    await connectDB();
    const rate = await getRate();
    if (!rate) return [];

    const invidOr: Record<string, unknown>[] = partNumberRegexes.map((r) => ({ partNumber: r }));
    if (ean) invidOr.push({ ean: { $regex: `^0*${ean}$` } });

    const [invid, air] = await Promise.all([
        InvidCatalogItemModel.find({ available: true, $or: invidOr }, INVID_FIELDS)
            .limit(20)
            .lean<InvidLean[]>(),
        partNumberRegexes.length > 0
            ? AirCatalogItemModel.find(
                  { available: true, $or: partNumberRegexes.map((r) => ({ partNumber: r })) },
                  AIR_FIELDS,
              )
                  .limit(20)
                  .lean<AirLean[]>()
            : [],
    ]);

    return [...invid.map((i) => fromInvid(i, rate)), ...air.map((i) => fromAir(i, rate))];
}

/** Todos los ítems disponibles con part number o EAN, para la vinculación automática. */
export async function getAllLocalCatalogItemsWithCodes(): Promise<LocalCatalogItem[]> {
    await connectDB();
    const rate = await getRate();
    if (!rate) return [];

    const [invid, air] = await Promise.all([
        InvidCatalogItemModel.find(
            { available: true, $or: [{ partNumber: { $ne: "" } }, { ean: { $ne: "" } }] },
            INVID_FIELDS,
        ).lean<InvidLean[]>(),
        AirCatalogItemModel.find({ available: true, partNumber: { $ne: "" } }, AIR_FIELDS).lean<AirLean[]>(),
    ]);

    return [...invid.map((i) => fromInvid(i, rate)), ...air.map((i) => fromAir(i, rate))];
}
