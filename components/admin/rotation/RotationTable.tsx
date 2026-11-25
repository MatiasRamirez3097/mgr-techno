import { ResponsiveTable, type Column } from "@/components/admin/ui/ResponsiveTable";
import { ROTATION_REASON_HINTS, ROTATION_REASON_LABELS } from "@/lib/inventory/rotation";
import { DISTRIBUTOR_LABELS, toDistributorKey } from "@/lib/distributors/productLinks";
import type { RotationReason, RotationRow } from "@/types/shared/stockRotation";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

const REASON_STYLE: Record<RotationReason, string> = {
    slow: "bg-amber-400/15 text-amber-300",
    old: "bg-orange-500/15 text-orange-300",
    cheaper_replacement: "bg-red-500/15 text-red-300",
    competitor_cheaper: "bg-fuchsia-500/15 text-fuchsia-300",
    no_supplier: "bg-gray-700 text-gray-200",
    restock: "bg-green-500/15 text-green-300",
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

function distributorLabel(d: string | null) {
    const key = d ? toDistributorKey(d) : null;
    return key ? DISTRIBUTOR_LABELS[key] : (d ?? "");
}

export function RotationTable({ rows, oldStockDays }: { rows: RotationRow[]; oldStockDays: number }) {
    const columns: Column<RotationRow>[] = [
        {
            key: "image",
            header: "",
            mobile: "media",
            className: "w-12",
            cell: (row) => (
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-white">
                    {row.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt="" className="h-full w-full object-contain p-0.5" />
                    )}
                </div>
            ),
        },
        {
            key: "name",
            header: "Producto",
            mobile: "title",
            cell: (row) => (
                <div className="min-w-0">
                    <span className="block text-white break-words">{row.name}</span>
                    {row.sku && <span className="block text-xs text-gray-500">{row.sku}</span>}
                </div>
            ),
        },
        {
            key: "reasons",
            header: "Motivos",
            mobile: "badge",
            cell: (row) => (
                <div className="flex flex-wrap gap-1.5">
                    {row.reasons.map((r) => (
                        <span
                            key={r}
                            title={ROTATION_REASON_HINTS[r]}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${REASON_STYLE[r]}`}
                        >
                            {ROTATION_REASON_LABELS[r]}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            key: "stock",
            header: "Stock",
            align: "right",
            cell: (row) => (
                <span>
                    {row.availableStock}
                    {row.unitsWithoutLots > 0 && (
                        <span
                            className="block text-xs text-gray-500"
                            title="Unidades sin lote de compra: no se sabe su costo ni cuándo entraron"
                        >
                            {row.unitsWithoutLots} sin lote
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: "sales",
            header: "Ventas",
            align: "right",
            cell: (row) => (
                <span>
                    {row.unitsSold} u.
                    <span className="block text-xs text-gray-500">
                        {row.lastSaleAt ? `última ${formatDate(row.lastSaleAt)}` : "sin ventas"}
                    </span>
                </span>
            ),
        },
        {
            key: "coverage",
            header: "Cobertura",
            align: "right",
            cell: (row) =>
                row.coverageDays === null ? (
                    <span className="text-gray-500">—</span>
                ) : (
                    <span>{row.coverageDays.toLocaleString("es-AR")} días</span>
                ),
        },
        {
            key: "age",
            header: "Antigüedad",
            align: "right",
            cell: (row) =>
                row.oldestAgeDays === null ? (
                    <span className="text-gray-500">—</span>
                ) : (
                    <span>
                        {row.oldestAgeDays} días
                        {row.oldUnits > 0 && (
                            <span className="block text-xs text-orange-300">
                                {row.oldUnits} u. de +{oldStockDays} días
                            </span>
                        )}
                    </span>
                ),
        },
        {
            key: "cost",
            header: "Costo parado",
            align: "right",
            cell: (row) => (
                <span>
                    {row.stockCost > 0 ? money(row.stockCost) : <span className="text-gray-500">—</span>}
                    {row.averageUnitCost !== null && (
                        <span className="block text-xs text-gray-500">{money(row.averageUnitCost)} c/u</span>
                    )}
                    {row.unitsWithoutCost > 0 && row.stockCost > 0 && (
                        <span
                            className="block text-xs text-gray-500"
                            title="Unidades sin costo de compra conocido: no suman al costo parado"
                        >
                            {row.unitsWithoutCost} u. sin costo
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: "replacement",
            header: "Reposición",
            align: "right",
            cell: (row) =>
                row.replacementCost === null ? (
                    <span className="text-gray-500">
                        {row.linkedDistributors > 0 ? "Ningún distribuidor lo tiene" : "Sin vincular"}
                    </span>
                ) : (
                    <span>
                        {money(row.replacementCost)}
                        <span className="block text-xs text-gray-500">
                            {distributorLabel(row.replacementDistributor)}
                            {row.replacementDiff !== null && (
                                <span className={row.replacementDiff < 0 ? " text-red-300" : " text-gray-400"}>
                                    {" "}
                                    {pct(row.replacementDiff)}
                                </span>
                            )}
                        </span>
                    </span>
                ),
        },
        {
            key: "price",
            header: "Precio",
            align: "right",
            cell: (row) => (
                <span>
                    {money(row.effectivePrice)}
                    {row.referencePrice !== null && row.referenceDiff !== null && (
                        <span
                            className="block text-xs text-gray-500"
                            title={`Más barato en las tiendas de referencia: ${money(row.referencePrice)}`}
                        >
                            {row.referenceSource ?? "Ref."} {money(row.referencePrice)}
                            <span className={row.referenceDiff > 0 ? " text-fuchsia-300" : " text-gray-400"}>
                                {" "}
                                {pct(row.referenceDiff)}
                            </span>
                        </span>
                    )}
                </span>
            ),
        },
    ];

    return (
        <ResponsiveTable
            rows={rows}
            columns={columns}
            getRowKey={(r) => r.productId}
            rowHref={(r) => `/admin/products/${r.productId}`}
            minWidth="960px"
            empty="No hay productos con estos motivos. 🎉"
        />
    );
}
