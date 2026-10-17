export default function ProductDetailLoading() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Galería Skeleton */}
                <div className="flex flex-col gap-3">
                    <div className="aspect-square w-full rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
                    <div className="grid grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square rounded-xl bg-gray-900 border border-gray-800 animate-pulse"
                            />
                        ))}
                    </div>
                </div>

                {/* Info Skeleton */}
                <div className="flex flex-col gap-4">
                    <div className="h-8 w-3/4 rounded-lg bg-gray-800 animate-pulse" />
                    <div className="h-6 w-1/2 rounded-lg bg-gray-800/70 animate-pulse" />

                    {/* Caja de precios Skeleton */}
                    <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 flex flex-col gap-4">
                        <div className="h-6 w-28 rounded bg-gray-800 animate-pulse" />
                        <div className="h-14 w-48 rounded-lg bg-gray-800 animate-pulse" />
                        <div className="h-4 w-56 rounded bg-gray-800/60 animate-pulse" />
                        <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                            <div className="h-4 w-40 rounded bg-gray-800 animate-pulse" />
                            <div className="h-8 w-28 rounded bg-gray-800 animate-pulse" />
                        </div>
                    </div>

                    {/* Botón y cotizador Skeleton */}
                    <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-4">
                        <div className="h-5 w-32 rounded bg-gray-800 animate-pulse" />
                        <div className="h-12 w-full rounded-xl bg-gray-800 animate-pulse" />
                        <div className="h-36 w-full rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
                    </div>
                </div>
            </div>
        </main>
    );
}
