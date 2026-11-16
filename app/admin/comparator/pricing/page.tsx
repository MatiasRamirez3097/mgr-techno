import Link from "next/link";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { PriceReviewFilters } from "@/components/admin/pricing/PriceReviewFilters";
import { PriceReviewTable } from "@/components/admin/pricing/PriceReviewTable";
import { getPriceReview } from "@/services/pricing/getPriceReview";
import { getCategoryMargins } from "@/services/pricing/getCategoryMargins";
import { getLinkPricesSyncStatus } from "@/services/distributors/links/getLinkPricesSyncStatus";
import { RefreshCostsButton } from "@/components/admin/pricing/RefreshCostsButton";
import { LinkSuggestionsButton } from "@/components/admin/pricing/LinkSuggestionsButton";
import { LINK_SUGGESTIONS_STATE_ID } from "@/services/distributors/links/generateLinkSuggestions";
import type { PriceReviewView } from "@/types/shared/priceReview";

export const dynamic = "force-dynamic";

const VIEWS: PriceReviewView[] = ["linked", "below_min", "below_target", "no_stock", "unlinked", "suggested", "all"];

interface Props {
    searchParams: Promise<{
        search?: string;
        category?: string;
        status?: string;
        stock?: string;
        view?: string;
        page?: string;
        limit?: string;
    }>;
}

export default async function PriceReviewPage({ searchParams }: Props) {
    const params = await searchParams;
    const view = VIEWS.includes(params.view as PriceReviewView) ? (params.view as PriceReviewView) : "linked";
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const [review, categories, syncStatus, suggestionsStatus] = await Promise.all([
        getPriceReview({
            search: params.search,
            categoryId: params.category,
            status: params.status === "all" ? "all" : "publish",
            stock: params.stock === "in" || params.stock === "out" ? params.stock : undefined,
            view,
            page,
            limit,
        }),
        getCategoryMargins(),
        getLinkPricesSyncStatus(),
        getLinkPricesSyncStatus(LINK_SUGGESTIONS_STATE_ID),
    ]);

    const viewHref = (v: PriceReviewView) => {
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value && key !== "view" && key !== "page") next.set(key, value);
        }
        if (v !== "linked") next.set("view", v);
        const qs = next.toString();
        return `/admin/comparator/pricing${qs ? `?${qs}` : ""}`;
    };

    const { summary } = review;
    const cards: { view: PriceReviewView; label: string; count: number; tone: string }[] = [
        { view: "linked", label: "Vinculados", count: summary.linked, tone: "text-white" },
        { view: "below_min", label: "Bajo el mínimo", count: summary.belowMin, tone: "text-red-400" },
        { view: "below_target", label: "Bajo el objetivo", count: summary.belowMin + summary.belowTarget, tone: "text-amber-300" },
        { view: "no_stock", label: "Sin stock en distribuidores", count: summary.noStock, tone: "text-gray-300" },
        { view: "unlinked", label: "Sin vincular", count: summary.unlinked, tone: "text-gray-400" },
        { view: "suggested", label: "Con sugerencias de vínculo", count: summary.withSuggestions, tone: "text-brand" },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white">Revisión de precios</h1>
                    <p className="text-sm text-gray-400">
                        Tu precio (transferencia/efectivo) contra el mejor costo con stock de los distribuidores vinculados.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <PriceReviewFilters categories={categories} />
                    <AdminSearch placeholder="Buscar por nombre, SKU, MPN..." />
                    <Link href="/admin/comparator/margins" className="text-xs text-gray-400 hover:text-white underline">
                        Configurar márgenes
                    </Link>
                </div>
            </div>

            <div className="mb-4 space-y-2">
                <RefreshCostsButton status={syncStatus} />
                <LinkSuggestionsButton status={suggestionsStatus} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
                {cards.map((card) => (
                    <Link
                        key={card.view}
                        href={viewHref(card.view)}
                        className={`rounded-xl border p-4 transition ${
                            view === card.view
                                ? "border-brand bg-brand/10"
                                : "border-gray-800 bg-gray-900 hover:border-gray-600"
                        }`}
                    >
                        <span className={`block text-2xl font-bold ${card.tone}`}>{card.count}</span>
                        <span className="text-xs text-gray-400">{card.label}</span>
                    </Link>
                ))}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <PriceReviewTable rows={review.rows} />
            </div>

            {review.totalPages > 1 && (
                <div className="mt-4">
                    <AdminPagination
                        currentPage={review.page}
                        totalPages={review.totalPages}
                        totalItems={review.total}
                        limit={limit}
                    />
                </div>
            )}
        </div>
    );
}
