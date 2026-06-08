import type { Metadata } from "next";

import { ProductsView } from "@/components/products/ProductsView";

import type { ProductOrderBy } from "@/types/shared/product";

export const metadata: Metadata = {
    title: "Productos en oferta | MGR Techno",
    description: "Encontrá los mejores productos en oferta de MGR Techno.",
};

interface Props {
    searchParams: Promise<{
        search?: string;
        page?: string;
        orderby?: ProductOrderBy;
    }>;
}

export default async function SaleProductsPage({ searchParams }: Props) {
    const { search, page, orderby } = await searchParams;

    return (
        <ProductsView onSale search={search} page={page} orderby={orderby} />
    );
}
