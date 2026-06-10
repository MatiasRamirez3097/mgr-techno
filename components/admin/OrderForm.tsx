"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSelector } from "./ProductSelector";
import { FormModal } from "./FormModal";
import { PurchaseDTO } from "@/types/shared/purchase";
import { CustomerForm } from "./CustomerForm";
import { $ZodAny } from "zod/v4/core";

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

const SHIPPING_METHOD_LABELS = {
    local_pickup: "Retiro en local",
    delivery: "Envío local",
    andreani: "Andreani",
    other: "Otro",
};

export function OrderForm({ order, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [quotingShipping, setQuotingShipping] = useState(false);
    const [postcode, setPostcode] = useState("");

    //useEffect
    useEffect(() => {
        fetch("/api/admin/customers", {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                setCustomers(data.customers);
            })
            .finally(() => setLoadingSuppliers(false));
    }, []);

    // Extraer imágenes del producto — soporta tanto strings como objetos {src}
    const extractImages = (product?: any): string[] => {
        if (!product?.images) return [];
        return product.images
            .map((img: any) => (typeof img === "string" ? img : img.src || ""))
            .filter(Boolean);
    };

    const [form, setForm] = useState<OrderFormState>({
        customerId: order?.customerId || "",

        payments: order?.payments || [],

        status: order?.status || "pending",

        items: order?.items || [],

        document: {
            date: order?.document?.date
                ? order.document.date.split("T")[0]
                : "",
            type: order?.document?.type || "generic",
            number: order?.document?.number || "",
            fileUrl: order?.document?.fileUrl || undefined,
        },
        shippingMethod: {
            method: "local_pickup",
            cost: 0,
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
        (acc, item) => acc + item.quantity * item.unitPrice,
        0,
    );

    const tax = form.items.reduce((acc, item) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        return acc + lineSubtotal * (item.taxRate / 100);
    }, 0);
    const total = subtotal + Number(form.shippingMethod.cost || 0);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        if (name === "customerId") {
            const customer = customers.find((c) => c.id === value);
            console.log(customer.billing.postcode);
            setPostcode(customer?.billing?.postcode || "");
            console.log("postcode>>>", postcode);
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
                mode === "edit" ? "Compra actualizada" : "Compra creada",
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
                "¿Estás seguro que querés eliminar este producto? Esta acción no se puede deshacer.",
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

    const removePayment = (index: number) => {
        setForm((prev) => ({
            ...prev,
            payments: prev.payments.filter((_, i) => i !== index),
        }));
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
                                    <select
                                        name="customerId"
                                        value={form.customerId}
                                        onChange={handleChange}
                                        className={`${inputClass} flex-1`}
                                        disabled={loadingSuppliers}
                                    >
                                        <option value="">
                                            {loadingSuppliers
                                                ? "Cargando..."
                                                : "Seleccionar cliente"}
                                        </option>

                                        {customers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}{" "}
                                                {s.document?.number
                                                    ? `(${s.document.number})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCustomerModal(true)
                                        }
                                        className="px-4 py-3 rounded-lg bg-brand text-white text-sm hover:brightness-110 transition"
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
                                ></input>
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
                                        Comprobante Generico
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
                                    Costo de envío
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
                        {form.items.map((item, i) => (
                            <div key={i} className="grid grid-cols-6 gap-2">
                                <div className="col-span-3">
                                    <ProductSelector
                                        availableStock="y"
                                        value={
                                            item.productId
                                                ? {
                                                      id: item.productId,
                                                      name: item.name || "",
                                                      taxRate: item.taxRate,
                                                      weight: item.weight,
                                                      dimensions:
                                                          item.dimensions,
                                                      image: item.image || "",
                                                  }
                                                : null
                                        }
                                        onChange={(product) => {
                                            console.log(
                                                "en select>>>",
                                                product,
                                            );
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
                                                "unitPrice",
                                                product?.regularPrice
                                                    ? Number(
                                                          product.regularPrice,
                                                      )
                                                    : 0,
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

                                <button onClick={() => removeItem(i)}>✕</button>
                            </div>
                        ))}

                        <button type="button" onClick={addItem}>
                            + Agregar producto
                        </button>
                    </section>

                    {/* Precios */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Precios
                        </h2>
                        <span>Subtotal: </span>
                        <span>${subtotal} </span>

                        <span>IVA: </span>
                        <span>${tax} </span>

                        <span>Envío: </span>
                        <span>${form.shippingMethod.cost} </span>

                        <span className="font-bold">Total:</span>
                        <span className="font-bold">${total}</span>
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
                                    <option value="on_old">En espera</option>
                                    <option value="completed">
                                        Completada
                                    </option>
                                    <option value="cancelled">Cancelada</option>
                                    <option value="refunded">Devuelta</option>
                                    <option value="failed">Fallo</option>
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
                                      : "Guardar compra"}
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
                                        : "Eliminar compra"}
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
                <FormModal title="Cliente">
                    <CustomerForm
                        onCancel={() => setShowCustomerModal(false)}
                        mode="create"
                        modal
                    />
                </FormModal>
            )}
        </>
    );
}
