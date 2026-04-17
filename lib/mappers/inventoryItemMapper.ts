import { InventoryItemDB } from "@/types/backend/inventoryItem";
import { InventoryItemDTO } from "@/types/shared/inventoryItem";

export function mapInventoryItemToDTO(item: InventoryItemDB): InventoryItemDTO {
    return {
        id: item._id.toString(),
        serialNumber: item.serialNumber || undefined,
        status: item.status,
    };
}
