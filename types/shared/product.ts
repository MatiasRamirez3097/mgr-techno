export type ProductDTO = {
    id: string;
    categories: string[];
    image: string;
    images: string[];
    name: string;
    taxRate: number;
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
    status: "publish" | "draft" | "private";
    weight: number;
    dimensions: {
        height: number;
        length: number;
        width: number;
    };
    brand: string;
};

export type GetProductsResponse = {
    products: ProductDTO[];
    totalPages: number;
    total: number;
};

export type ProductFilters = {
    category?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    orderby?: ProductOrderBy;
    adminView?: boolean;
};

export type ProductOrderBy =
    | "newest"
    | "oldest"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "name-desc";
