import { connectDB } from "./mongodb";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";
import { Product } from "@/types/product";
import { SortOrder } from "mongoose";
import type { Category } from "@/types/category";

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

export async function getCategories(): Promise<Category[]> {
    await connectDB();
    const categories = await CategoryModel.find({
        slug: { $ne: "uncategorized" },
    })
        .sort({ name: 1 })
        .lean();
    return categories.map((c) => ({
        _id: c._id?.toString?.(),
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
        _id: c._id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        image: c.image || null,
    }));
}
