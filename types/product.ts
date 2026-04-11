export interface Product {
    id: string;
    name: string;
    price: number;
    regularPrice: number;
    onSale: boolean;
    image: string;
    images: string[];
    stock: number;
    slug: string;
    shortDescription: string;
}
