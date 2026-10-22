import mongoose, { type ClientSession } from "mongoose";

import { OrderModel } from "@/models/Order";
import { findProductsById } from "../products/getProductsById";
import { createAdminOrderSchema } from "@/lib/validators/createAdminOrderSchema";
import { updateProductStock } from "../products/updateProductStock";
import { buildOrderBundleComponentsMap } from "../products/recalculateBundlesStock";
import { ensureCustomPcProduct } from "../products/ensureCustomPcProduct";
import {
    computePaymentStatus,
    sumPaidPayments,
} from "./recalculateOrderPaymentStatus";
import { parseOrderDate } from "@/lib/utils/orderDate";

// IVA de ventas por defecto (mismo criterio que createOrder y OrderItem)
const DEFAULT_TAX_RATE = 10.5;

type CreateAdminOrderOptions = {
    // Se ejecuta dentro de la transacción, antes del commit
    afterCreate?: (
        order: { _id: mongoose.Types.ObjectId },
        session: ClientSession,
    ) => Promise<void>;
};

export async function createAdminOrder(
    data: unknown,
    options: CreateAdminOrderOptions = {},
) {
    const result = createAdminOrderSchema.safeParse(data);

    if (!result.success) {
        throw new Error(result.error.message);
    }

    // Undefined = hoy (Mongoose completa createdAt con la hora actual)
    const createdAt = parseOrderDate(result.data.orderDate);

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const {
            billing,
            customerId,
            customerEmail,
            items,
            payments,
            shippingMethod,
            notes,
            status,
        } = result.data;

        const hasCustomPc = items.some((i) => i.isCustomPc);
        const customPcSystemProduct = hasCustomPc
            ? await ensureCustomPcProduct(session)
            : null;

        // Recolectamos todos los IDs de productos (tanto directos como componentes de PC Armada)
        const allProductIds = new Set<string>();
        for (const item of items) {
            if (item.isCustomPc) {
                for (const comp of item.customComponents || []) {
                    if (comp.productId) allProductIds.add(comp.productId);
                }
            } else if (item.productId) {
                allProductIds.add(item.productId);
            }
        }

        const products = await findProductsById(
            Array.from(allProductIds),
            session,
        );

        const bundleComponentsMap = await buildOrderBundleComponentsMap(
            products,
            session,
        );

        const orderItems = items.map((item) => {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            const subtotal = quantity * unitPrice;

            if (item.isCustomPc) {
                const taxRate = item.taxRate ?? DEFAULT_TAX_RATE;
                const taxAmount = subtotal - subtotal / (1 + taxRate / 100);

                if (!customPcSystemProduct) {
                    throw new Error(
                        "No se pudo inicializar el producto base de PC Armada",
                    );
                }

                // Consolidar componentes repetidos si el usuario agregó el mismo componente dos veces en la misma PC
                const mergedMap = new Map<
                    string,
                    { productId: string; name: string; quantityPerBundle: number }
                >();

                for (const compInput of item.customComponents || []) {
                    const compProduct = products.find(
                        (p) => p.id.toString() === compInput.productId,
                    );
                    if (!compProduct) {
                        throw new Error(
                            `Componente no encontrado para la PC Armada (${compInput.name || compInput.productId})`,
                        );
                    }
                    if ((compProduct as any).type === "bundle") {
                        throw new Error(
                            `No se puede incluir un combo ("${compProduct.name}") como componente de una PC Armada.`,
                        );
                    }

                    const compIdStr = compProduct.id.toString();
                    const qtyPerPc = Math.max(
                        1,
                        Math.floor(Number(compInput.quantity) || 1),
                    );
                    const existing = mergedMap.get(compIdStr);
                    if (existing) {
                        existing.quantityPerBundle += qtyPerPc;
                    } else {
                        mergedMap.set(compIdStr, {
                            productId: compIdStr,
                            name: compProduct.name,
                            quantityPerBundle: qtyPerPc,
                        });
                    }
                }

                const bundleComponents = Array.from(mergedMap.values()).map(
                    (c) => ({
                        productId: c.productId,
                        name: c.name,
                        quantityPerBundle: c.quantityPerBundle,
                        totalQuantity: c.quantityPerBundle * quantity,
                    }),
                );

                return {
                    productId: customPcSystemProduct._id.toString(),
                    name: item.name?.trim() || "PC Armada",
                    quantity,
                    unitPrice,
                    subtotal,
                    taxRate,
                    taxAmount,
                    total: subtotal,
                    isBundle: true,
                    bundleComponents,
                };
            }

            const product = products.find((p) => p.id === item.productId);

            if (!product) {
                throw new Error("Producto no encontrado");
            }

            const taxRate =
                item.taxRate ?? product.taxRate ?? DEFAULT_TAX_RATE;
            const taxAmount = subtotal - subtotal / (1 + taxRate / 100);

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
                name: product.name,
                quantity,
                unitPrice,
                subtotal,
                taxRate,
                taxAmount,
                total: subtotal,
                isBundle,
                bundleComponents,
            };
        });

        const subtotal = orderItems.reduce(
            (acc, item) => acc + item.subtotal,
            0,
        );

        const taxTotal = orderItems.reduce(
            (acc, item) => acc + item.taxAmount,
            0,
        );

        const shippingCost = shippingMethod?.cost || 0;

        const total = subtotal + shippingCost;

        // payment status automático
        const paidAmount = sumPaidPayments(payments);
        const paymentStatus = computePaymentStatus(total, paidAmount);

        // crear orden
        const [order] = await OrderModel.create(
            [
                {
                    source: "admin",
                    customerId,
                    customerEmail,
                    items: orderItems,
                    billing,
                    payments,
                    shippingMethod,
                    notes,
                    status,
                    paymentStatus,
                    subtotal,
                    taxTotal,
                    total,
                    paidAmount,
                    remainingAmount: Math.max(0, total - paidAmount),
                    datePaid:
                        paymentStatus === "paid"
                            ? (createdAt ?? new Date())
                            : null,
                    ...(createdAt && { createdAt }),
                },
            ],
            { session },
        );

        // reservar stock SOLO si no está cancelada
        if (status !== "cancelled") {
            for (const item of orderItems) {
                await updateProductStock(
                    item.productId,
                    -item.quantity,
                    item.quantity,
                    session,
                    item.isBundle ? item.bundleComponents : undefined,
                );
            }
        }

        if (options.afterCreate) {
            await options.afterCreate(order, session);
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
