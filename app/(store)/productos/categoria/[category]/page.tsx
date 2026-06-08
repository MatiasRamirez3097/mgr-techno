import type { Metadata } from "next";

import { ProductsView } from "@/components/products/ProductsView";

import type { ProductOrderBy } from "@/types/shared/product";

interface Props {
    params: Promise<{
        category: string;
    }>;

    searchParams: Promise<{
        search?: string;
        page?: string;
        orderby?: ProductOrderBy;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category } = await params;

    const categoryName = category.replace(/-/g, " ");

    return {
        title: `${categoryName} | MGR Techno`,
        description: `Productos de la categoría ${categoryName}`,
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { category } = await params;

    const { search, page, orderby } = await searchParams;

    return (
        <ProductsView
            category={category}
            search={search}
            page={page}
            orderby={orderby}
        />
    );
}
