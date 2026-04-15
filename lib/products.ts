import { connectDB } from "./mongodb";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";
import { Product } from "@/types/product";
import { SortOrder } from "mongoose";
import type { Category } from "@/types/categories";

interface ProductFilters {
    category?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
}

const PAGE_SIZE = 16;

function mapMongoToProduct(p: any): Product {
    return {
        id: p.wooId.toString(),
        name: p.name,
        price: p.price,
        listPrice: p.listPrice,
        regularListPrice: p.regularListPrice,
        priceNoTax: p.priceNoTax,
        regularPrice: p.regularPrice,
        onSale: p.onSale,
        image: p.image || "",
        images: p.images || [],
        stock: p.stock,
        slug: p.slug,
        shortDescription: p.shortDescription || "",
        weight: p.weight || 0,
        dimensions: {
            length: p.dimensions?.length || 0,
            width: p.dimensions?.width || 0,
            height: p.dimensions?.height || 0,
        },
    };
}

const getMongoSort = (orderby?: string): Record<string, SortOrder> => {
    switch (orderby) {
        case "price":
            return { price: 1 };
        case "price-desc":
            return { price: -1 };
        case "name":
            return { name: 1 };
        case "popularity":
            return { salesCount: -1 };
        default:
            return { createdAt: -1 };
    }
};

export async function getProducts(filters: ProductFilters = {}): Promise<{
    products: Product[];
    totalPages: number;
    total: number;
}> {
    await connectDB();
    const page = filters.page || 1;
    const sort = getMongoSort(filters.orderby);

    // Construir query
    const query: any = { status: "publish" };

    if (filters.search) {
        query.$text = { $search: filters.search };
    }

    if (filters.category) {
        query["categories.slug"] = filters.category;
    }

    // Separamos en stock y sin stock
    const [inStock, outOfStock] = await Promise.all([
        ProductModel.find({ ...query, stockStatus: "instock" })
            .sort(sort)
            .lean(),
        ProductModel.find({ ...query, stockStatus: "outofstock" })
            .sort(sort)
            .lean(),
    ]);

    const all = [...inStock, ...outOfStock];

    // Filtro adicional por nombre si hay búsqueda (por si $text no está disponible)
    const filtered = filters.search
        ? all.filter((p) =>
              p.name.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : all;

    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const paginated = filtered.slice(start, start + PAGE_SIZE);

    return {
        products: paginated.map(mapMongoToProduct),
        totalPages,
        total,
    };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    await connectDB();
    const product = await ProductModel.findOne({
        slug,
        status: "publish",
    }).lean();
    if (!product) return null;
    return mapMongoToProduct(product);
}

export async function getOnSaleProducts(limit = 8): Promise<Product[]> {
    await connectDB();
    const products = await ProductModel.find({
        onSale: true,
        stockStatus: "instock",
        status: "publish",
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return products.map(mapMongoToProduct);
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
    await connectDB();
    const products = await ProductModel.find({
        stockStatus: "instock",
        status: "publish",
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return products.map(mapMongoToProduct);
}

// Esta función sigue usando Woo solo para traer parent e image de categorías
/*async function getWooCategories(): Promise<Category[]> {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=true`,
        { headers: WOO_HEADERS, next: { revalidate: 3600 } },
    );
    const data = (await res.json()) as any[];
    return data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent,
        image: c.image?.src || null,
    }));
}*/

export async function getCategories(): Promise<Category[]> {
    await connectDB();
    const categories = await CategoryModel.find({
        slug: { $ne: "uncategorized" },
    })
        .sort({ name: 1 })
        .lean();
    console.log(">>>>", categories);
    return categories.map((c) => ({
        id: c._id?.toString?.(),
        name: c.name,
        slug: c.slug,
        parentId: c.parentId?.toString?.() || null,
        image: c.image || null,
    }));
}

export async function getCategoriesWithImages(): Promise<Category[]> {
    await connectDB();
    const categories = await CategoryModel.find({
        slug: { $ne: "uncategorized" },
        parent: 0,
        count: { $gt: 0 },
    })
        .sort({ name: 1 })
        .lean();

    return categories.map((c) => ({
        id: c.wooId,
        name: c.name,
        slug: c.slug,
        parent: c.parent,
        image: c.image || null,
    }));
}
