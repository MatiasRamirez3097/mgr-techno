export interface ProductFormState {
    brand: string;

    name: string;

    slug: string;

    sku: string;

    status: string;

    description: string;

    shortDescription: string;

    regularPrice: number;

    salePrice: number;

    hasSerialNumber: boolean;

    stockQuantity: string | number;

    manageStock: boolean;

    weight: number;

    length: number;

    width: number;

    height: number;

    categories: string[];

    taxRate: number;
}
