import Link from "next/link";
import { ComparatorCategoriesManager } from "@/components/admin/distributors/ComparatorCategoriesManager";
import { getComparatorCategories } from "@/services/distributors/categories/getComparatorCategories";
import { getDistributorCategoryOptions } from "@/services/distributors/categories/getDistributorCategoryOptions";

export default async function ComparatorCategoriesPage() {
    const [categories, options] = await Promise.all([
        getComparatorCategories(),
        getDistributorCategoryOptions(),
    ]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white">Categorías del comparador</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Qué categoría se consulta en cada distribuidor al filtrar el comparador.
                    </p>
                </div>
                <Link
                    href="/admin/comparator"
                    className="text-sm text-gray-400 hover:text-white underline"
                >
                    ← Volver al comparador
                </Link>
            </div>

            <ComparatorCategoriesManager initialCategories={categories} options={options} />
        </div>
    );
}
