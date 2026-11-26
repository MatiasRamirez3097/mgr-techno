import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { cardClass } from "@/components/admin/ui/styles";
import { Tabs } from "@/components/admin/ui/Tabs";
import { ResponsiveTable, type Column } from "@/components/admin/ui/ResponsiveTable";
import { BarList } from "@/components/admin/analytics/BarList";
import { VisitsChart } from "@/components/admin/analytics/VisitsChart";
import { getAnalyticsReport } from "@/services/analytics/getAnalyticsReport";
import { ANALYTICS_RANGES, parseAnalyticsRange, percentOf, type ProductRow, type ProductSort } from "@/lib/analytics/report";
import { PAGE_LABELS } from "@/lib/analytics/classify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visitas" };

const SORTS: Record<ProductSort, string> = { views: "Más vistos", adds: "Más agregados", units: "Más vendidos" };
const DEVICE_LABELS: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computadora" };

const num = (n: number) => n.toLocaleString("es-AR");
const rate = (n: number | null) => (n === null ? "—" : `${n}%`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

interface Props {
    searchParams: Promise<{ days?: string; sort?: string }>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className={`${cardClass} min-w-0 p-4`}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
    );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className={`${cardClass} min-w-0 p-4 sm:p-5`}>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function productColumns(withViews = true): Column<ProductRow>[] {
    const columns: Column<ProductRow>[] = [
        {
            key: "name",
            header: "Producto",
            mobile: "title",
            cell: (r) =>
                r.slug ? (
                    <Link
                        href={`/productos/${r.slug}`}
                        target="_blank"
                        className="text-gray-100 hover:text-brand"
                    >
                        {r.name}
                    </Link>
                ) : (
                    <span className="text-gray-400">{r.name}</span>
                ),
        },
        { key: "views", header: "Vistas", align: "right", mobile: "field", cell: (r) => num(r.views) },
        { key: "adds", header: "Agregados", align: "right", mobile: "field", cell: (r) => num(r.adds) },
        {
            key: "addRate",
            header: "% agregado",
            mobileLabel: "Vistas → carrito",
            align: "right",
            mobile: "field",
            cell: (r) => rate(r.addRate),
        },
        { key: "units", header: "Vendidas", align: "right", mobile: "field", cell: (r) => num(r.units) },
        {
            key: "buyRate",
            header: "% compra",
            mobileLabel: "Carrito → compra",
            align: "right",
            mobile: "field",
            cell: (r) => rate(r.buyRate),
        },
    ];
    return withViews ? columns : columns.filter((c) => c.key !== "addRate");
}

export default async function AnalyticsPage({ searchParams }: Props) {
    const params = await searchParams;
    const days = parseAnalyticsRange(params.days);
    const sort: ProductSort = params.sort && Object.hasOwn(SORTS, params.sort) ? (params.sort as ProductSort) : "views";
    const report = await getAnalyticsReport(days, sort);
    const { totals } = report;

    const href = (patch: { days?: number; sort?: ProductSort }, hash = "") => {
        const q = new URLSearchParams();
        const d = patch.days ?? days;
        const s = patch.sort ?? sort;
        if (d !== 30) q.set("days", String(d));
        if (s !== "views") q.set("sort", s);
        const qs = q.toString();
        return `/admin/analytics${qs ? `?${qs}` : ""}${hash}`;
    };

    const chip = (active: boolean) =>
        `inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition ${
            active
                ? "border-brand bg-brand/15 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:text-white"
        }`;

    const rangeChips = (
        <div className="flex gap-2">
            {ANALYTICS_RANGES.map((d) => (
                <Link key={d} href={href({ days: d })} className={chip(d === days)}>
                    {d} días
                </Link>
            ))}
        </div>
    );

    const header = (
        <AdminPageHeader
            title="Visitas"
            description={`Del ${shortDate(report.from)} al ${shortDate(report.to)}. Medición propia de la tienda: no cuenta bots ni administradores logueados.`}
            actions={rangeChips}
        />
    );

    if (totals.visits === 0) {
        return (
            <div className="max-w-6xl">
                {header}
                <div className={`${cardClass} p-6 text-sm text-gray-400`}>
                    Todavía no hay visitas registradas en este período. La medición empieza a juntar datos desde
                    que se publica en la tienda.
                </div>
            </div>
        );
    }

    const funnel = [
        { key: "visits", label: "Visitas", value: totals.visits },
        { key: "product", label: "Vieron un producto", value: totals.withProductView },
        { key: "cart", label: "Agregaron al carrito", value: totals.withAddToCart },
        { key: "checkout", label: "Llegaron al checkout", value: totals.reachedCheckout },
    ];

    const summary = (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                    label="Visitas"
                    value={num(totals.visits)}
                    hint={`${num(Math.round(totals.visits / days))} por día en promedio`}
                />
                <Stat label="Visitantes únicos" value={num(totals.visitors)} />
                <Stat
                    label="Páginas por visita"
                    value={(totals.pageViews / totals.visits).toLocaleString("es-AR", { maximumFractionDigits: 1 })}
                />
                <Stat
                    label="Visitas a ofertas del día"
                    value={num(report.dailyDeals.visits)}
                    hint={`${rate(percentOf(report.dailyDeals.visits, totals.visits))} de las visitas`}
                />
            </div>

            <Card title="Visitas por día" description="Pasá el mouse por una barra para ver también los visitantes únicos.">
                <VisitsChart data={report.daily} />
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Recorrido de las visitas" description="Porcentaje sobre el total de visitas del período.">
                    <BarList rows={funnel} total={totals.visits} />
                </Card>
                <Card title="Pedidos de la tienda" description="Pedidos web del período (sin cancelados), para comparar con las visitas.">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-gray-400">Pedidos</p>
                            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{num(totals.orders)}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                {rate(percentOf(totals.orders, totals.visits))} de las visitas
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Pagados</p>
                            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{num(totals.paidOrders)}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                {rate(percentOf(totals.paidOrders, totals.orders))} de los pedidos
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    const origins = (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card title="De dónde llegan" description="Canal de entrada de cada visita.">
                <BarList
                    total={totals.visits}
                    rows={report.channels.map((c) => ({
                        key: c.channel,
                        label: c.label,
                        value: c.visits,
                        hint: c.sources.length
                            ? c.sources.map((s) => `${capitalize(s.source)} ${num(s.visits)}`).join(" · ")
                            : undefined,
                    }))}
                />
            </Card>
            <Card title="Provincias" description="Aproximada, por la conexión del visitante.">
                <BarList
                    total={totals.visits}
                    rows={report.regions.map((r) => ({ key: r.label, label: r.label, value: r.visits }))}
                />
            </Card>
            <Card title="Ciudades" description="Las 10 con más visitas.">
                <BarList
                    total={totals.visits}
                    rows={report.cities.map((c) => ({ key: c.label, label: c.label, value: c.visits }))}
                />
            </Card>
            <div className="flex flex-col gap-4">
                <Card title="Dispositivos">
                    <BarList
                        total={totals.visits}
                        rows={report.devices.map((d) => ({
                            key: d.device,
                            label: DEVICE_LABELS[d.device] ?? d.device,
                            value: d.visits,
                        }))}
                    />
                </Card>
                <Card title="Campañas" description="Links con utm_campaign.">
                    <BarList
                        total={totals.visits}
                        empty="Ninguna visita llegó con campaña en el período."
                        rows={report.campaigns.map((c) => ({
                            key: `${c.campaign}-${c.source}`,
                            label: c.source ? `${c.campaign} (${c.source})` : c.campaign,
                            value: c.visits,
                        }))}
                    />
                </Card>
            </div>
        </div>
    );

    const totalAdds = report.addsByPage.reduce((acc, p) => acc + p.adds, 0);
    const products = (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                {(Object.keys(SORTS) as ProductSort[]).map((s) => (
                    <Link key={s} href={href({ sort: s }, "#productos")} className={chip(s === sort)}>
                        {SORTS[s]}
                    </Link>
                ))}
            </div>
            <ResponsiveTable
                rows={report.products}
                columns={productColumns()}
                getRowKey={(r) => r.id}
                empty="Sin datos de productos en el período."
                minWidth="720px"
            />
            <p className="text-xs text-gray-500">
                Vistas: una por producto en cada visita. Vendidas: unidades en pedidos web del período (sin
                cancelados), aunque el pedido venga de una visita anterior.
            </p>
            <Card title="Desde dónde se agrega al carrito" description="Página en la que estaba el visitante al agregar.">
                <BarList
                    total={totalAdds}
                    rows={report.addsByPage.map((p) => ({ key: p.page, label: PAGE_LABELS[p.page] ?? p.page, value: p.adds }))}
                />
            </Card>
        </div>
    );

    const deals = (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat
                    label="Visitas que entraron a la sección"
                    value={num(report.dailyDeals.visits)}
                    hint={`${rate(percentOf(report.dailyDeals.visits, totals.visits))} de las visitas`}
                />
                <Stat label="Vistas de la página" value={num(report.dailyDeals.pageViews)} />
                <Stat
                    label="Agregados desde la sección"
                    value={num(report.dailyDeals.adds)}
                    hint={`${rate(percentOf(report.dailyDeals.adds, totalAdds))} de todos los agregados`}
                />
            </div>
            <Card title="Lo más agregado desde ofertas del día" description="Vistas y vendidas son del producto en toda la tienda.">
                <ResponsiveTable
                    rows={report.dailyDeals.products}
                    columns={productColumns(false)}
                    getRowKey={(r) => r.id}
                    empty="Nadie agregó productos desde la sección en el período."
                    minWidth="640px"
                    variant="bare"
                />
            </Card>
        </div>
    );

    return (
        <div className="max-w-6xl">
            {header}
            <Tabs
                ariaLabel="Secciones de visitas"
                tabs={[
                    { id: "resumen", label: "Resumen", content: summary },
                    { id: "origenes", label: "Orígenes", content: origins },
                    { id: "productos", label: "Productos", badge: report.products.length || undefined, content: products },
                    { id: "ofertas", label: "Ofertas del día", content: deals },
                ]}
            />
        </div>
    );
}
