export type InventoryItemDTO = {
    id: string;
    serialNumber?: string;
    status: "available" | "reserved" | "sold" | "defective";
    unitCost?: number;
    quantity?: number;
    remainingQuantity?: number;
    purchaseId?: string;
    location?: string;
    defectDescription?: string;
};
