export default function Loading() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* GALLERY */}

                <div className="space-y-4">
                    <div className="aspect-square rounded-xl bg-zinc-800 animate-pulse" />

                    <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square rounded-lg bg-zinc-800 animate-pulse"
                            />
                        ))}
                    </div>
                </div>

                {/* INFO */}

                <div className="flex flex-col gap-4">
                    {/* TITLE */}

                    <div className="h-8 w-4/5 rounded bg-zinc-800 animate-pulse" />

                    {/* PRICING */}

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />

                            <div className="flex items-center gap-3">
                                <div className="h-5 w-20 rounded bg-zinc-800 animate-pulse" />

                                <div className="h-9 w-36 rounded bg-zinc-800 animate-pulse" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />

                            <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
                        </div>

                        <div className="h-3 w-56 rounded bg-zinc-800 animate-pulse" />
                    </div>

                    {/* DESCRIPTION */}

                    <div className="space-y-2 pt-2">
                        <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                        <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
                    </div>

                    {/* STOCK */}

                    <div className="h-5 w-40 rounded bg-zinc-800 animate-pulse" />

                    {/* BUTTON */}

                    <div className="h-12 w-full rounded-lg bg-zinc-800 animate-pulse" />
                </div>
            </div>
        </main>
    );
}
