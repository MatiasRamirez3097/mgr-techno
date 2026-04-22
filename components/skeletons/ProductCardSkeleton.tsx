export function ProductCardSkeleton() {
    return (
        <div className="relative rounded-2xl bg-gray-900 border border-gray-800 p-4 overflow-hidden">
            {/* glow gamer */}
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-xl" />

            <div className="relative z-10 space-y-3">
                {/* imagen */}
                <div className="h-40 rounded-xl shimmer animate-[shimmer_3s_infinite]" />

                {/* título */}
                <div className="h-4 rounded shimmer" />
                <div className="h-4 rounded w-2/3 shimmer" />

                {/* precio */}
                <div className="h-5 rounded w-1/3 shimmer" />

                {/* botón */}
                <div className="h-10 rounded-lg shimmer mt-4" />
            </div>
        </div>
    );
}
