export const revalidate = 3600;

import type { Metadata } from "next";

import { ProductsView } from "@/components/products/ProductsView";

import type { ProductOrderBy } from "@/types/shared/product";

export const metadata: Metadata = {
    title: "MGR Techno | Productos",
    description: "Catálogo completo de productos",
};

interface Props {
    searchParams: Promise<{
        limit?: string;
        search?: string;
        page?: string;
        orderby?: ProductOrderBy;
        brand?: string;
    }>;
}

export default async function ProductsPage({ searchParams }: Props) {
    const { limit, search, page, orderby, brand } = await searchParams;

    return (
        <ProductsView
            search={search}
            page={page}
            orderby={orderby}
            limit={limit}
            brand={brand}
        />
    );
}
