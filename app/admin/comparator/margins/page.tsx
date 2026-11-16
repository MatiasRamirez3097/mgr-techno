import { PricingMarginsForm } from "@/components/admin/pricing/PricingMarginsForm";
import { getPricingSettings } from "@/services/settings/getPricingSettings";
import { getCategoryMargins } from "@/services/pricing/getCategoryMargins";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function PricingMarginsPage() {
    const [settings, categories] = await Promise.all([getPricingSettings(), getCategoryMargins()]);

    return (
        <div className="max-w-4xl">
            <AdminPageHeader back={{ href: "/admin/comparator/pricing", label: "Revisión de precios" }} title="Márgenes" />
            <PricingMarginsForm settings={settings} categories={categories} />
        </div>
    );
}
