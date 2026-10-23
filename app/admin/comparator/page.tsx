import { AdminSearch } from "@/components/admin/AdminSearch";
import { CategorySelect } from "@/components/admin/distributors/CategorySelect";
import { DistributorSelect } from "@/components/admin/distributors/DistributorSelect";
import { DistributorsTable } from "@/components/admin/distributors/DistributorsTable";
import { InvidSyncStatus } from "@/components/admin/distributors/InvidSyncStatus";
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";
import { getInvidSyncStatus } from "@/services/distributors/invid/getInvidSyncStatus";
import { getInvidCategories } from "@/services/distributors/invid/getInvidCategories";

// Si el catálogo de Invid quedó viejo se sincroniza con `after` al terminar el render
export const maxDuration = 300;

interface Props {
    searchParams: Promise<{
        search?: string;
        category?: string;
        distributors?: string;
        page?: string;
    }>;
}

export default async function AdminDistributorsPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = params.search || "";
    // 1. Extract category from URL
    const category = params.category || "";

    const enabledDistributors = params.distributors
        ? params.distributors.split(",")
        : ["elit", "newbytes", "invid"];

    // Pasamos el array de distribuidores habilitados
    const [products, invidStatus] = await Promise.all([
        getDistributorProducts(search, category, enabledDistributors),
        enabledDistributors.includes("invid")
            ? Promise.all([getInvidSyncStatus(), getInvidCategories()]).catch((e) => {
                  console.error("Error obteniendo el estado de Invid:", e);
                  return null;
              })
            : null,
    ]);

    return (
        <div>
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <h1 className="text-2xl font-bold text-white">
                    Precios de Distribuidores
                </h1>

                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                    <DistributorSelect />
                    {/* Filter by Category */}
                    <CategorySelect />

                    {/* Search by Name/SKU */}
                    <AdminSearch placeholder="Buscar por nombre, SKU..." />
                </div>
            </div>

            {invidStatus && (
                <InvidSyncStatus status={invidStatus[0]} categories={invidStatus[1]} />
            )}

            {/* TABLE */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <DistributorsTable products={products} search={search} />
            </div>
        </div>
    );
}
