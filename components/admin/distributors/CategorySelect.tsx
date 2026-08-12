"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
    { value: "", label: "Todas las categorías" },
    { value: "ACCESORIOS", label: "Accesorios" },
    { value: "CONECTIVIDAD", label: "Conectividad" },
    { value: "ALMACENAMIENTO", label: "Almacenamiento" },
    { value: "GABINETES", label: "Gabinetes" },
    { value: "MEMORIAS", label: "Memorias" },
    { value: "MOTHERBOARDS", label: "Motherboards" },
    { value: "PROCESADORES", label: "Procesadores" },
    { value: "VIDEO", label: "Placas de Video" },
];

export const CategorySelect = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get current category from URL, default to empty string
    const currentCategory = searchParams.get("category") || "";

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCategory = e.target.value;
        const params = new URLSearchParams(searchParams.toString());

        if (selectedCategory) {
            params.set("category", selectedCategory);
        } else {
            params.delete("category");
        }

        // Update URL without full page reload
        router.push(`?${params.toString()}`);
    };

    return (
        <select
            value={currentCategory}
            onChange={handleCategoryChange}
            className="
                bg-gray-800 
                border border-gray-700 
                text-white 
                text-sm 
                rounded-xl 
                focus:ring-brand focus:border-brand 
                block 
                w-full 
                sm:w-48 
                p-2.5
                outline-none
                cursor-pointer
            "
        >
            {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                    {cat.label}
                </option>
            ))}
        </select>
    );
};
