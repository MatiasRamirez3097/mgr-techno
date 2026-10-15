"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface StatusOption {
    value: string;
    label: string;
}

const ORDER_STATUS_TABS: StatusOption[] = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "processing", label: "En proceso" },
    { value: "ready_for_pickup", label: "Listo para retiro" },
    { value: "shipped", label: "Enviados" },
    { value: "on_hold", label: "En espera" },
    { value: "completed", label: "Completados" },
    { value: "cancelled", label: "Cancelados" },
    { value: "refunded", label: "Reembolsados" },
    { value: "failed", label: "Fallidos" },
];

export function OrderStatusFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get("status") || "all";

    const handleSelectStatus = (statusValue: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (statusValue && statusValue !== "all") {
            params.set("status", statusValue);
        } else {
            params.delete("status");
        }
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800">
            {ORDER_STATUS_TABS.map((tab) => {
                const isActive = currentStatus === tab.value;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => handleSelectStatus(tab.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all border ${
                            isActive
                                ? "bg-brand text-white border-brand shadow-sm shadow-brand/20"
                                : "bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800 border-gray-800"
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
