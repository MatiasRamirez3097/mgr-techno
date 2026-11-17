export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { ORDER_PAYMENT_STATUSES } from "@/constants/status";
import { OrderStatusControl } from "@/components/admin/orders/OrderStatusControl";
import { getOrderStatusMeta } from "@/components/admin/orders/orderStatusMeta";
import { Tabs } from "@/components/admin/ui/Tabs";
import { notFound } from "next/navigation";
import { getOrdersById } from "@/services/orders/getOrdersById";
import { getAllocationSuggestions } from "@/services/inventory/getAllocationSuggestions";
import { InventoryAllocationSection } from "@/components/admin/InventoryAllocationSection";
import {
    computePaymentStatus,
    sumPaidPayments,
} from "@/services/orders/recalculateOrderPaymentStatus";
import { OrderPaymentsSection } from "@/components/admin/OrderPaymentsSection";
import { GenerateVoucherButton } from "@/components/admin/documents/GenerateVoucherButton";
import { VoucherCard } from "@/components/admin/VoucherCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    mercadopago: "MercadoPago",
    bank_transfer: "Transferencia bancaria",
    cash: "Efectivo",
};

// ACTUALIZADO: Agregamos cadetería
const SHIPPING_METHOD_LABELS: Record<string, string> = {
    local_pickup: "Retiro en local",
    andreani: "Andreani",
    local_shipping: "Envío Cadetería (Rosario)",
};

export default async function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await connectDB();

    const order = await getOrdersById(id);
    if (!order) notFound();

    const status = getOrderStatusMeta(order.status);
    const orderId = order.id.toString().slice(-6).toUpperCase();

    const payments = order.payments || [];
    // Estado persistido (recalculateOrderPaymentStatus): el mismo que controla
    // allocateInventoryToOrder. Fallback para pedidos sin el campo.
    const paymentStatus =
        order.paymentStatus ||
        computePaymentStatus(order.total, sumPaidPayments(payments));
    const paidTotal = sumPaidPayments(payments);
    // Igual que PUT /api/admin/orders/[id]: con algún pago en efectivo no se bloquea el avance
    const hasCashPayment = payments.some((p: { method?: string }) => p.method === "cash");
    const paymentBlocked = paymentStatus !== "paid" && !hasCashPayment;
    const paymentStatusLabel =
        ORDER_PAYMENT_STATUSES.find((s) => s.value === paymentStatus)?.label || paymentStatus;
    const showInventory = paymentStatus === "paid" && order.status !== "cancelled";

    const allocationSuggestions =
        paymentStatus === "paid"
            ? await getAllocationSuggestions(order.id)
            : [];

    function getVoucherLabel(voucher: any) {
        switch (voucher.type) {
            case "non_fiscal_receipt":
                return "Comprobante no fiscal";
            case "fiscal_invoice":
                return `Factura ${voucher.fiscalData?.fiscalType ?? ""}`;
            case "credit_note":
                return "Nota de crédito";
            case "debit_note":
                return "Nota de débito";
            default:
                return "Documento";
        }
    }

    return (
        <div className="max-w-7xl w-full">
            <AdminPageHeader
                back={{ href: "/admin/orders", label: "Órdenes" }}
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        <span className="break-all">Orden #{orderId}</span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                            {status.label}
                        </span>
                    </span>
                }
            />

            {/* Resumen rápido: lo que más se mira al abrir una venta */}
            <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "Total", value: `$${order.total.toLocaleString("es-AR")}`, strong: true },
                    {
                        label: "Pagado",
                        value: `$${paidTotal.toLocaleString("es-AR")}`,
                        hint:
                            order.total - paidTotal > 0
                                ? `Resta $${(order.total - paidTotal).toLocaleString("es-AR")}`
                                : "Pago completo",
                    },
                    {
                        label: "Cliente",
                        value: `${order.billing?.firstName || ""} ${order.billing?.lastName || ""}`.trim() || "—",
                    },
                    {
                        label: "Envío",
                        value: SHIPPING_METHOD_LABELS[order.shippingMethod?.method] || order.shippingMethod?.method || "—",
                    },
                ].map((kpi) => (
                    <div key={kpi.label} className="min-w-0 rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
                        <dt className="text-xs text-gray-400">{kpi.label}</dt>
                        <dd className={`mt-1 truncate ${kpi.strong ? "text-lg font-bold text-brand" : "text-sm font-medium text-white"}`}>
                            {kpi.value}
                        </dd>
                        {kpi.hint && <dd className="mt-0.5 text-xs text-gray-500">{kpi.hint}</dd>}
                    </div>
                ))}
            </dl>

            {/* Estado: la acción principal, en una sola fila */}
            <div className="mb-6">
                <OrderStatusControl
                    orderId={order.id.toString()}
                    currentStatus={order.status}
                    shippingMethod={order.shippingMethod?.method}
                    paymentBlocked={paymentBlocked}
                />
            </div>

            <Tabs
                ariaLabel="Secciones de la orden"
                tabs={[
                    {
                        id: "resumen",
                        label: "Resumen",
                        badge: order.items.length,
                        content: (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                                <div className="min-w-0">
                            <section className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
                                <h2 className="text-base font-bold text-white mb-4">
                                    Productos
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {order.items.map((item: any, i: number) => {
                                        const hasBundleComponents =
                                            item.isBundle &&
                                            Array.isArray(item.bundleComponents) &&
                                            item.bundleComponents.length > 0;

                                        const simpleSerials = !hasBundleComponents
                                            ? (item.allocations || [])
                                                  .map((a: any) => a.serialNumber)
                                                  .filter(Boolean)
                                            : [];

                                        return (
                                            <div
                                                key={i}
                                                className="flex justify-between items-start text-sm gap-4 py-1.5 border-b border-gray-800/60 last:border-b-0"
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-gray-200 font-medium">
                                                            {item.name} x{item.quantity}
                                                        </span>
                                                        {simpleSerials.length > 0 && (
                                                            <span className="text-xs font-mono text-gray-400">
                                                                (S/N:{" "}
                                                                {simpleSerials.join(
                                                                    ", ",
                                                                )}
                                                                )
                                                            </span>
                                                        )}
                                                    </div>

                                                    {hasBundleComponents && (
                                                        <ul className="mt-1.5 ml-3 pl-2.5 border-l-2 border-gray-800 flex flex-col gap-1">
                                                            {item.bundleComponents.map(
                                                                (
                                                                    comp: any,
                                                                    compIdx: number,
                                                                ) => {
                                                                    const totalCompQty =
                                                                        Number(
                                                                            comp.totalQuantity,
                                                                        ) ||
                                                                        Number(
                                                                            item.quantity,
                                                                        ) *
                                                                            Math.max(
                                                                                1,
                                                                                Number(
                                                                                    comp.quantityPerBundle,
                                                                                ) || 1,
                                                                            );
                                                                    const compSerials =
                                                                        (
                                                                            item.allocations ||
                                                                            []
                                                                        )
                                                                            .filter(
                                                                                (
                                                                                    a: any,
                                                                                ) =>
                                                                                    a.componentProductId?.toString() ===
                                                                                        comp.productId?.toString() &&
                                                                                    a.serialNumber,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    a: any,
                                                                                ) =>
                                                                                    a.serialNumber,
                                                                            );

                                                                    return (
                                                                        <li
                                                                            key={
                                                                                compIdx
                                                                            }
                                                                            className="text-xs text-gray-400 leading-relaxed"
                                                                        >
                                                                            •{" "}
                                                                            <span className="text-gray-300 font-medium">
                                                                                {
                                                                                    totalCompQty
                                                                                }
                                                                                x
                                                                            </span>{" "}
                                                                            {comp.name}
                                                                            {compSerials.length >
                                                                                0 && (
                                                                                <span className="text-gray-500 font-mono ml-1.5">
                                                                                    (S/N:{" "}
                                                                                    {compSerials.join(
                                                                                        ", ",
                                                                                    )}
                                                                                    )
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                },
                                                            )}
                                                        </ul>
                                                    )}

                                                    {/* Renderizamos la falla directamente desde la asignación mapeada */}
                                                    {item.allocations?.map(
                                                        (alloc: any, idx: number) => {
                                                            if (
                                                                alloc.defectDescription &&
                                                                alloc.defectDescription !==
                                                                    "Sin detalle de falla especificado"
                                                            ) {
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className="text-xs text-amber-400/90 mt-0.5"
                                                                    >
                                                                        ⚠️ Falla:{" "}
                                                                        {
                                                                            alloc.defectDescription
                                                                        }
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        },
                                                    )}
                                                </div>
                                                <span className="text-white font-medium shrink-0">
                                                    ${item.total.toLocaleString("es-AR")}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-gray-700 mt-4 pt-4 flex flex-col gap-2">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Subtotal</span>
                                        <span>
                                            ${order.subtotal.toLocaleString("es-AR")}
                                        </span>
                                    </div>
                                    {order.shippingMethod?.cost > 0 && (
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span>
                                                Envío (
                                                {SHIPPING_METHOD_LABELS[
                                                    order.shippingMethod?.method
                                                ] || order.shippingMethod?.method}
                                                )
                                            </span>
                                            <span>
                                                $
                                                {order.shippingMethod?.cost.toLocaleString(
                                                    "es-AR",
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-white mt-1">
                                        <span>Total</span>
                                        <span>
                                            ${order.total.toLocaleString("es-AR")}
                                        </span>
                                    </div>
                                </div>
                            </section>
                                </div>
                                <div className="min-w-0">
                            <section className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
                                <h2 className="text-base font-bold text-white mb-4">
                                    Cliente
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400 mb-1">Nombre</p>
                                        <p className="text-white">
                                            {order.billing?.firstName}{" "}
                                            {order.billing?.lastName}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 mb-1">Email</p>
                                        <p className="text-white">
                                            {order.customerEmail}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 mb-1">Teléfono</p>
                                        <p className="text-white">
                                            {order.billing?.phone || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 mb-1">Documento</p>
                                        <p className="text-white">
                                            {order.billing?.document?.documentType}{" "}
                                            {order.billing?.document?.number || "—"}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="text-gray-400 mb-1">Dirección</p>
                                        <p className="text-white">
                                            {order.billing?.address},{" "}
                                            {order.billing?.city},{" "}
                                            {order.billing?.state} (
                                            {order.billing?.postcode})
                                        </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="text-gray-400 mb-1">Envío</p>
                                        <p className="text-white">
                                            {SHIPPING_METHOD_LABELS[order.shippingMethod?.method] || order.shippingMethod?.method}
                                            {order.shippingMethod?.cost > 0 &&
                                                ` · $${order.shippingMethod.cost.toLocaleString("es-AR")}`}
                                        </p>
                                    </div>
                                </div>
                            </section>
                                </div>
                            </div>
                        ),
                    },
                    {
                        id: "pagos",
                        label: "Pagos",
                        badge: paymentStatusLabel,
                        attention: paymentStatus !== "paid",
                        content: (
                        <OrderPaymentsSection
                            mode="persisted"
                            orderId={order.id}
                            total={order.total}
                            payments={order.payments || []}
                            paymentStatus={paymentStatus}
                        />
                        ),
                    },
                    {
                        id: "inventario",
                        label: "Inventario",
                        hidden: !showInventory,
                        badge: order.inventoryAllocatedAt ? "Asignado" : "Pendiente",
                        attention: !order.inventoryAllocatedAt,
                        content: (
                        <InventoryAllocationSection
                            inventoryAllocatedAt={
                                order.inventoryAllocatedAt
                            }
                            orderId={order.id}
                            items={order.items}
                            allocationSuggestions={allocationSuggestions}
                        />
                        ),
                    },
                    {
                        id: "documentos",
                        label: "Documentos",
                        badge: order.vouchers?.length || 0,
                        content: (
                        <section className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h2 className="text-base font-bold text-white">
                                    Documentos
                                </h2>

                                <div className="flex flex-wrap gap-2">
                                    <GenerateVoucherButton
                                        orderId={order.id}
                                        type="non_fiscal_receipt"
                                    />

                                    <GenerateVoucherButton
                                        orderId={order.id}
                                        type="fiscal_invoice"
                                        fiscalType={
                                            order.billing?.document
                                                ?.documentType === "CUIT"
                                                ? "A"
                                                : "B"
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {order.vouchers?.length ? (
                                    order.vouchers.map((voucher: any) => (
                                        <VoucherCard
                                            key={voucher.id}
                                            orderId={order.id}
                                            voucher={voucher}
                                        />
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400">
                                        No hay comprobantes generados
                                    </div>
                                )}
                            </div>
                        </section>
                        ),
                    },
                ]}
            />
        </div>
    );
}
