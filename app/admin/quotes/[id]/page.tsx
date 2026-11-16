import { notFound } from "next/navigation";
import { getQuoteById } from "@/services/quotes/getQuoteById";
import { getQuotePriceContext } from "@/services/quotes/getQuotePriceContext";
import { QuoteForm } from "@/components/admin/quotes/QuoteForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function AdminEditQuotePage({ params }: Props) {
    const { id } = await params;
    const quote = await getQuoteById(id);

    if (!quote) {
        notFound();
    }

    const priceContext = await getQuotePriceContext([quote]);

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/quotes", label: "Presupuestos" }}
                title={`Presupuesto ${quote.number}`}
                actions={
                    <a
                        href={`/api/admin/quotes/${quote.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-200 text-xs font-medium border border-gray-700 hover:bg-gray-700 transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 text-brand"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        Ver PDF
                    </a>
                }
            />
            <QuoteForm mode="edit" quote={quote} priceContext={priceContext} />
        </div>
    );
}
