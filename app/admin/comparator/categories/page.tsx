import { ComparatorCategoriesManager } from "@/components/admin/distributors/ComparatorCategoriesManager";
import { getComparatorCategories } from "@/services/distributors/categories/getComparatorCategories";
import { getDistributorCategoryOptions } from "@/services/distributors/categories/getDistributorCategoryOptions";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default async function ComparatorCategoriesPage() {
    const [categories, options] = await Promise.all([
        getComparatorCategories(),
        getDistributorCategoryOptions(),
    ]);

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/comparator", label: "Comparador" }}
                title="Categorías del comparador"
                description="Qué categoría se consulta en cada distribuidor al filtrar el comparador."
            />

            <ComparatorCategoriesManager initialCategories={categories} options={options} />
        </div>
    );
}
