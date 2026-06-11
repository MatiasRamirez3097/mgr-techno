import { ProductModel } from "@/models";

export async function updateProductStock(
    productId: string,
    availableDelta: number,
    reservedDelta: number,
    session: any,
) {
    await ProductModel.updateOne(
        { _id: productId },
        [
            {
                $set: {
                    availableStock: {
                        $add: ["$availableStock", availableDelta],
                    },
                    reservedStock: {
                        $add: ["$reservedStock", reservedDelta],
                    },
                },
            },
            {
                $set: {
                    isAvailable: {
                        $gt: ["$availableStock", 0],
                    },
                },
            },
        ],
        { session },
    );
}
