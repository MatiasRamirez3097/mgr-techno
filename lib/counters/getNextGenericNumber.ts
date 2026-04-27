import { CounterModel } from "@/models/Counter";

export async function getNextGenericNumber() {
    const counter = await CounterModel.findOneAndUpdate(
        { _id: "purchase_generic" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
    );

    return `CMP-${String(counter.seq).padStart(8, "0")}`;
}
