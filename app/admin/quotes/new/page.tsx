import Link from "next/link";
import { QuoteForm } from "@/components/admin/quotes/QuoteForm";

export default function AdminNewQuotePage() {
    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/quotes"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver a Presupuestos
                </Link>
                <h1 className="text-2xl font-bold text-white">Nuevo Presupuesto</h1>
            </div>
            <QuoteForm mode="create" />
        </div>
    );
}
