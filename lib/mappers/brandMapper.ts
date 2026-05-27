// /lib/mappers/productMapper.ts

import { BrandDB } from "@/types/backend/brand";
import { BrandDTO } from "@/types/shared/brand";

export function mapBrandToDTO(brand: BrandDB): BrandDTO {
    return {
        id: brand._id.toString(),
        logo: brand.logo || "",
        name: brand.name,
        description: brand.description || "",
        isActive: brand.isActive,
        slug: brand.slug,
    };
}
