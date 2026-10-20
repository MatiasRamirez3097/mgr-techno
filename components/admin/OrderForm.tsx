"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProductSelector } from "./ProductSelector";
import { SearchableEntitySelect } from "./SearchableEntitySelect";
import { FormModal } from "./FormModal";
import { CustomerForm } from "./CustomerForm";

interface Props {
    order?: any;
    mode: "create" | "edit";
}

type Document = {
    date: string;
    type: string;
    number: string;
    fileUrl: string | undefined;
};

type OrderItem = {
    productId: string;
    name?: string;
    sku?: string;
    availableStock?: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    weight: number;
    dimensions: {
        height: number;
        width: number;
        length: number;
    };
    image: string;
};

type Payment = {
    method: "cash" | "bank_transfer" | "mercadopago";
    amount: number;
    status: "pending" | "paid";
    reference?: string;
};

type OrderFormState = {
    payments: Payment[];
    customerId: string;
    status: string;
    items: OrderItem[];
    document: Document;
    notes: string;
    shippingMethod: {
        method: string;
        cost: number;
    };
};

export function OrderForm({ order, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [quotingShipping, setQuotingShipping] = useState(false);
    const [postcode, setPostcode] = useState("");

    useEffect(() => {
        fetch("/api/admin/customers", {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                setCustomers(data.customers || []);
            })
            .catch(() => {})
            .finally(() => setLoadingCustomers(false));
    }, []);

    const customerOptions = useMemo(() => {
        return [...customers]
            .sort((a, b) => {
                const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
                const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
                return nameA.localeCompare(nameB, "es", {
                    sensitivity: "base",
                });
            })
            .map((c) => {
                const fullName =
                    `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                    "Cliente sin nombre";
                const docNumber = c.document?.number || "";
                const docType = c.document?.documentType || "DOC";
                return {
                    value: c.id,
                    label: fullName,
                    badge: docNumber ? `${docType}: ${docNumber}` : undefined,
                    sublabel: c.email || c.billing?.phone || undefined,
                    searchText: `${c.firstName || ""} ${c.lastName || ""} ${c.lastName || ""} ${c.firstName || ""} ${docNumber} ${c.email || ""}`,
                };
            });
    }, [customers]);

    const [form, setForm] = useState<OrderFormState>({
        customerId: order?.customerId || "",
        payments: order?.payments || [],
        status: order?.status || "pending",
        items: order?.items || [],
        document: {
            date: order?.document?.date
                ? order.document.date.split("T")[0]
                : new Date().toISOString().split("T")[0],
            type: order?.document?.type || "generic",
            number: order?.document?.number || "",
            fileUrl: order?.document?.fileUrl || undefined,
        },
        shippingMethod: {
            method: order?.shippingMethod?.method || "local_pickup",
            cost: order?.shippingMethod?.cost || 0,
        },
        notes: order?.notes || "",
    });

    const quoteOrderShipping = async () => {
        try {
            setQuotingShipping(true);
            const res = await fetch("/api/shipping", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    postcode,
                    items: form.items.map((i) => ({
                        id: i.productId,
                        quantity: i.quantity,
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "No se pudo cotizar el envío");
            }

            setForm((prev) => ({
                ...prev,
                shippingMethod: {
                    ...prev.shippingMethod,
                    method: "andreani",
                    cost: data.total,
                },
            }));
        } finally {
            setQuotingShipping(false);
        }
    };

    const addItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: "",
                    quantity: 1,
                    unitPrice: 0,
                    taxRate: 10.5,
                    dimensions: {
                        width: 0,
                        height: 0,
                        length: 0,
                    },
                    weight: 0,
                    image: "",
                },
            ],
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setForm((prev) => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const removeItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const subtotal = form.items.reduce(
        (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
    );

    const tax = form.items.reduce((acc, item) => {
        const lineSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        return acc + lineSubtotal * (Number(item.taxRate || 0) / 100);
    }, 0);
    const total = subtotal + Number(form.shippingMethod.cost || 0);

    const handleSelectCustomer = (customerId: string) => {
        const customer = customers.find((c) => c.id === customerId);
        setPostcode(customer?.billing?.postcode || "");
        setForm((prev) => ({
            ...prev,
            customerId,
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        if (name === "customerId") {
            handleSelectCustomer(value);
            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const buildPayload = () => ({
        customerId: form.customerId,
        status: form.status,

        items: form.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            taxRate: item.taxRate,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
        })),
        payments: form.payments.map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount),
            status: payment.status,
            reference: payment.reference,
        })),
        shippingMethod: form.shippingMethod,
        document: form.document,

        notes: form.notes,
        source: "admin",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/orders/${order.id}`
                    : "/api/admin/orders",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                    credentials: "include",
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(
                mode === "edit" ? "Venta actualizada" : "Venta creada",
            );
            if (mode === "create")
                router.push(`/admin/orders/${data.data._id}`);
            else router.refresh();
        } catch (e: any) {
            setError(e.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                "¿Estás seguro que querés eliminar esta venta? Esta acción no se puede deshacer.",
            )
        )
            return;
        setDeleting(true);
        try {
            await fetch(`/api/admin/orders/${order.id}`, {
                method: "DELETE",
            });
            router.push("/admin/orders");
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    const addPayment = () => {
        setForm((prev) => ({
            ...prev,
            payments: [
                ...prev.payments,
                {
                    method: "cash",
                    amount: total,
                    status: "pending",
                },
            ],
        }));
    };

    const updatePayment = (index: number, field: string, value: any) => {
        setForm((prev) => {
            const payments = [...prev.payments];

            payments[index] = {
                ...payments[index],
                [field]: value,
            };

            return {
                ...prev,
                payments,
            };
        });
    };

    useEffect(() => {
        if (
            postcode != "" &&
            form.items[0]?.productId &&
            form.shippingMethod.method === "andreani"
        )
            quoteOrderShipping();
    }, [postcode, form.items]);

    return (
        <>
            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {/* Columna principal */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Info básica */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Información básica
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Cliente</label>
                                <div className="flex gap-2">
                                    <SearchableEntitySelect
                                        className="flex-1"
                                        options={customerOptions}
                                        value={form.customerId}
                                        onChange={handleSelectCustomer}
                                        disabled={loadingCustomers}
                                        placeholder={
                                            loadingCustomers
                                                ? "Cargando clientes..."
                                                : "Seleccionar cliente"
                                        }
                                        searchPlaceholder="Buscar por nombre, apellido o documento..."
                                        emptyText="No se encontraron clientes"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCustomerModal(true)
                                        }
                                        title="Crear nuevo cliente"
                                        className="px-4 py-3 rounded-lg bg-brand text-white text-sm font-medium hover:brightness-110 transition shrink-0"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Fecha</label>
                                <input
                                    name="date"
                                    value={form.document.date}
                                    className={inputClass}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            document: {
                                                ...form.document,
                                                date: e.target.value,
                                            },
                                        })
                                    }
                                    type="date"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Tipo de Comprobante
                                </label>
                                <select
                                    className={inputClass}
                                    value={form.document.type}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            document: {
                                                ...form.document,
                                                type: e.target.value,
                                            },
                                        })
                                    }
                                >
                                    <option value="generic">
                                        Comprobante Genérico
                                    </option>
                                    <option value="invoice">Factura</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Nro de Comprobante{" "}
                                </label>
                                <input
                                    className={inputClass}
                                    placeholder="Número"
                                    value={form.document.number}
                                    disabled={form.document.type === "generic"}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            document: {
                                                ...form.document,
                                                number: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Método de envío
                                </label>

                                <select
                                    disabled={
                                        form.customerId &&
                                        form.items[0]?.productId
                                            ? false
                                            : true
                                    }
                                    name="shippingMethod"
                                    className={inputClass}
                                    value={form.shippingMethod.method}
                                    onChange={(e) => {
                                        if (e.target.value === "andreani")
                                            quoteOrderShipping();
                                        else
                                            setForm({
                                                ...form,
                                                shippingMethod: {
                                                    ...form.shippingMethod,
                                                    method: e.target.value,
                                                    cost: 0,
                                                },
                                            });
                                    }}
                                >
                                    <option value="local_pickup">
                                        Retiro en local
                                    </option>

                                    <option value="delivery">
                                        Envío local
                                    </option>

                                    <option value="andreani">Andreani</option>

                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Costo de envío{" "}
                                    {quotingShipping && (
                                        <span className="text-xs text-brand">
                                            (Cotizando...)
                                        </span>
                                    )}
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.shippingMethod.cost}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            shippingMethod: {
                                                ...form.shippingMethod,
                                                cost: Number(e.target.value),
                                            },
                                        })
                                    }
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Productos
                        </h2>
                        {form.items.length > 0 && (
                            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-gray-400 px-1">
                                <div className="col-span-6">Producto</div>
                                <div className="col-span-2">Cantidad</div>
                                <div className="col-span-3">Precio unitario</div>
                                <div className="col-span-1 text-center">
                                    Quitar
                                </div>
                            </div>
                        )}
                        {form.items.map((item, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-12 gap-2 items-center mb-2"
                            >
                                <div className="col-span-6">
                                    <ProductSelector
                                        value={
                                            item.productId
                                                ? {
                                                      id: item.productId,
                                                      name: item.name || "",
                                                      sku: item.sku,
                                                      availableStock:
                                                          item.availableStock,
                                                      regularPrice:
                                                          item.unitPrice,
                                                      taxRate: item.taxRate,
                                                      image: item.image || "",
                                                  }
                                                : null
                                        }
                                        onChange={(product: any) => {
                                            const effPrice =
                                                typeof product?.effectivePrice ===
                                                    "number" &&
                                                product.effectivePrice > 0
                                                    ? product.effectivePrice
                                                    : typeof product?.salePrice ===
                                                            "number" &&
                                                        product.salePrice > 0
                                                      ? product.salePrice
                                                      : Number(
                                                            product?.regularPrice,
                                                        ) || 0;

                                            updateItem(
                                                i,
                                                "productId",
                                                product?.id || "",
                                            );
                                            updateItem(
                                                i,
                                                "name",
                                                product?.name || "",
                                            );
                                            updateItem(
                                                i,
                                                "sku",
                                                product?.sku || "",
                                            );
                                            updateItem(
                                                i,
                                                "availableStock",
                                                product?.availableStock,
                                            );
                                            updateItem(
                                                i,
                                                "unitPrice",
                                                effPrice,
                                            );
                                            updateItem(
                                                i,
                                                "taxRate",
                                                product?.taxRate ?? 10.5,
                                            );
                                            updateItem(
                                                i,
                                                "image",
                                                product?.image || "",
                                            );
                                            updateItem(
                                                i,
                                                "dimensions",
                                                product?.dimensions
                                                    ? product.dimensions
                                                    : {
                                                          width: 0,
                                                          length: 0,
                                                          height: 0,
                                                      },
                                            );
                                            updateItem(
                                                i,
                                                "weight",
                                                product?.weight
                                                    ? Number(product.weight)
                                                    : 0,
                                            );
                                        }}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateItem(
                                                i,
                                                "quantity",
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div className="col-span-3">
                                    <input
                                        min="0"
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) =>
                                            updateItem(
                                                i,
                                                "unitPrice",
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div className="col-span-1 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center justify-center text-sm"
                                        title="Quitar producto"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addItem}
                            className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 rounded-lg transition-colors border border-gray-700 flex items-center gap-2"
                        >
                            <span>+</span>
                            <span>Agregar producto</span>
                        </button>
                    </section>

                    {/* Precios */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Resumen de importes
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                            <div>Subtotal:</div>
                            <div className="text-right font-mono">
                                ${subtotal.toLocaleString("es-AR")}
                            </div>

                            <div>IVA estimado:</div>
                            <div className="text-right font-mono">
                                ${Math.round(tax).toLocaleString("es-AR")}
                            </div>

                            <div>Envío:</div>
                            <div className="text-right font-mono">
                                $
                                {Number(
                                    form.shippingMethod.cost || 0,
                                ).toLocaleString("es-AR")}
                            </div>

                            <div className="font-bold text-white text-base border-t border-gray-700 pt-2 mt-1">
                                Total:
                            </div>
                            <div className="font-bold text-brand text-base text-right border-t border-gray-700 pt-2 mt-1 font-mono">
                                ${total.toLocaleString("es-AR")}
                            </div>
                        </div>
                    </section>
                </div>
                {/* Columna lateral */}
                <div className="flex flex-col gap-4">
                    {/* Acciones */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Publicación
                        </h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelClass}>Estado</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="pending">Pendiente</option>
                                    <option value="on_hold">En espera</option>
                                    <option value="completed">
                                        Completada
                                    </option>
                                    <option value="cancelled">Cancelada</option>
                                    <option value="refunded">Devuelta</option>
                                    <option value="failed">Fallida</option>
                                </select>
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}
                            {success && (
                                <p className="text-sm text-green-400">
                                    {success}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                            >
                                {loading
                                    ? "Guardando..."
                                    : mode === "edit"
                                      ? "Guardar cambios"
                                      : "Guardar venta"}
                            </button>

                            {mode === "edit" && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="w-full py-2.5 rounded-xl text-red-400 text-sm font-medium border border-red-400/20 hover:bg-red-400/10 disabled:opacity-50 transition-all"
                                >
                                    {deleting
                                        ? "Eliminando..."
                                        : "Eliminar venta"}
                                </button>
                            )}
                        </div>
                    </section>
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">
                                Pagos
                            </h2>

                            <button
                                type="button"
                                onClick={addPayment}
                                className="px-3 py-2 rounded-lg bg-brand text-white text-sm"
                            >
                                + Agregar pago
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            {form.payments.map((payment, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-12 gap-2 items-end bg-gray-800/50 border border-gray-700 rounded-xl p-3"
                                >
                                    {/* Método */}
                                    <div className="col-span-3">
                                        <label className={labelClass}>
                                            Método
                                        </label>

                                        <select
                                            value={payment.method}
                                            onChange={(e) =>
                                                updatePayment(
                                                    i,
                                                    "method",
                                                    e.target.value,
                                                )
                                            }
                                            className={inputClass}
                                        >
                                            <option value="cash">
                                                Efectivo
                                            </option>
                                            <option value="bank_transfer">
                                                Transferencia
                                            </option>
                                            <option value="mercadopago">
                                                MercadoPago
                                            </option>
                                        </select>
                                    </div>

                                    {/* Monto */}
                                    <div className="col-span-3">
                                        <label className={labelClass}>
                                            Monto
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            value={payment.amount}
                                            onChange={(e) =>
                                                updatePayment(
                                                    i,
                                                    "amount",
                                                    Number(e.target.value),
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Estado */}
                                    <div className="col-span-3">
                                        <label className={labelClass}>
                                            Estado
                                        </label>

                                        <select
                                            value={payment.status}
                                            onChange={(e) =>
                                                updatePayment(
                                                    i,
                                                    "status",
                                                    e.target.value,
                                                )
                                            }
                                            className={inputClass}
                                        >
                                            <option value="pending">
                                                Pendiente
                                            </option>
                                            <option value="paid">Pagado</option>
                                            <option value="failed">
                                                Fallido
                                            </option>
                                            <option value="refunded">
                                                Reembolsado
                                            </option>
                                        </select>
                                    </div>

                                    {/* Referencia */}
                                    <div className="col-span-2">
                                        <label className={labelClass}>
                                            Referencia
                                        </label>

                                        <input
                                            value={payment.reference || ""}
                                            onChange={(e) =>
                                                updatePayment(
                                                    i,
                                                    "reference",
                                                    e.target.value,
                                                )
                                            }
                                            className={inputClass}
                                            placeholder="# operación"
                                        />
                                    </div>

                                    {/* Delete */}
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    payments:
                                                        prev.payments.filter(
                                                            (_, idx) =>
                                                                idx !== i,
                                                        ),
                                                }));
                                            }}
                                            className="h-11 w-11 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Resumen pagos */}
                        <div className="border-t border-gray-700 mt-4 pt-4 text-sm flex flex-col gap-2">
                            <div className="flex justify-between text-gray-400">
                                <span>Total orden</span>
                                <span>${total.toLocaleString("es-AR")}</span>
                            </div>

                            <div className="flex justify-between text-gray-400">
                                <span>Total pagos</span>
                                <span>
                                    $
                                    {form.payments
                                        .reduce(
                                            (acc, p) =>
                                                acc + Number(p.amount || 0),
                                            0,
                                        )
                                        .toLocaleString("es-AR")}
                                </span>
                            </div>

                            <div className="flex justify-between text-white font-semibold">
                                <span>Restante</span>

                                <span>
                                    $
                                    {(
                                        total -
                                        form.payments.reduce(
                                            (acc, p) =>
                                                acc + Number(p.amount || 0),
                                            0,
                                        )
                                    ).toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </form>
            {showCustomerModal && (
                <FormModal title="Nuevo Cliente">
                    <CustomerForm
                        onCancel={() => setShowCustomerModal(false)}
                        onSuccess={(created) => {
                            if (created?.id) {
                                setCustomers((prev) => [...prev, created]);
                                setForm((prev) => ({
                                    ...prev,
                                    customerId: created.id,
                                }));
                                setPostcode(
                                    created?.billing?.postcode || "",
                                );
                            }
                            setShowCustomerModal(false);
                        }}
                        mode="create"
                        modal
                    />
                </FormModal>
            )}
        </>
    );
}
