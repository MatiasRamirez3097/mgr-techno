import mongoose from "mongoose";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { findProductsById } from "../products/getProductsById";
import { getCustomersIdByEmail } from "../customers/getCustomersIdByEmail";
import { sendOrderConfirmationEmail } from "../email";
import { mapOrderToDTO } from "../mappers/orderMapper";
import { createOrderSchema } from "../validators/createOrderSchema";

export async function createOrder(data: unknown) {
    const result = createOrderSchema.safeParse(data);

    if (!result.success) {
        return result;
    }

    const { items, paymentMethod } = result.data;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Traer productos

        const priceMultiplicator = paymentMethod === "mercadopago" ? 1.1 : 1;
        //GET PRODUCTS
        const products = await findProductsById(
            items.map((i: any) => i.productId),
            session,
        );
        const orderItems = items.map((item) => {
            const product = products.find((p) => p.id === item.productId);

            if (!product) throw new Error("Producto no encontrado");

            if (
                product.availableStock &&
                product.availableStock < item.quantity
            ) {
                throw new Error(`Sin stock para ${product.name}`);
            }
            const unitPrice = product.regularPrice * priceMultiplicator;

            const quantity = item.quantity;

            const subtotal = unitPrice * quantity;

            const taxRate = product.taxRate ?? 10.5;

            const taxAmount = subtotal - subtotal / (1 + taxRate / 100);

            const total = subtotal;

            return {
                productId: product.id,
                name: product.name,

                quantity,

                unitPrice,
                subtotal,

                taxRate,
                taxAmount,

                total,
            };
        });
        // 4. Totales
        const subtotal = orderItems.reduce((acc, i) => acc + i.subtotal, 0);
        const total = orderItems.reduce((acc, i) => acc + i.total, 0);

        // 5. Crear order
        const order = await OrderModel.create(
            [
                {
                    ...result.data,
                    items: orderItems,
                    subtotal,
                    total,
                    status: "pending",
                },
            ],
            { session },
        );

        // 6. (Opcional) reservar stock
        // 👇 simple version
        for (const item of orderItems) {
            await ProductModel.updateOne(
                { _id: item.productId },
                {
                    $inc: {
                        availableStock: -item.quantity,
                        reservedStock: item.quantity,
                    },
                },
                { session },
            );
        }

        await session.commitTransaction();
        await sendOrderConfirmationEmail(mapOrderToDTO(order[0]));
        return order[0]._id.toString().slice(-6).toUpperCase();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
