import type { Types } from "mongoose";
import type {
    ComparatorCategoryDTO,
    ElitCategoryMapping,
} from "@/types/shared/comparatorCategory";

export interface ComparatorCategoryDocument {
    _id: Types.ObjectId | string;
    key: string;
    name: string;
    order?: number;
    active?: boolean;
    elit?: ElitCategoryMapping[];
    newbytes?: string[];
    invid?: string[];
    air?: string[];
}

export function mapComparatorCategoryToDTO(
    doc: ComparatorCategoryDocument,
): ComparatorCategoryDTO {
    return {
        id: doc._id.toString(),
        key: doc.key,
        name: doc.name,
        order: doc.order ?? 0,
        active: doc.active ?? true,
        elit: (doc.elit || []).map((e) => ({
            paramType: e.paramType,
            value: e.value,
        })),
        newbytes: doc.newbytes || [],
        invid: doc.invid || [],
        air: doc.air || [],
    };
}
