import Link from "next/link";
import { PricingMarginsForm } from "@/components/admin/pricing/PricingMarginsForm";
import { getPricingSettings } from "@/services/settings/getPricingSettings";
import { getCategoryMargins } from "@/services/pricing/getCategoryMargins";

export const dynamic = "force-dynamic";

export default async function PricingMarginsPage() {
    const [settings, categories] = await Promise.all([getPricingSettings(), getCategoryMargins()]);

    return (
        <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/comparator/pricing" className="text-gray-400 hover:text-white text-sm">
                    ← Revisión de precios
                </Link>
                <h1 className="text-2xl font-bold text-white">Márgenes</h1>
            </div>
            <PricingMarginsForm settings={settings} categories={categories} />
        </div>
    );
}
