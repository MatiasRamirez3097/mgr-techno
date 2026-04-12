export interface Product {
    id: string;
    name: string;
    price: number;
    regularPrice: number;
    listPrice: number;
    regularListPrice: number;
    priceNoTax: number;
    onSale: boolean;
    image: string;
    images: string[];
    stock: number;
    slug: string;
    shortDescription: string;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
}
