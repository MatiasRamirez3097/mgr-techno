// /lib/products/getProductsBase.ts
import { BrandModel } from "@/models";
import { mapBrandToDTO } from "@/lib/mappers/brandMapper";
import { connectDB } from "@/lib/mongodb";
import type { BrandDTO } from "@/types/shared/brand";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getBrandsBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<BrandDTO[]> {
    await connectDB();

    const brands = await BrandModel.find({
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();
    return brands.map(mapBrandToDTO);
}
