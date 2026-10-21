import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsView } from "@/components/products/ProductsView";
import { ProductsLoading } from "@/components/products/ProductsLoading";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { extractAttributeFiltersFromSearchParams } from "@/services/products/extractAttributeFilters";
import { smartTitleCase } from "@/lib/utils/seoUtils";
import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import type { ProductOrderBy } from "@/types/shared/product";

interface Props {
    params: Promise<{
        category: string;
    }>;

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

async function getCategoryNameBySlug(slug: string): Promise<string> {
    try {
        await connectDB();
        const cat = await CategoryModel.findOne({ slug }).select("name").lean();
        if (cat && (cat as any).name) {
            return (cat as any).name;
        }
    } catch {
        // Fallback al formato derivado del slug
    }
    return smartTitleCase(slug.replace(/-/g, " "));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category } = await params;
    const categoryName = await getCategoryNameBySlug(category);
    const formattedTitle = smartTitleCase(categoryName);

    const description = `Comprá ${formattedTitle} al mejor precio en MGR Techno. Gran variedad de productos con garantía oficial, financiación en cuotas y envíos a toda Argentina.`;

    return {
        metadataBase: new URL("https://mgrtechno.com.ar"),
        title: formattedTitle,
        description,
        alternates: {
            canonical: `/productos/categoria/${category}`,
        },
        openGraph: {
            title: `${formattedTitle} | MGR Techno`,
            description,
            url: `https://mgrtechno.com.ar/productos/categoria/${category}`,
            siteName: "MGR Techno",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `${formattedTitle} | MGR Techno`,
            description,
        },
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { category } = await params;
    const categoryName = await getCategoryNameBySlug(category);
    const formattedCategoryName = smartTitleCase(categoryName);

    const resolvedSearchParams = await searchParams;

    const { limit, search, page, orderby, brand, isOutlet } =
        resolvedSearchParams;

    const attributeFilters =
        extractAttributeFiltersFromSearchParams(resolvedSearchParams);

    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: "Inicio", url: "https://mgrtechno.com.ar" },
                    { name: "Productos", url: "https://mgrtechno.com.ar/productos" },
                    {
                        name: formattedCategoryName,
                        url: `https://mgrtechno.com.ar/productos/categoria/${category}`,
                    },
                ]}
            />
            <Suspense key={suspenseKey} fallback={<ProductsLoading />}>
                <ProductsView
                    limit={limit}
                    category={category}
                    search={search}
                    page={page}
                    orderby={orderby}
                    brand={brand}
                    isOutlet={isOutlet}
                    attributeFilters={attributeFilters}
                />
            </Suspense>
        </>
    );
}
