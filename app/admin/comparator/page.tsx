import { AdminSearch } from "@/components/admin/AdminSearch";
import { CategorySelect } from "@/components/admin/distributors/CategorySelect";
import { DistributorSelect } from "@/components/admin/distributors/DistributorSelect";
import { DistributorsTable } from "@/components/admin/distributors/DistributorsTable";
import { DistributorSyncStatus } from "@/components/admin/distributors/DistributorSyncStatus";
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";
import { getInvidSyncStatus } from "@/services/distributors/invid/getInvidSyncStatus";
import { getInvidCategories } from "@/services/distributors/invid/getInvidCategories";
import { getAirSyncStatus } from "@/services/distributors/air/getAirSyncStatus";
import { getAirCategories } from "@/services/distributors/air/getAirCategories";
import { getPcmoddSyncStatus } from "@/services/distributors/pcmodd/getPcmoddSyncStatus";
import { getPcmoddCategories } from "@/services/distributors/pcmodd/getPcmoddCategories";
import { isPcmoddConfigured } from "@/services/distributors/pcmodd/syncPcmoddCatalog";
import { getComparatorCategories } from "@/services/distributors/categories/getComparatorCategories";
import { getLinksForDistributorItems } from "@/services/distributors/links/getLinksForDistributorItems";
import { AutoLinkButton } from "@/components/admin/distributors/AutoLinkButton";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { FiltersDrawer } from "@/components/admin/ui/FiltersDrawer";
import { buttonClass } from "@/components/admin/ui/styles";

// Si el catálogo de Invid quedó viejo se sincroniza con `after` al terminar el render
export const maxDuration = 300;

interface Props {
    searchParams: Promise<{
        search?: string;
        category?: string;
        distributors?: string;
        page?: string;
    }>;
}

export default async function AdminDistributorsPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = params.search || "";
    // 1. Extract category from URL
    const category = params.category || "";

    const enabledDistributors = params.distributors
        ? params.distributors.split(",")
        : ["elit", "newbytes", "invid", "air", "pcmodd"];

    // Pasamos el array de distribuidores habilitados
    const [products, invidStatus, airStatus, pcmoddStatus, categories] = await Promise.all([
        getDistributorProducts(search, category, enabledDistributors),
        enabledDistributors.includes("invid")
            ? Promise.all([getInvidSyncStatus(), getInvidCategories()]).catch((e) => {
                  console.error("Error obteniendo el estado de Invid:", e);
                  return null;
              })
            : null,
        enabledDistributors.includes("air")
            ? Promise.all([getAirSyncStatus(), getAirCategories()]).catch((e) => {
                  console.error("Error obteniendo el estado de AIR:", e);
                  return null;
              })
            : null,
        enabledDistributors.includes("pcmodd") && isPcmoddConfigured()
            ? Promise.all([getPcmoddSyncStatus(), getPcmoddCategories()]).catch((e) => {
                  console.error("Error obteniendo el estado de PCMODD:", e);
                  return null;
              })
            : null,
        getComparatorCategories({ activeOnly: true }),
    ]);

    const linkedProducts = await getLinksForDistributorItems(products).catch((e) => {
        console.error("Error obteniendo vínculos de distribuidores:", e);
        return {};
    });

    return (
        <div>
            <AdminPageHeader
                title="Precios de distribuidores"
                className="!mb-4"
                actions={
                    <>
                        <Link href="/admin/comparator/pricing" className={buttonClass.secondary}>
                            Revisión de precios
                        </Link>
                        <Link href="/admin/comparator/categories" className={buttonClass.ghost}>
                            Configurar categorías
                        </Link>
                        <AutoLinkButton />
                    </>
                }
            />

            <FiltersDrawer
                className="mb-6"
                activeCount={[params.category, params.distributors, params.search].filter(Boolean).length}
            >
                <AdminSearch placeholder="Buscar por nombre, SKU..." />
                <DistributorSelect />
                <CategorySelect categories={categories.map((c) => ({ value: c.key, label: c.name }))} />
            </FiltersDrawer>

            {invidStatus && (
                <DistributorSyncStatus
                    label="INVID"
                    syncUrl="/api/admin/distributors/invid/sync"
                    theme="purple"
                    rateLimitMax={50}
                    status={invidStatus[0]}
                    categories={invidStatus[1]}
                />
            )}
            {airStatus && (
                <DistributorSyncStatus
                    label="AIR"
                    theme="orange"
                    staleAfterHours={6}
                    staleHint="La lista la sube la tarea programada de la PC (tools/air-upload): revisá que esté corriendo."
                    status={airStatus[0]}
                    categories={airStatus[1]}
                />
            )}
            {pcmoddStatus && (
                <DistributorSyncStatus
                    label="PCMODD"
                    theme="pink"
                    staleAfterHours={3}
                    staleHint="La hoja se lee cada hora con el cron de Invid: revisá que siga siendo pública y que PCMODD_SHEET_URL esté bien."
                    status={pcmoddStatus[0]}
                    categories={pcmoddStatus[1]}
                />
            )}

            {/* TABLE */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <DistributorsTable products={products} search={search} linkedProducts={linkedProducts} />
            </div>
        </div>
    );
}
