import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsView } from "@/components/products/ProductsView";
import { ProductsLoading } from "@/components/products/ProductsLoading";
import { extractAttributeFiltersFromSearchParams } from "@/services/products/extractAttributeFilters";

import type { ProductOrderBy } from "@/types/shared/product";

export const metadata: Metadata = {
    title: "Ofertas y Descuentos en Hardware",
    description:
        "Aprovechá las mejores ofertas en placas de video, procesadores, combos de actualización y periféricos gamer en MGR Techno con cuotas y envíos a todo el país.",
    alternates: {
        canonical: "/productos/ofertas",
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

export default async function SaleProductsPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams;
    const { limit, search, page, orderby, brand, isOutlet } =
        resolvedSearchParams;
    const attributeFilters =
        extractAttributeFiltersFromSearchParams(resolvedSearchParams);

    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <Suspense key={suspenseKey} fallback={<ProductsLoading />}>
            <ProductsView
                onSale
                limit={limit}
                search={search}
                page={page}
                orderby={orderby}
                brand={brand}
                isOutlet={isOutlet}
                attributeFilters={attributeFilters}
            />
        </Suspense>
    );
}
