import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import { buildInvidProductUrl, convertToArs } from "@/lib/distributors/invidMapper";
import { getAirStockLabel, type AirWarehouse } from "@/lib/distributors/airMapper";
import { PCMODD_STOCK_LABEL, pcmoddDisplayName } from "@/lib/distributors/pcmoddMapper";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";

// Distribuidores con copia local del catálogo
export const LOCAL_DISTRIBUTORS = ["invid", "air", "pcmodd"] as const;
export type LocalDistributor = (typeof LOCAL_DISTRIBUTORS)[number];
export type LocalIds = Record<LocalDistributor, string[]>;
export const emptyLocalIds = (): LocalIds => ({ invid: [], air: [], pcmodd: [] });
const hasAnyId = (ids: LocalIds) => LOCAL_DISTRIBUTORS.some((d) => ids[d].length > 0);

/**
 * Ítem de los catálogos locales (Invid, AIR y PCMODD) con el costo ya en ARS con IVA. Se usa para
 * sugerir vínculos y para mostrar el costo vigente de los productos vinculados.
 */
export interface LocalCatalogItem {
    distributor: LocalDistributor;
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

interface PcmoddLean {
    pcmoddId: string;
    title: string;
    brand: string;
    finalPrice: number;
    currency: string;
    available: boolean;
}

const PCMODD_FIELDS = { pcmoddId: 1, title: 1, brand: 1, finalPrice: 1, currency: 1, available: 1 };

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

// La hoja no tiene códigos ni stock: se compara por nombre y se toma como disponible
function fromPcmodd(item: PcmoddLean, usdRate: number): LocalCatalogItem {
    return {
        distributor: "pcmodd",
        distributorProductId: item.pcmoddId,
        distributorSku: item.pcmoddId,
        partNumber: "",
        ean: "",
        name: pcmoddDisplayName(item.title, item.brand),
        link: null,
        image: null,
        price: convertToArs(item.finalPrice, item.currency, usdRate),
        stock: 0,
        stockLabel: PCMODD_STOCK_LABEL,
        available: item.available,
    };
}

async function getRate(): Promise<number | null> {
    const usd = await getUsdExchangeRate();
    if (!usd) console.error("Vínculos de distribuidores: sin cotización del dólar");
    return usd?.rate ?? null;
}

/** Ítems de los catálogos locales por ID propio del distribuidor (incluye los no disponibles). */
export async function getLocalCatalogItemsByIds(ids: LocalIds): Promise<LocalCatalogItem[]> {
    if (!hasAnyId(ids)) return [];
    await connectDB();
    const rate = await getRate();
    if (!rate) return [];

    const [invid, air, pcmodd] = await Promise.all([
        ids.invid.length > 0
            ? InvidCatalogItemModel.find({ invidId: { $in: ids.invid } }, INVID_FIELDS).lean<InvidLean[]>()
            : [],
        ids.air.length > 0
            ? AirCatalogItemModel.find({ airId: { $in: ids.air } }, AIR_FIELDS).lean<AirLean[]>()
            : [],
        ids.pcmodd.length > 0
            ? PcmoddCatalogItemModel.find({ pcmoddId: { $in: ids.pcmodd } }, PCMODD_FIELDS).lean<PcmoddLean[]>()
            : [],
    ]);

    return [
        ...invid.map((i) => fromInvid(i, rate)),
        ...air.map((i) => fromAir(i, rate)),
        ...pcmodd.map((i) => fromPcmodd(i, rate)),
    ];
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

export interface LocalPriceChange {
    distributor: LocalDistributor;
    distributorProductId: string;
    name: string;
    // Variación del costo en USD (la sincronización registra cambios de 2% o más)
    change: number;
    changedAt: Date;
}

/** Cambios de costo registrados por la sincronización de Invid/AIR/PCMODD desde `since`, para los IDs dados. */
export async function getLocalCatalogPriceChanges(
    ids: LocalIds,
    since: Date,
): Promise<LocalPriceChange[]> {
    await connectDB();
    type ChangeLean = { title: string; finalPrice: number; previousFinalPrice: number; priceChangedAt: Date };
    const filter = { priceChangedAt: { $gte: since }, previousFinalPrice: { $gt: 0 } };
    const fields = { title: 1, finalPrice: 1, previousFinalPrice: 1, priceChangedAt: 1 };

    const [invid, air, pcmodd] = await Promise.all([
        ids.invid.length > 0
            ? InvidCatalogItemModel.find({ ...filter, invidId: { $in: ids.invid } }, { ...fields, invidId: 1 }).lean<
                  (ChangeLean & { invidId: string })[]
              >()
            : [],
        ids.air.length > 0
            ? AirCatalogItemModel.find({ ...filter, airId: { $in: ids.air } }, { ...fields, airId: 1 }).lean<
                  (ChangeLean & { airId: string })[]
              >()
            : [],
        ids.pcmodd.length > 0
            ? PcmoddCatalogItemModel.find(
                  { ...filter, pcmoddId: { $in: ids.pcmodd } },
                  { ...fields, pcmoddId: 1 },
              ).lean<(ChangeLean & { pcmoddId: string })[]>()
            : [],
    ]);

    const toChange = (distributor: LocalDistributor, id: string, i: ChangeLean): LocalPriceChange => ({
        distributor,
        distributorProductId: id,
        name: i.title,
        change: (i.finalPrice - i.previousFinalPrice) / i.previousFinalPrice,
        changedAt: i.priceChangedAt,
    });

    return [
        ...invid.map((i) => toChange("invid", i.invidId, i)),
        ...air.map((i) => toChange("air", i.airId, i)),
        ...pcmodd.map((i) => toChange("pcmodd", i.pcmoddId, i)),
    ];
}

/**
 * Todos los ítems disponibles de los catálogos locales; con `withCodesOnly`, sólo los que tienen
 * part number o EAN (vinculación automática por código).
 */
export async function getAllLocalCatalogItemsWithCodes({ withCodesOnly = true } = {}): Promise<LocalCatalogItem[]> {
    await connectDB();
    const rate = await getRate();
    if (!rate) return [];

    const [invid, air, pcmodd] = await Promise.all([
        InvidCatalogItemModel.find(
            withCodesOnly
                ? { available: true, $or: [{ partNumber: { $ne: "" } }, { ean: { $ne: "" } }] }
                : { available: true },
            INVID_FIELDS,
        ).lean<InvidLean[]>(),
        AirCatalogItemModel.find(
            withCodesOnly ? { available: true, partNumber: { $ne: "" } } : { available: true },
            AIR_FIELDS,
        ).lean<AirLean[]>(),
        // PCMODD no tiene códigos: sólo entra en las sugerencias por nombre
        withCodesOnly
            ? ([] as PcmoddLean[])
            : PcmoddCatalogItemModel.find({ available: true }, PCMODD_FIELDS).lean<PcmoddLean[]>(),
    ]);

    return [
        ...invid.map((i) => fromInvid(i, rate)),
        ...air.map((i) => fromAir(i, rate)),
        ...pcmodd.map((i) => fromPcmodd(i, rate)),
    ];
}
