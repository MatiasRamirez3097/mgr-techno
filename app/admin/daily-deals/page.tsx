import { connectDB } from "@/lib/mongodb";
import { BrandModel } from "@/models/Brand";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DailyDealsForm } from "@/components/admin/dailyDeals/DailyDealsForm";
import { TodayDealPanel } from "@/components/admin/dailyDeals/TodayDealPanel";
import { getDailyDealsOverview } from "@/services/dailyDeals/getDailyDealsOverview";
import { getDailyDealSettings } from "@/services/dailyDeals/getDailyDealSettings";
import { getCategoryMargins } from "@/services/pricing/getCategoryMargins";
import { getPricingSettings } from "@/services/settings/getPricingSettings";

export const dynamic = "force-dynamic";

export default async function DailyDealsPage() {
    await connectDB();
    const [settings, categories, brands, pricing, overview] = await Promise.all([
        getDailyDealSettings(),
        getCategoryMargins(),
        BrandModel.find({}, { name: 1 }).sort({ name: 1 }).lean<{ _id: { toString(): string }; name: string }[]>(),
        getPricingSettings(),
        getDailyDealsOverview(),
    ]);

    return (
        <div className="max-w-5xl">
            <AdminPageHeader
                title="Ofertas del día"
                description="Cada día, a las 00:00 (o desde el día de inicio que programes), se sortean productos con costo conocido y buena utilidad y se ponen en oferta hasta la medianoche."
            />
            <div className="flex flex-col gap-6 mb-6">
                <TodayDealPanel overview={overview} enabled={settings.enabled} startDate={settings.startDate} />
            </div>
            <DailyDealsForm
                initialSettings={settings}
                categories={categories.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
                brands={brands.map((b) => ({ id: b._id.toString(), name: b.name }))}
                roundingStep={pricing.priceRoundingStep}
                today={overview.today}
            />
        </div>
    );
}
