import { Schema, model, models } from "mongoose";

// Categorías del comparador de distribuidores, editables desde /admin/comparator/categories.
// Cada una indica qué categoría consultar en cada mayorista.
const ComparatorCategorySchema = new Schema(
    {
        // Valor usado en la URL del comparador (?category=VIDEO)
        key: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },

        elit: {
            type: [
                {
                    _id: false,
                    paramType: {
                        type: String,
                        enum: ["categoria", "sub_categoria"],
                        required: true,
                    },
                    value: { type: String, required: true, trim: true },
                },
            ],
            default: [],
        },
        newbytes: { type: [String], default: [] },
        invid: { type: [String], default: [] },
    },
    { timestamps: true },
);

export const ComparatorCategoryModel =
    models.ComparatorCategory ||
    model(
        "ComparatorCategory",
        ComparatorCategorySchema,
        "comparator_categories",
    );
