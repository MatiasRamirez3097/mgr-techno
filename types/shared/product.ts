export type ProductDTO = {
    id: string;
    categories: string[];
    image: string;
    images: string[];
    name: string;
    listPrice: number;
    priceNoTax: number;
    regularListPrice: number;
    regularPrice: number;
    shortDescription: string;
    onSale: boolean;
    price: number;
    slug: string;
    stock: number;
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
};
