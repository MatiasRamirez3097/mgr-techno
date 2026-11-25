import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StockCountScreen } from "@/components/admin/stockCount/StockCountScreen";
import { getStockCountsOverview } from "@/services/stockCounts/getStockCountsOverview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conteo de stock" };

export default async function StockCountPage() {
    const overview = await getStockCountsOverview();
    return (
        <div>
            <AdminPageHeader
                title="Conteo de stock"
                description="Cada día unos pocos productos para contar en el local. Si no coincide con el sistema, se resuelve acá: venta sin registrar, baja o error al contar."
            />
            <StockCountScreen initial={overview} />
        </div>
    );
}
