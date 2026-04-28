export type ProductDTO = {
    id: string;
    categories: string[];
    image: string;
    images: string[];
    name: string;
    taxRate: number;
    regularPrice: number;
    salePrice: number | null;
    shortDescription: string;
    hasSerialNumber: boolean;
    availableStock: number;
    onSale: boolean;
    slug: string;
    sku: string;
    status: "publish" | "draft" | "private";
    weight: number;
    dimensions: {
        height: number;
        length: number;
        width: number;
    };
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
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
    adminView?: boolean;
};
