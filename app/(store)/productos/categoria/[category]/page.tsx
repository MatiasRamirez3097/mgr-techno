import type { Metadata } from "next";

import { ProductsView } from "@/components/products/ProductsView";

import type { ProductOrderBy } from "@/types/shared/product";

import { Suspense } from "react";
import { ProductsLoading } from "@/components/products/ProductsLoading";

interface Props {
    params: Promise<{
        category: string;
    }>;

    searchParams: Promise<{
        limit?: string;
        search?: string;
        page?: string;
        orderby?: ProductOrderBy;
        brand?: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category } = await params;

    const categoryName = category.replace(/-/g, " ");

    return {
        title: `MGR Techno | ${categoryName}`,
        description: `Productos de la categoría ${categoryName}`,
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { category } = await params;

    const resolvedSearchParams = await searchParams;

    const { limit, search, page, orderby, brand } = resolvedSearchParams;

    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <Suspense key={suspenseKey} fallback={<ProductsLoading />}>
            <ProductsView
                limit={limit}
                category={category}
                search={search}
                page={page}
                orderby={orderby}
                brand={brand}
            />
        </Suspense>
    );
}
