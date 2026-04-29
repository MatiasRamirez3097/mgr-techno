import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { PurchaseModel } from "@/models/Purchase";
import mongoose from "mongoose";
import {
    createPurchaseSchema,
    receivePurchaseSchema,
    updatePurchaseDocumentSchema,
    type CreatePurchaseInput,
    type ReceivePurchaseInput,
} from "../validators/purchaseSchema";
import { getNextGenericNumber } from "../counters/getNextGenericNumber";
import { getSupplierById } from "../suppliers/getSupplierById";

export async function createPurchase(data: unknown) {
    // 1. Validar con Zod
    const result = createPurchaseSchema.safeParse(data);

    if (!result.success) {
        return result;
    }
    const { document, items, notes, status, supplierId } = result.data;
    //const parsed = result.data;

    if (document.type === "generic")
        document.number = await getNextGenericNumber();

    const subtotal = items.reduce(
        (acc: number, item) => acc + item.quantity * item.unitCost,
        0,
    );

    const tax = subtotal * 0.21; // si aplica
    const total = subtotal + tax;
    //const validatedData = createPurchaseSchema.parse(data);
    const supplier = await getSupplierById(result.data.supplierId);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Validar productos existen
        const productIds = result.data.items.map((item) => item.productId);
        console.log("productIds>>>>", productIds);
        const products = await ProductModel.find({
            _id: { $in: productIds },
        }).session(session);

        if (products.length !== productIds.length) {
            throw new Error("Uno o más productos no existen");
        }

        // 3. Validaciones específicas de negocio
        const validationErrors: string[] = [];

        for (const item of result.data.items) {
            const product = products.find(
                (p) => p._id.toString() === item.productId,
            );

            if (!product) continue;

            // Validar que el producto gestione stock
            if (!product.manageStock) {
                validationErrors.push(
                    `El producto "${product.name}" no gestiona stock`,
                );
                continue;
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(
                `Errores de validación:\n${validationErrors.join("\n")}`,
            );
        }

        // 4. Calcular total
        const totalCost = items.reduce(
            (sum, item) => sum + item.quantity * item.unitCost,
            0,
        );

        // 5. Crear Purchase (sin purchaseNumber, ya que usas document.number)
        const purchase = await PurchaseModel.create(
            [
                {
                    supplierId: supplierId,
                    supplierName: supplier.name,
                    items: items,
                    subtotal: subtotal,
                    total: total,
                    status: status,
                    document: document,
                    notes: notes,
                },
            ],
            { session },
        );

        await session.commitTransaction();
        return purchase[0];
    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

/*export async function receivePurchase(data: unknown) {
    // 1. Validar con Zod
    const validatedData = receivePurchaseSchema.parse(data);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Obtener la compra
        const purchase = await PurchaseModel.findById(
            validatedData.purchaseId,
        ).session(session);

        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        if (purchase.status === "received") {
            throw new Error("Esta compra ya fue recibida completamente");
        }

        if (purchase.status === "cancelled") {
            throw new Error("No se puede recibir una compra cancelada");
        }

        // 3. Validaciones de negocio
        const inventoryItemsToCreate: any[] = [];
        const validationErrors: string[] = [];
        const receivedItemsMap = new Map();

        for (const receivedItem of validatedData.receivedItems) {
            const purchaseItem = purchase.items.find(
                (item) => item.productId.toString() === receivedItem.productId,
            );

            if (!purchaseItem) {
                validationErrors.push(
                    `El producto ${receivedItem.productId} no está en esta compra`,
                );
                continue;
            }

            const product = await ProductModel.findById(
                receivedItem.productId,
            ).session(session);

            if (!product) {
                validationErrors.push(
                    `Producto ${receivedItem.productId} no encontrado`,
                );
                continue;
            }

            // Verificar cantidad ya recibida previamente
            const alreadyReceived = await InventoryItemModel.countDocuments({
                purchaseId: purchase._id,
                productId: receivedItem.productId,
            }).session(session);

            const totalThatWillBeReceived =
                alreadyReceived + receivedItem.quantityReceived;

            if (totalThatWillBeReceived > purchaseItem.quantity) {
                validationErrors.push(
                    `Para "${product.name}": ordenado ${purchaseItem.quantity}, ya recibido ${alreadyReceived}, intentando recibir ${receivedItem.quantityReceived} más (excede lo ordenado)`,
                );
                continue;
            }

            // Validar números de serie
            if (product.hasSerialNumber) {
                if (
                    !receivedItem.serialNumbers ||
                    receivedItem.serialNumbers.length !==
                        receivedItem.quantityReceived
                ) {
                    validationErrors.push(
                        `El producto "${product.name}" requiere ${receivedItem.quantityReceived} números de serie`,
                    );
                    continue;
                }

                // Verificar que los seriales no existan
                const existingSerials = await InventoryItemModel.find({
                    serialNumber: { $in: receivedItem.serialNumbers },
                }).session(session);

                if (existingSerials.length > 0) {
                    validationErrors.push(
                        `Números de serie ya existen: ${existingSerials
                            .map((i) => i.serialNumber)
                            .join(", ")}`,
                    );
                    continue;
                }

                // Crear un item por cada serial
                for (const serial of receivedItem.serialNumbers) {
                    inventoryItemsToCreate.push({
                        productId: receivedItem.productId,
                        serialNumber: serial,
                        status: "available",
                        purchaseId: purchase._id,
                        location: receivedItem.location,
                    });
                }
            } else {
                // Sin número de serie
                if (
                    receivedItem.serialNumbers &&
                    receivedItem.serialNumbers.length > 0
                ) {
                    validationErrors.push(
                        `El producto "${product.name}" no usa números de serie`,
                    );
                    continue;
                }

                // Crear múltiples items genéricos
                for (let i = 0; i < receivedItem.quantityReceived; i++) {
                    inventoryItemsToCreate.push({
                        productId: receivedItem.productId,
                        status: "available",
                        purchaseId: purchase._id,
                        location: receivedItem.location,
                    });
                }
            }

            receivedItemsMap.set(receivedItem.productId, {
                product,
                quantityReceived: receivedItem.quantityReceived,
            });
        }

        if (validationErrors.length > 0) {
            throw new Error(
                `Errores de validación:\n${validationErrors.join("\n")}`,
            );
        }

        // 4. Crear InventoryItems
        const createdItems = await InventoryItemModel.insertMany(
            inventoryItemsToCreate,
            { session },
        );

        // 5. Actualizar estado de la compra
        let allItemsReceived = true;

        for (const purchaseItem of purchase.items) {
            const receivedCount = await InventoryItemModel.countDocuments({
                purchaseId: purchase._id,
                productId: purchaseItem.productId,
            }).session(session);

            if (receivedCount < purchaseItem.quantity) {
                allItemsReceived = false;
                break;
            }
        }

        if (allItemsReceived) {
            purchase.status = "received";
            purchase.receivedDate = new Date();
        } else {
            purchase.status = "partial";
        }

        // 6. Actualizar documento si viene en el request
        if (validatedData.document) {
            purchase.document = {
                ...purchase.document,
                ...validatedData.document,
            };
        }

        await purchase.save({ session });

        // 7. Cumplir backorders si existen
        for (const [productId, data] of receivedItemsMap) {
            const itemsForProduct = createdItems.filter(
                (item) => item.productId.toString() === productId,
            );
            await fulfillBackordersForProduct(
                productId,
                itemsForProduct,
                session,
            );
        }
        
        await session.commitTransaction();

        return {
            purchase,
            inventoryItemsCreated: createdItems.length,
            itemsCreated: createdItems,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}*/

// Función auxiliar para actualizar solo el documento
export async function updatePurchaseDocument(data: unknown) {
    const validatedData = updatePurchaseDocumentSchema.parse(data);

    const purchase = await PurchaseModel.findById(validatedData.purchaseId);

    if (!purchase) {
        throw new Error("Compra no encontrada");
    }

    purchase.document = {
        ...purchase.document,
        ...validatedData.document,
    };

    await purchase.save();

    return purchase;
}
/*
async function fulfillBackordersForProduct(
    productId: string,
    newItems: any[],
    session: any,
) {
    const pendingBackorders = await BackorderModel.find({
        productId,
        status: "pending",
    })
        .sort({ priority: -1, createdAt: 1 })
        .session(session);

    let remainingItems = [...newItems];

    for (const backorder of pendingBackorders) {
        if (remainingItems.length === 0) break;

        const itemsNeeded = Math.min(backorder.quantity, remainingItems.length);
        const itemsToAssign = remainingItems.splice(0, itemsNeeded);

        await Promise.all(
            itemsToAssign.map((item) => {
                item.status = "reserved";
                return item.save({ session });
            }),
        );

        if (itemsNeeded >= backorder.quantity) {
            backorder.status = "fulfilled";
        }

        await backorder.save({ session });
    }
}
*/
