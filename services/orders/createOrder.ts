import mongoose from "mongoose";

import { InventoryItemModel, OrderModel } from "@/models";
import type { OrderDB } from "@/types/backend/order";

import { findProductsById } from "../products/getProductsById";

import { sendOrderConfirmationEmail } from "@/lib/email";

import { mapOrderToDTO } from "@/lib/mappers/orderMapper";

import { createOrderSchema } from "@/lib/validators/createOrderSchema";

import { notifyNewOrder } from "@/lib/notifications/discord/notifyNewOrder";
import { updateProductStock } from "../products/updateProductStock";
import { buildOrderBundleComponentsMap } from "../products/recalculateBundlesStock";
import { getStoreSettings } from "../settings/getStoreSettings";
import {
    computePaymentStatus,
    sumPaidPayments,
} from "./recalculateOrderPaymentStatus";
import { applyPaymentSurcharge } from "@/lib/pricing";
import {
    getShippingModifier,
    LOCAL_SHIPPING_COST,
} from "@/lib/shipping/shippingRules";

export async function createOrder(data: unknown) {
    const result = createOrderSchema.safeParse(data);

    if (!result.success) {
        throw new Error("Invalid order data");
    }

    const { items, payments, source } = result.data;

    const { mercadoPagoSurchargePercent } = await getStoreSettings();

    const session = await mongoose.startSession();

    let orderNum = "";
    let orderTotal = 0;

    let createdOrder: OrderDB | null = null;

    try {
        await session.withTransaction(async () => {
            // =====================================
            // PRODUCTS
            // =====================================

            const products = await findProductsById(
                items.map((i) => i.productId),
                session,
            );

            const bundleComponentsMap = await buildOrderBundleComponentsMap(
                products,
                session,
            );

            // =====================================
            // 🔒 REGLAS DE ENVÍO (BACKEND SAFE)
            // =====================================
            // Evaluamos la regla basándonos en los productos REALES de la base de datos
            const { modifier: shippingModifier } =
                getShippingModifier(products);

            let baseShippingCost = result.data.shippingMethod.cost;
            const methodId = result.data.shippingMethod.method;

            // Forzamos los precios fijos del backend para que no los falseen.
            // Andreani/Vía Cargo llegan ya recotizados en el servidor (app/api/checkout).
            if (methodId === "local_pickup") {
                baseShippingCost = 0;
            } else if (methodId === "local_shipping") {
                baseShippingCost = LOCAL_SHIPPING_COST;
            }

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


            // =====================================
            // ORDER ITEMS
            // =====================================

            const orderItems = items.map((item) => {
                const product = products.find((p) => p.id === item.productId);

                if (!product) {
                    throw new Error("Producto no encontrado");
                }

                if (product.status !== "publish") {
                    throw new Error(
                        `El producto ${product.name} no está disponible para la venta`,
                    );
                }

                if (
                    product.availableStock == null ||
                    product.availableStock < item.quantity
                ) {
                    throw new Error(`Sin stock para ${product.name}`);
                }

                // Misma función que usa el checkout para mostrar el precio
                const unitPrice = hasMercadoPago
                    ? applyPaymentSurcharge(
                          product.effectivePrice,
                          mercadoPagoSurchargePercent,
                      )
                    : product.effectivePrice;

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

                const isBundle = (product as any).type === "bundle";
                const rawComps = isBundle
                    ? bundleComponentsMap.get(product.id.toString()) || []
                    : [];
                const bundleComponents = rawComps.map((c) => ({
                    productId: c.productId,
                    name: c.name,
                    quantityPerBundle: c.quantityPerBundle,
                    totalQuantity: c.quantityPerBundle * quantity,
                }));

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

                    isBundle,
                    bundleComponents,

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

            // Para pedidos de ecommerce, ningún pago puede crearse como pagado,
            // y el monto del pago único es el total calculado en el servidor
            const sanitizedPayments =
                source === "ecommerce"
                    ? payments.map((p) => ({
                          ...p,
                          status: "pending" as const,
                          amount: payments.length === 1 ? total : p.amount,
                      }))
                    : payments;

            const paidAmount = sumPaidPayments(sanitizedPayments);

            const remainingAmount = total - paidAmount;

            const paymentStatus = computePaymentStatus(total, paidAmount);

            // =====================================
            // CREATE ORDER
            // =====================================

            const [order] = await OrderModel.create(
                [
                    {
                        ...result.data,

                        source,

                        payments: sanitizedPayments,

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
            orderTotal = order.total;
        });

        if (!createdOrder) {
            throw new Error("No se pudo crear la orden");
        }

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
            total: orderTotal,
        };
    } catch (error) {
        throw error;
    } finally {
        await session.endSession();
    }
}
