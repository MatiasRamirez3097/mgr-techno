export type ProductInput = {
    name: string;
    slug: string;
    status: "publish" | "draft" | "private";

    description?: string;
    shortDescription?: string;

    regularPrice: string;
    salePrice?: string;

    manageStock: boolean;
    stockQuantity?: number;

    weight?: string;
    dimensions?: {
        length?: string;
        width?: string;
        height?: string;
    };

    categories: string[];

    images: { src: string }[] | string[];

    featured?: boolean;
};
