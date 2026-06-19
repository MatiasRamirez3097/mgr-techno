import mongoose from "mongoose";

import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";

import { findProductsById } from "../products/getProductsById";

import { sendOrderConfirmationEmail } from "../email";

import { mapOrderToDTO } from "../mappers/orderMapper";

import { createOrderSchema } from "../validators/createOrderSchema";

import { notifyNewOrder } from "@/lib/notifications/discord/notifyNewOrder";
import { updateProductStock } from "../products/updateProductStock";

function getPaymentStatus(total: number, paidAmount: number) {
    if (paidAmount <= 0) {
        return "pending";
    }

    if (paidAmount < total) {
        return "partial";
    }

    return "paid";
}

export async function createOrder(data: unknown) {
    const result = createOrderSchema.safeParse(data);

    if (!result.success) {
        throw new Error("Invalid order data");
    }

    const { items, payments, source } = result.data;

    const session = await mongoose.startSession();

    let orderNum = "";

    let createdOrder: any = null;

    try {
        await session.withTransaction(async () => {
            // =====================================
            // PRODUCTS
            // =====================================

            const products = await findProductsById(
                items.map((i) => i.productId),
                session,
            );

            // =====================================
            // PAYMENT SURCHARGE
            // =====================================

            const hasMercadoPago = payments.some(
                (p) => p.method === "mercadopago",
            );

            const priceMultiplicator = hasMercadoPago ? 1.1 : 1;

            // =====================================
            // ORDER ITEMS
            // =====================================

            const orderItems = items.map((item) => {
                const product = products.find((p) => p.id === item.productId);

                if (!product) {
                    throw new Error("Producto no encontrado");
                }

                if (
                    product.availableStock &&
                    product.availableStock < item.quantity
                ) {
                    throw new Error(`Sin stock para ${product.name}`);
                }

                const unitPrice = product.effectivePrice * priceMultiplicator;

                const quantity = item.quantity;

                const subtotal = unitPrice * quantity;

                const taxRate = product.taxRate ?? 10.5;

                // unitPrice YA incluye IVA
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

            // =====================================
            // TOTALS
            // =====================================

            const subtotal = orderItems.reduce(
                (acc, item) => acc + item.subtotal,
                0,
            );

            const taxTotal = orderItems.reduce(
                (acc, item) => acc + item.taxAmount,
                0,
            );

            const total =
                orderItems.reduce((acc, item) => acc + item.total, 0) +
                result.data.shippingMethod.cost;

            // =====================================
            // PAYMENTS
            // =====================================

            const paidAmount = payments
                .filter((p) => p.status === "paid")
                .reduce((acc, payment) => acc + payment.amount, 0);

            const remainingAmount = total - paidAmount;

            const paymentStatus = getPaymentStatus(total, paidAmount);

            // =====================================
            // CREATE ORDER
            // =====================================

            const [order] = await OrderModel.create(
                [
                    {
                        ...result.data,

                        source,

                        items: orderItems,

                        subtotal,

                        taxTotal,

                        total,

                        paidAmount,

                        remainingAmount,

                        paymentStatus,

                        status: "pending",
                    },
                ],
                { session },
            );

            createdOrder = order;

            // =====================================
            // RESERVE STOCK
            // =====================================

            for (const item of orderItems) {
                await updateProductStock(
                    item.productId,
                    -item.quantity,
                    item.quantity,
                    session,
                );
            }

            // =====================================
            // ORDER NUMBER
            // =====================================

            //orderNum = order._id.toString().slice(-6).toUpperCase();
            orderNum = order._id.toString();
        });

        // =====================================
        // EMAIL
        // =====================================

        await sendOrderConfirmationEmail(mapOrderToDTO(createdOrder));

        // =====================================
        // DISCORD
        // =====================================

        notifyNewOrder(createdOrder).catch((err) => {
            console.error("Discord notification failed", err);
        });

        return {
            success: true,
            order: orderNum,
        };
    } catch (error) {
        throw error;
    } finally {
        await session.endSession();
    }
}
