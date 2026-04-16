export type ProductDTO = {
    id: string;
    image: string;
    name: string;
    price: number;
    slug: string;
    stock: number;
};

export type GetProductsResponse = {
    products: ProductDTO[];
    totalPages: number;
    total: number;
};

export type ProductFilters {
    category?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
}
