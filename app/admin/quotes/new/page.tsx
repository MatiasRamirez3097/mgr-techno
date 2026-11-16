import { QuoteForm } from "@/components/admin/quotes/QuoteForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default function AdminNewQuotePage() {
    return (
        <div>
            <AdminPageHeader back={{ href: "/admin/quotes", label: "Presupuestos" }} title="Nuevo presupuesto" />
            <QuoteForm mode="create" />
        </div>
    );
}
