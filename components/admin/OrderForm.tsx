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

type CustomComponentItem = {
    productId: string;
    name: string;
    sku?: string;
    availableStock?: number;
    referencePrice?: number;
    image?: string;
    quantity: number;
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
    isCustomPc?: boolean;
    customComponents?: CustomComponentItem[];
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

    const hasValidItemsForShipping = useMemo(() => {
        return form.items.some((i) =>
            i.isCustomPc
                ? (i.customComponents?.length || 0) > 0
                : Boolean(i.productId),
        );
    }, [form.items]);

    const quoteOrderShipping = async () => {
        try {
            const shippingItems = form.items.flatMap((i) => {
                if (i.isCustomPc) {
                    return (i.customComponents || [])
                        .filter((c) => Boolean(c.productId))
                        .map((c) => ({
                            id: c.productId,
                            quantity:
                                Math.max(1, Number(c.quantity) || 1) *
                                Math.max(1, Number(i.quantity) || 1),
                        }));
                }
                if (!i.productId) return [];
                return [
                    {
                        id: i.productId,
                        quantity: Math.max(1, Number(i.quantity) || 1),
                    },
                ];
            });

            if (shippingItems.length === 0) return;

            setQuotingShipping(true);
            const res = await fetch("/api/shipping", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    postcode,
                    items: shippingItems,
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
                    isCustomPc: false,
                },
            ],
        }));
    };

    const addCustomPcItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: "",
                    name: "PC Armada",
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
                    isCustomPc: true,
                    customComponents: [],
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

    const addComponentToCustomPc = (itemIndex: number, product: any) => {
        if (!product?.id) return;

        const effPrice =
            typeof product?.effectivePrice === "number" &&
            product.effectivePrice > 0
                ? product.effectivePrice
                : typeof product?.salePrice === "number" &&
                    product.salePrice > 0
                  ? product.salePrice
                  : Number(product?.regularPrice) || 0;

        setForm((prev) => {
            const items = [...prev.items];
            const currentItem = items[itemIndex];
            const currentComps = [...(currentItem.customComponents || [])];
            const existingIdx = currentComps.findIndex(
                (c) => c.productId === product.id,
            );

            if (existingIdx >= 0) {
                currentComps[existingIdx] = {
                    ...currentComps[existingIdx],
                    quantity: Number(currentComps[existingIdx].quantity || 1) + 1,
                };
            } else {
                currentComps.push({
                    productId: product.id,
                    name: product.name || "",
                    sku: product.sku || "",
                    availableStock: product.availableStock,
                    referencePrice: effPrice,
                    image: product.image || "",
                    quantity: 1,
                });
            }

            items[itemIndex] = {
                ...currentItem,
                customComponents: currentComps,
            };
            return { ...prev, items };
        });
    };

    const updateCustomPcComponentQty = (
        itemIndex: number,
        compIndex: number,
        qty: number,
    ) => {
        setForm((prev) => {
            const items = [...prev.items];
            const currentItem = items[itemIndex];
            const currentComps = [...(currentItem.customComponents || [])];
            if (!currentComps[compIndex]) return prev;
            currentComps[compIndex] = {
                ...currentComps[compIndex],
                quantity: Math.max(1, Number(qty) || 1),
            };
            items[itemIndex] = {
                ...currentItem,
                customComponents: currentComps,
            };
            return { ...prev, items };
        });
    };

    const removeCustomPcComponent = (itemIndex: number, compIndex: number) => {
        setForm((prev) => {
            const items = [...prev.items];
            const currentItem = items[itemIndex];
            const currentComps = (currentItem.customComponents || []).filter(
                (_, idx) => idx !== compIndex,
            );
            items[itemIndex] = {
                ...currentItem,
                customComponents: currentComps,
            };
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
        (acc, item) =>
            acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
    );

    const tax = form.items.reduce((acc, item) => {
        const lineSubtotal =
            Number(item.quantity || 0) * Number(item.unitPrice || 0);
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
            taxRate: Number(item.taxRate),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            isCustomPc: Boolean(item.isCustomPc),
            customComponents: item.isCustomPc
                ? (item.customComponents || []).map((c) => ({
                      productId: c.productId,
                      name: c.name,
                      quantity: Number(c.quantity),
                  }))
                : undefined,
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
            postcode !== "" &&
            hasValidItemsForShipping &&
            form.shippingMethod.method === "andreani"
        )
            quoteOrderShipping();
    }, [postcode, form.items, hasValidItemsForShipping]);

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
                                        hasValidItemsForShipping
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
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">
                                Productos
                            </h2>
                        </div>

                        {form.items.some((it) => !it.isCustomPc) && (
                            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-gray-400 px-1">
                                <div className="col-span-6">Producto</div>
                                <div className="col-span-2">Cantidad</div>
                                <div className="col-span-3">Precio unitario</div>
                                <div className="col-span-1 text-center">
                                    Quitar
                                </div>
                            </div>
                        )}

                        {form.items.map((item, i) => {
                            if (item.isCustomPc) {
                                const referenceSum = (
                                    item.customComponents || []
                                ).reduce(
                                    (acc, c) =>
                                        acc +
                                        Number(c.referencePrice || 0) *
                                            Number(c.quantity || 1),
                                    0,
                                );

                                return (
                                    <div
                                        key={i}
                                        className="mb-4 rounded-2xl border border-brand/30 bg-brand/5 p-4 space-y-4"
                                    >
                                        <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-brand/20 text-brand border border-brand/30">
                                                    🖥️ PC Armada
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Ítem único en factura con desglose de componentes (sin precios individuales)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center justify-center text-sm shrink-0"
                                                title="Quitar PC Armada"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Configuración general de la PC Armada */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-5">
                                                <label className="text-xs text-gray-400 mb-1 block">
                                                    Título en Factura / Orden
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.name || ""}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            i,
                                                            "name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ej: PC Armada / CPU Completo"
                                                    className={inputClass}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="text-xs text-gray-400 mb-1 block">
                                                    Cant. PCs
                                                </label>
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

                                            <div className="md:col-span-2">
                                                <label className="text-xs text-gray-400 mb-1 block">
                                                    IVA
                                                </label>
                                                <select
                                                    value={item.taxRate ?? 10.5}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            i,
                                                            "taxRate",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className={inputClass}
                                                >
                                                    <option value={10.5}>
                                                        10.5%
                                                    </option>
                                                    <option value={21}>
                                                        21%
                                                    </option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="text-xs text-gray-400 mb-1 block">
                                                    Precio Total Unitario ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
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
                                        </div>

                                        {/* Buscador para agregar componentes */}
                                        <div className="bg-gray-900/90 rounded-xl p-3.5 border border-gray-800 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <label className="text-xs font-semibold text-gray-300">
                                                    Componentes del armado (por cada PC)
                                                </label>
                                                {referenceSum > 0 && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-gray-400">
                                                            Suma ref. componentes:{" "}
                                                            <strong className="text-gray-200 font-mono">
                                                                $
                                                                {referenceSum.toLocaleString(
                                                                    "es-AR",
                                                                )}
                                                            </strong>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItem(
                                                                    i,
                                                                    "unitPrice",
                                                                    referenceSum,
                                                                )
                                                            }
                                                            className="px-2 py-0.5 rounded bg-brand/20 hover:bg-brand/30 text-brand border border-brand/30 font-medium transition-colors"
                                                        >
                                                            Usar suma como precio
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <ProductSelector
                                                value={null}
                                                excludeBundles
                                                onChange={(product: any) =>
                                                    addComponentToCustomPc(
                                                        i,
                                                        product,
                                                    )
                                                }
                                            />

                                            {/* Lista de componentes agregados */}
                                            {(item.customComponents || [])
                                                .length === 0 ? (
                                                <p className="text-xs text-gray-500 text-center py-2">
                                                    Buscá y seleccioná los componentes (procesador, mother, RAM, gabinete, etc.) que integran esta PC.
                                                </p>
                                            ) : (
                                                <div className="divide-y divide-gray-800/80 border border-gray-800 rounded-xl overflow-hidden bg-gray-950/40">
                                                    {(
                                                        item.customComponents ||
                                                        []
                                                    ).map((comp, compIdx) => {
                                                        const totalRequired =
                                                            Number(
                                                                comp.quantity ||
                                                                    1,
                                                            ) *
                                                            Math.max(
                                                                1,
                                                                Number(
                                                                    item.quantity,
                                                                ) || 1,
                                                            );
                                                        const hasStockWarning =
                                                            typeof comp.availableStock ===
                                                                "number" &&
                                                            comp.availableStock <
                                                                totalRequired;

                                                        return (
                                                            <div
                                                                key={`${comp.productId}-${compIdx}`}
                                                                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-gray-200 font-medium truncate">
                                                                        {
                                                                            comp.name
                                                                        }
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                                                        {comp.sku && (
                                                                            <span className="font-mono text-gray-500">
                                                                                SKU:{" "}
                                                                                {
                                                                                    comp.sku
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        {typeof comp.availableStock ===
                                                                            "number" && (
                                                                            <span
                                                                                className={
                                                                                    hasStockWarning
                                                                                        ? "text-red-400 font-medium"
                                                                                        : "text-emerald-400"
                                                                                }
                                                                            >
                                                                                Stock disp.:{" "}
                                                                                {
                                                                                    comp.availableStock
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        {Number(
                                                                            item.quantity,
                                                                        ) >
                                                                            1 && (
                                                                            <span className="text-blue-300">
                                                                                (Total orden:{" "}
                                                                                {
                                                                                    totalRequired
                                                                                }{" "}
                                                                                u.)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <label className="text-[11px] text-gray-400">
                                                                        Cant/PC:
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={
                                                                            comp.quantity
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateCustomPcComponentQty(
                                                                                i,
                                                                                compIdx,
                                                                                Number(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                            )
                                                                        }
                                                                        className="w-16 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:border-brand outline-none text-center"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeCustomPcComponent(
                                                                                i,
                                                                                compIdx,
                                                                            )
                                                                        }
                                                                        className="w-7 h-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                                                                        title="Quitar componente"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
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
                                                          image:
                                                              item.image || "",
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
                                                            product.salePrice >
                                                                0
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
                            );
                        })}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={addItem}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 rounded-lg transition-colors border border-gray-700 flex items-center gap-2"
                            >
                                <span>+</span>
                                <span>Agregar producto</span>
                            </button>

                            <button
                                type="button"
                                onClick={addCustomPcItem}
                                className="px-4 py-2 bg-brand/15 hover:bg-brand/25 text-sm text-brand font-medium rounded-lg transition-colors border border-brand/30 flex items-center gap-2"
                            >
                                <span>🖥️</span>
                                <span>+ Agregar PC Armada</span>
                            </button>
                        </div>
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
