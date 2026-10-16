import type { BundleItemDTO, ProductAttributeDTO } from "@/types/shared/product";

export interface ProductFormState {
    type: "simple" | "bundle";

    bundleItems: BundleItemDTO[];

    attributes: ProductAttributeDTO[];

    brand: string;

    name: string;

    sku: string;

    mpn: string;

    gtin: string;

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

    hasFreeShipping: boolean;
    shippingSize: string;
}
