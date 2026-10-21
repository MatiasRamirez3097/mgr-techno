import mongoose from "mongoose";

import { OrderModel } from "@/models/Order";
import { findProductsById } from "../products/getProductsById";
import { createAdminOrderSchema } from "../validators/createAdminOrderSchema";
import { updateProductStock } from "../products/updateProductStock";
import { buildOrderBundleComponentsMap } from "../products/recalculateBundlesStock";
import { ensureCustomPcProduct } from "../products/ensureCustomPcProduct";

export async function createAdminOrder(data: unknown) {
    const result = createAdminOrderSchema.safeParse(data);

    if (!result.success) {
        throw new Error(result.error.message);
    }

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
            document,
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
            const taxRate = item.taxRate ?? 21;
            const taxAmount = subtotal - subtotal / (1 + taxRate / 100);

            if (item.isCustomPc) {
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
                    billing,
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
                billing,
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
                    billing,
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
                await updateProductStock(
                    item.productId,
                    -item.quantity,
                    item.quantity,
                    session,
                    item.isBundle ? item.bundleComponents : undefined,
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
