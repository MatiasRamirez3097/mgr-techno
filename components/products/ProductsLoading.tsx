import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export function ProductsLoading() {
    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <div className="h-8 w-64 rounded bg-gray-800 animate-pulse" />

                    <div className="h-4 w-24 rounded bg-gray-800 animate-pulse mt-2" />
                </div>

                <div className="h-10 w-40 rounded bg-gray-800 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        </main>
    );
}
