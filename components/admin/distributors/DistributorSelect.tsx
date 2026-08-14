"use client";

import { useRouter, useSearchParams } from "next/navigation";

const DISTRIBUTORS = [
    { id: "elit", label: "Elit", color: "blue" },
    { id: "newbytes", label: "NewBytes", color: "emerald" },
    { id: "invid", label: "INVID", color: "purple" },
];

export const DistributorSelect = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Si no hay parámetro, por defecto están todos habilitados
    const currentDistributorsParam = searchParams.get("distributors");
    const activeDistributors = currentDistributorsParam
        ? currentDistributorsParam.split(",")
        : DISTRIBUTORS.map((d) => d.id);

    const toggleDistributor = (distId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        let newActive: string[];

        if (activeDistributors.includes(distId)) {
            // Lo apagamos (lo sacamos del array)
            newActive = activeDistributors.filter((id) => id !== distId);
        } else {
            // Lo prendemos (lo agregamos al array)
            newActive = [...activeDistributors, distId];
        }

        // Evitamos que desactive TODOS (siempre debe haber al menos uno)
        if (newActive.length === 0) return;

        // Actualizamos la URL
        params.set("distributors", newActive.join(","));
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-1">Sources:</span>
            {DISTRIBUTORS.map((dist) => {
                const isActive = activeDistributors.includes(dist.id);

                // Colores dinámicos según el estado
                const baseClasses =
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer";
                const activeClasses =
                    dist.color === "blue"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30"
                        : dist.color === "emerald"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
                          : "bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30";
                const inactiveClasses =
                    "bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700";

                return (
                    <button
                        key={dist.id}
                        onClick={() => toggleDistributor(dist.id)}
                        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                    >
                        {dist.label}
                    </button>
                );
            })}
        </div>
    );
};
