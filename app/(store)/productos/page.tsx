export const revalidate = 3600;

import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsView } from "@/components/products/ProductsView";
import { ProductsLoading } from "@/components/products/ProductsLoading";
import { extractAttributeFiltersFromSearchParams } from "@/services/products/extractAttributeFilters";

import type { ProductOrderBy } from "@/types/shared/product";

export const metadata: Metadata = {
    title: "Catálogo de Productos y Hardware",
    description:
        "Explorá nuestro catálogo completo de placas de video, procesadores, memorias RAM, fuentes, gabinetes y periféricos en MGR Techno. Filtrá por marca, categoría y especificaciones.",
    alternates: {
        canonical: "/productos",
    },
};

interface Props {
    searchParams: Promise<
        Record<string, string | string[] | undefined> & {
            limit?: string;
            search?: string;
            page?: string;
            orderby?: ProductOrderBy;
            brand?: string;
            isOutlet?: string;
        }
    >;
}

export default async function ProductsPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams;
    const { limit, search, page, orderby, brand, isOutlet } =
        resolvedSearchParams;
    const attributeFilters =
        extractAttributeFiltersFromSearchParams(resolvedSearchParams);

    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <Suspense key={suspenseKey} fallback={<ProductsLoading />}>
            <ProductsView
                search={search}
                page={page}
                orderby={orderby}
                limit={limit}
                brand={brand}
                isOutlet={isOutlet}
                attributeFilters={attributeFilters}
            />
        </Suspense>
    );
}
