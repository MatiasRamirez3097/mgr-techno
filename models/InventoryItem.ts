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
                    const product = await model("Product").findById(
                        this.productId,
                    );
                    if (product?.hasSerialNumber && !value) {
                        return false;
                    }
                    return true;
                },
                message:
                    "serialNumber es requerido para productos que lo necesitan",
            },
        },

        // ========================================
        // PRODUCTOS NO SERIALIZADOS (1 doc = lote)
        // ========================================
        quantity: {
            type: Number,
            min: 0,
            // Solo se usa si NO es serializado
        },

        remainingQuantity: {
            type: Number,
            min: 0,
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

        saleId: {
            type: Schema.Types.ObjectId,
            ref: "Sale",
            required: false,
            index: true,
        },

        location: {
            type: String,
            default: "main",
        },

        defectDescription: {
            type: String,
        },
    },
    { timestamps: true },
);

InventoryItemSchema.index({ productId: 1, status: 1 });
InventoryItemSchema.index({ productId: 1, serialNumber: 1 }); // Para búsquedas específicas
// VALIDACIONES
/*InventoryItemSchema.pre("save", async function (next) {
    const product = await model("Product").findById(this.productId);

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    // PRODUCTO SERIALIZADO: debe tener serial, NO debe tener quantity
    if (product.isSerialized) {
        if (!this.serialNumber) {
            throw new Error("Este producto requiere número de serie");
        }
        if (this.quantity) {
            throw new Error(
                "Productos serializados no usan quantity (es 1 unidad)",
            );
        }
    }

    // PRODUCTO NO SERIALIZADO: debe tener quantity, NO debe tener serial
    if (!product.isSerialized) {
        if (this.serialNumber) {
            throw new Error("Este producto no usa números de serie");
        }
        if (!this.quantity || this.quantity < 1) {
            throw new Error(
                "Debe especificar quantity para productos no serializados",
            );
        }
    }

    // Calcular garantía solo para serializados
    if (
        product.isSerialized &&
        product.warrantyMonths &&
        this.purchaseDate &&
        !this.warrantyExpirationDate
    ) {
        const expiration = new Date(this.purchaseDate);
        expiration.setMonth(expiration.getMonth() + product.warrantyMonths);
        this.warrantyExpirationDate = expiration;
    }

    next();
});*/

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

InventoryItemSchema.index({
    productId: 1,
    status: 1,
    createdAt: 1,
});

export const InventoryItemModel =
    models.InventoryItem || model("InventoryItem", InventoryItemSchema);
