import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function Loading() {
    return (
        <div className="grid grid-cols-4 gap-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}
