import { AdminSearch } from "@/components/admin/AdminSearch";
import { DistributorsTable } from "@/components/admin/distributors/DistributorsTable";
// You can move this fetcher to a separate service file like "@/services/distributors/getDistributorProducts"
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";

interface Props {
    searchParams: Promise<{
        search?: string;
        page?: string;
    }>;
}

export default async function AdminDistributorsPage({ searchParams }: Props) {
    // 1. Extract URL parameters (awaiting the Promise as required in latest Next.js)
    const params = await searchParams;
    const search = params.search || "";

    // 2. Fetch data from distributors based on the search term
    const products = await getDistributorProducts(search);

    return (
        <div>
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}
            <div
                className="
                flex
                items-center
                justify-between
                mb-6
                gap-4
                flex-wrap
            "
            >
                <h1
                    className="
                    text-2xl
                    font-bold
                    text-white
                "
                >
                    Distributor Prices
                </h1>

                <div
                    className="
                    flex
                    items-center
                    gap-3
                    w-full
                    sm:w-auto
                "
                >
                    {/* Reusing your existing AdminSearch component */}
                    <AdminSearch
                        placeholder="
                            Search by name,
                            SKU or model...
                        "
                    />
                </div>
            </div>

            {/* ========================= */}
            {/* TABLE CONTAINER */}
            {/* ========================= */}
            <div
                className="
                bg-gray-900
                rounded-2xl
                border
                border-gray-800
                overflow-hidden
            "
            >
                {/* We pass the fetched products to a separate client or server component */}
                <DistributorsTable products={products} search={search} />
            </div>
        </div>
    );
}
