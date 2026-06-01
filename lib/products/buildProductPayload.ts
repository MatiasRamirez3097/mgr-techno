import type { ProductFormState } from "@/types/admin/productForm";

interface Params {
    form: ProductFormState;
    image: string;
    images: string[];
}

export function buildProductPayload({ form, image, images }: Params) {
    return {
        name: form.name,
        sku: form.sku,
        brand: form.brand,
        status: form.status,

        description: form.description,
        shortDescription: form.shortDescription,

        regularPrice: Number(form.regularPrice) || 0,

        salePrice:
            Number(form.salePrice) > 0 ? Number(form.salePrice) : undefined,

        hasSerialNumber: form.manageStock ? form.hasSerialNumber : false,

        manageStock: form.manageStock,

        weight: Number(form.weight) || undefined,

        dimensions: {
            length: Number(form.length) || undefined,
            width: Number(form.width) || undefined,
            height: Number(form.height) || undefined,
        },

        categories: form.categories,

        image: image || undefined,

        images,

        taxRate: Number(form.taxRate),
    };
}
