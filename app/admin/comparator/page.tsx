import { AdminSearch } from "@/components/admin/AdminSearch";
import { CategorySelect } from "@/components/admin/distributors/CategorySelect";
import { DistributorsTable } from "@/components/admin/distributors/DistributorsTable";
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";

interface Props {
    searchParams: Promise<{
        search?: string;
        category?: string;
        page?: string;
    }>;
}

export default async function AdminDistributorsPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = params.search || "";
    // 1. Extract category from URL
    const category = params.category || "";

    // 2. Pass both search and category to our service
    const products = await getDistributorProducts(search, category);

    return (
        <div>
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <h1 className="text-2xl font-bold text-white">
                    Distributor Prices
                </h1>

                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                    {/* Filter by Category */}
                    <CategorySelect />

                    {/* Search by Name/SKU */}
                    <AdminSearch placeholder="Search by name, SKU..." />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <DistributorsTable products={products} search={search} />
            </div>
        </div>
    );
}
