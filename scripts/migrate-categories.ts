import mongoose from "mongoose";
import { ProductModel } from "../models/Product.ts";
import { CategoryModel } from "../models/Category.ts";

const MONGO_URI = "";

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado a MongoDB");

    const products = await ProductModel.find();

    for (const product of products) {
        const newCategories: any[] = [];

        for (const c of product.categories || []) {
            //console.log(c);
            const cat = await CategoryModel.findOne({ slug: c.slug });
            //console.log("lo encontro");
            if (cat) {
                newCategories.push(cat._id);
            } else {
                console.log("⚠️ No encontrada:", c.id);
            }
        }

        if (newCategories.length > 0) {
            product.categories = newCategories;
            await product.save();
        }
    }

    console.log("✅ Migración completada");
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
