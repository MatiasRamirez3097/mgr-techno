import type { Metadata } from "next";

import { ProductsView } from "@/components/products/ProductsView";

import type { ProductOrderBy } from "@/types/shared/product";

export const metadata: Metadata = {
    title: "MGR Techno | Productos",
    description: "Catálogo completo de productos",
};

interface Props {
    searchParams: Promise<{
        search?: string;
        page?: string;
        orderby?: ProductOrderBy;
    }>;
}

export default async function ProductsPage({ searchParams }: Props) {
    const { search, page, orderby } = await searchParams;

    return <ProductsView search={search} page={page} orderby={orderby} />;
}
