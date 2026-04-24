import { Schema, model, models } from "mongoose";

export const InventoryItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            index: true,
            required: true,
        },
        serialNumber: {
            type: String,
            index: true,
            sparse: true,
            unique: true,
            validate: {
                validator: async function (value: string | undefined) {
                    // Si el producto requiere serial, debe tenerlo
                    const product = await mongoose
                        .model("Product")
                        .findById(this.productId);
                    if (product?.hasSerialNumber && !value) {
                        return false;
                    }
                    return true;
                },
                message:
                    "serialNumber es requerido para productos que lo necesitan",
            },
        },
        status: {
            type: String,
            enum: ["available", "reserved", "sold", "defective"],
            default: "available",
            index: true,
        },
        purchaseId: {
            type: Schema.Types.ObjectId,
            ref: "Purchase",
            required: false,
        },
        saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: false },
        location: {
            type: String,
            default: "main",
        },
    },
    { timestamps: true },
);

InventoryItemSchema.index({ productId: 1, status: 1 });
InventoryItemSchema.index({ productId: 1, serialNumber: 1 }); // Para búsquedas específicas
InventoryItemSchema.pre("save", async function (next) {
    // Verificar que el producto existe
    const product = await model("Product").findById(this.productId);
    if (!product) {
        throw new Error("Producto no encontrado");
    }

    // Si el producto tiene manageStock=false, no debería tener InventoryItems
    if (!product.manageStock) {
        throw new Error("Este producto no gestiona stock");
    }

    next();
});

// Marcar como vendido
InventoryItemSchema.methods.markAsSold = function (saleId: string) {
    this.status = "sold";
    this.saleId = saleId;
    return this.save();
};

// Reservar item
InventoryItemSchema.methods.reserve = function () {
    this.status = "reserved";
    return this.save();
};

export const InventoryItemModel =
    models.InventoryItem || model("InventoryItem", InventoryItemSchema);
