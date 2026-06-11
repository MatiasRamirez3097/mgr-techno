export type ProductDTO = {
    id: string;
    categories: string[];
    image: string;
    images: string[];
    name: string;
    taxRate: number | null;
    effectivePrice: number;
    regularPrice: number;
    salePrice: number | null;
    description: string;
    shortDescription: string;
    hasSerialNumber: boolean;
    availableStock: number | undefined;
    reservedStock: number | undefined;
    totalStock: number | undefined;
    slug: string;
    sku: string;
    mpn: string;
    gtin: string;
    status: "publish" | "draft" | "private" | "pending_review";
    weight: number;
    dimensions: {
        height: number;
        length: number;
        width: number;
    };
    brand: string;
    featured: boolean;
};

export type GetProductsResponse = {
    products: ProductDTO[];
    totalPages: number;
    total: number;
};

export type ProductFilters = {
    onSale?: boolean;
    category?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    perPage?: number;
    orderby?: ProductOrderBy;
    adminView?: boolean;
    status?: "publish" | "private" | "draft" | "pending_review";
};

export type ProductOrderBy =
    | "newest"
    | "oldest"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "name-desc";
