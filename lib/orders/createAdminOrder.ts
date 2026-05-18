import mongoose from "mongoose";

import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";

import { findProductsById } from "../products/getProductsById";

import { createAdminOrderSchema } from "../validators/createAdminOrderSchema";

export async function createAdminOrder(data: unknown) {
    const result = createAdminOrderSchema.safeParse(data);

    if (!result.success) {
        throw new Error(result.error.message);
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const {
            customerId,
            customerEmail,
            items,
            payments,
            shippingMethod,
            document,
            notes,
            status,
        } = result.data;

        // productos
        const products = await findProductsById(
            items.map((i) => i.productId),
            session,
        );

        const orderItems = items.map((item) => {
            const product = products.find((p) => p.id === item.productId);

            if (!product) {
                throw new Error("Producto no encontrado");
            }

            const quantity = Number(item.quantity);

            const unitPrice = Number(item.unitPrice);

            const subtotal = quantity * unitPrice;

            const taxRate = item.taxRate ?? 21;

            const taxAmount = subtotal - subtotal / (1 + taxRate / 100);

            return {
                productId: product.id,
                name: product.name,

                quantity,

                unitPrice,

                subtotal,

                taxRate,
                taxAmount,

                total: subtotal,
            };
        });

        const subtotal = orderItems.reduce(
            (acc, item) => acc + item.subtotal,
            0,
        );

        const shippingCost = shippingMethod?.cost || 0;

        const total = subtotal + shippingCost;

        // payment status automático
        const paidAmount = payments
            .filter((p) => p.status === "paid")
            .reduce((acc, p) => acc + p.amount, 0);

        let paymentStatus: "pending" | "partial" | "paid" = "pending";

        if (paidAmount > 0 && paidAmount < total) {
            paymentStatus = "partial";
        }

        if (paidAmount >= total) {
            paymentStatus = "paid";
        }

        // crear orden
        const [order] = await OrderModel.create(
            [
                {
                    source: "admin",

                    customerId,
                    customerEmail,
                    items: orderItems,

                    payments,

                    shippingMethod,

                    document,

                    notes,

                    status,

                    paymentStatus,

                    subtotal,
                    shippingCost,
                    total,
                },
            ],
            { session },
        );

        // reservar stock SOLO si no está cancelada
        if (status !== "cancelled") {
            for (const item of orderItems) {
                await ProductModel.updateOne(
                    {
                        _id: item.productId,
                    },
                    {
                        $inc: {
                            availableStock: -item.quantity,
                            reservedStock: item.quantity,
                        },
                    },
                    { session },
                );
            }
        }

        await session.commitTransaction();

        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
