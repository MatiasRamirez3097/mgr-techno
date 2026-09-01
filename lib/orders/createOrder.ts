import mongoose from "mongoose";

import { InventoryItemModel, OrderModel } from "@/models";
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
            // 🔒 REGLAS DE ENVÍO (BACKEND SAFE)
            // =====================================
            // Evaluamos la regla basándonos en los productos REALES de la base de datos
            const hasFreeShippingItem = products.some((p) => p.hasFreeShipping);
            const nonFreeShippingProducts = products.filter(
                (p) => !p.hasFreeShipping,
            );

            let shippingModifier = 1; // 1 = 100% del costo

            if (hasFreeShippingItem) {
                if (nonFreeShippingProducts.length === 0) {
                    shippingModifier = 0; // Todo es gratis
                } else {
                    const hasBulky = nonFreeShippingProducts.some(
                        (p) => p.shippingSize === "bulky",
                    );
                    const allSmall = nonFreeShippingProducts.every(
                        (p) => p.shippingSize === "small",
                    );

                    if (hasBulky) {
                        shippingModifier = 1;
                    } else if (allSmall) {
                        shippingModifier = 0;
                    } else {
                        shippingModifier = 0.5; // 50% de descuento
                    }
                }
            }

            // Sanitizamos el costo base que nos mandó el Frontend
            let baseShippingCost = result.data.shippingMethod.cost;
            const methodId = result.data.shippingMethod.method;

            // Seguridad extra: Forzamos los precios fijos del backend para que no los falseen
            const LOCAL_SHIPPING_COST = 5000;

            if (methodId === "local_pickup") {
                baseShippingCost = 0;
            } else if (methodId === "local_shipping") {
                baseShippingCost = LOCAL_SHIPPING_COST;
            }
            // Si es Andreani/ViaCargo, por ahora confiamos en el costo base que mandó el front,
            // (Para blindarlo al 100%, deberías recotizar con la API de Andreani acá adentro).

            // COSTO FINAL SEGURO
            const finalShippingCost = baseShippingCost * shippingModifier;

            // Actualizamos el objeto result para que se guarde el costo con el descuento real en la DB
            result.data.shippingMethod.cost = finalShippingCost;

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

                const allocations = item.inventoryId
                    ? [
                          {
                              inventoryItemId: item.inventoryId,
                              quantity: item.quantity,
                          },
                      ]
                    : [];

                return {
                    productId: product.id,
                    inventoryId: item.inventoryId,
                    name: product.name,

                    quantity,

                    unitPrice,

                    subtotal,

                    taxRate,

                    taxAmount,

                    total,

                    allocations,
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

            // Sumamos el costo de envío validado y calculado en el servidor
            const total =
                orderItems.reduce((acc, item) => acc + item.total, 0) +
                finalShippingCost;
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

                if (item.allocations && item.allocations.length > 0) {
                    for (const allocation of item.allocations) {
                        await InventoryItemModel.findByIdAndUpdate(
                            allocation.inventoryItemId,
                            {
                                $inc: {
                                    remainingQuantity: -allocation.quantity,
                                },
                            },
                            { session },
                        );
                    }
                }
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
