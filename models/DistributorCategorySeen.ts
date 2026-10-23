import { Schema, model, models } from "mongoose";

// Categorías que aparecieron en los productos de un distribuidor sin API de categorías (Elit).
// Se usan como sugerencias en el formulario de mapeo del comparador.
const DistributorCategorySeenSchema = new Schema(
    {
        distributor: { type: String, required: true },
        paramType: { type: String, required: true },
        value: { type: String, required: true },
        lastSeenAt: { type: Date, required: true },
    },
    { timestamps: true },
);

DistributorCategorySeenSchema.index(
    { distributor: 1, paramType: 1, value: 1 },
    { unique: true },
);

export const DistributorCategorySeenModel =
    models.DistributorCategorySeen ||
    model(
        "DistributorCategorySeen",
        DistributorCategorySeenSchema,
        "distributor_categories_seen",
    );
