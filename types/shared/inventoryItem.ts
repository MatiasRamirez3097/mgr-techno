export type InventoryItemDTO = {
    id: string;
    serialNumber?: string;
    status: "available" | "reserved" | "sold" | "defective";
};
