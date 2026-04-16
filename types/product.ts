import type { Category } from "./category";

export interface Product {
    _id: string;
    name: string;
    price: number;
    regularPrice: number;
    regularListPrice: number;
    listPrice: number;
    priceNoTax: number;
    onSale: boolean;
    image: string;
    images: string[];
    stock: number;
    slug: string;
    categories: Category[];
    description: string;
    shortDescription: string;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    status: string;
    salePrice: number;
    featured: boolean;
}
