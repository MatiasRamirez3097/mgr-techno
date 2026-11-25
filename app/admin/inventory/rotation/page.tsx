import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { buttonClass, cardClass } from "@/components/admin/ui/styles";
import { RotationTable } from "@/components/admin/rotation/RotationTable";
import { getRotationReport } from "@/services/inventory/getRotationReport";
import { ROTATION_REASON_HINTS, ROTATION_REASON_LABELS } from "@/lib/inventory/rotation";
import type { RotationReason } from "@/types/shared/stockRotation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stock a rotar" };

const REASONS: RotationReason[] = ["slow", "old", "cheaper_replacement", "competitor_cheaper", "no_supplier", "restock"];
const SORTS = { cost: "Costo parado", age: "Antigüedad", coverage: "Cobertura" } as const;
type Sort = keyof typeof SORTS;

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

interface Props {
    searchParams: Promise<{ reason?: string; sort?: string }>;
}

export default async function StockRotationPage({ searchParams }: Props) {
    const params = await searchParams;
    const report = await getRotationReport();
    const { settings, summary } = report;

    const visibleReasons = REASONS.filter((r) => r !== "restock" || settings.rotationRestockEnabled);
    const reason = visibleReasons.find((r) => r === params.reason) ?? null;
    const sort: Sort = params.sort && Object.hasOwn(SORTS, params.sort) ? (params.sort as Sort) : "cost";

    // Sin filtro, "reponer" va en su propia pestaña: no se mezcla con lo que hay que sacar
    let rows = reason
        ? report.rows.filter((r) => r.reasons.includes(reason))
        : report.rows.filter((r) => r.reasons.some((x) => x !== "restock"));
    if (sort === "age") rows = [...rows].sort((a, b) => (b.oldestAgeDays ?? -1) - (a.oldestAgeDays ?? -1));
    if (sort === "coverage") {
        rows = [...rows].sort((a, b) => (b.coverageDays ?? Infinity) - (a.coverageDays ?? Infinity));
        if (reason === "restock") rows.reverse();
    }

    const href = (patch: { reason?: string | null; sort?: Sort }) => {
        const q = new URLSearchParams();
        const r = patch.reason === undefined ? reason : patch.reason;
        const s = patch.sort ?? sort;
        if (r) q.set("reason", r);
        if (s !== "cost") q.set("sort", s);
        const qs = q.toString();
        return `/admin/inventory/rotation${qs ? `?${qs}` : ""}`;
    };

    const chip = (active: boolean) =>
        `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            active
                ? "border-brand bg-brand/15 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:text-white"
        }`;

    return (
        <div className="max-w-6xl">
            <AdminPageHeader
                title="Stock a rotar"
                description={`Productos con stock que conviene empujar. Ritmo de venta de los últimos ${settings.rotationSalesWindowDays} días; costos con IVA.`}
                actions={
                    <Link href="/admin/settings" className={buttonClass.secondary}>
                        Ajustar umbrales
                    </Link>
                }
            />

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className={`${cardClass} p-4`}>
                    <p className="text-xs text-gray-400">Productos a rotar</p>
                    <p className="mt-1 text-2xl font-bold text-white">{summary.toRotate}</p>
                </div>
                <div className={`${cardClass} p-4`}>
                    <p className="text-xs text-gray-400">Costo de ese stock</p>
                    <p className="mt-1 text-2xl font-bold text-white">{money(summary.stockCost)}</p>
                </div>
                <div className={`${cardClass} p-4`}>
                    <p className="text-xs text-gray-400">Con unidades de más de {settings.rotationOldStockDays} días</p>
                    <p className="mt-1 text-2xl font-bold text-white">{summary.byReason.old}</p>
                </div>
            </div>

            <nav aria-label="Motivo" className="mb-3 flex flex-wrap gap-2">
                <Link href={href({ reason: null })} className={chip(!reason)}>
                    Todos
                    <span className="text-xs text-gray-400">{summary.toRotate}</span>
                </Link>
                {visibleReasons.map((r) => (
                    <Link key={r} href={href({ reason: r })} className={chip(reason === r)}>
                        {ROTATION_REASON_LABELS[r]}
                        <span className="text-xs text-gray-400">{summary.byReason[r]}</span>
                    </Link>
                ))}
            </nav>

            {reason && <p className="mb-3 text-sm text-gray-400">{ROTATION_REASON_HINTS[reason]}</p>}

            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span>Ordenar por:</span>
                {(Object.keys(SORTS) as Sort[]).map((s) => (
                    <Link
                        key={s}
                        href={href({ sort: s })}
                        className={s === sort ? "font-semibold text-white" : "hover:text-white"}
                    >
                        {SORTS[s]}
                    </Link>
                ))}
            </div>

            <RotationTable rows={rows} oldStockDays={settings.rotationOldStockDays} />
        </div>
    );
}
