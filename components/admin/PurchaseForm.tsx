"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductSelector } from "./ProductSelector";
import { SearchableEntitySelect } from "./SearchableEntitySelect";
import { FormModal } from "./FormModal";
import { SupplierForm } from "./SupplierForm";
import type { PurchaseDTO } from "@/types/shared/purchase";

interface Props {
    purchase?: PurchaseDTO;
    mode: "create" | "edit";
}

type Document = {
    date: string;
    type: string;
    number: string;
    fileUrl: string | undefined;
};

type PurchaseItem = {
    productId: string;
    name?: string;
    sku?: string;
    availableStock?: number;
    quantity: number;
    unitCost: number;
    taxRate: number;
    image?: string;
};

type PurchaseFormState = {
    supplierId: string;
    status: string;
    items: PurchaseItem[];
    document: Document;
    notes: string;
    currency: "ARS" | "USD";
    exchangeRate: number;
};

interface SupplierOption {
    id: string;
    name: string;
    taxId?: string;
    contactName?: string;
    email?: string;
}

export function PurchaseForm({ purchase, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);

    const isReadOnly =
        mode === "edit" &&
        (purchase?.status === "received" ||
            purchase?.status === "partially_received" ||
            purchase?.status === "cancelled");

    useEffect(() => {
        fetch("/api/admin/suppliers", {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                setSuppliers(data.suppliers || []);
            })
            .catch(() => {})
            .finally(() => setLoadingSuppliers(false));
    }, []);

    const supplierOptions = useMemo(() => {
        return [...suppliers]
            .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", "es", {
                    sensitivity: "base",
                }),
            )
            .map((s) => ({
                value: s.id,
                label: s.name || "Proveedor sin nombre",
                badge: s.taxId ? `CUIT: ${s.taxId}` : undefined,
                sublabel: s.contactName || s.email || undefined,
                searchText: `${s.name || ""} ${s.taxId || ""} ${s.contactName || ""} ${s.email || ""}`,
            }));
    }, [suppliers]);

    const [form, setForm] = useState<PurchaseFormState>({
        supplierId: purchase?.supplierId || "",
        status: purchase?.status || "draft",
        currency: purchase?.currency || "ARS",
        exchangeRate: purchase?.exchangeRate || 1,
        items:
            purchase?.items?.map((item) => ({
                productId:
                    typeof item.productId === "object" &&
                    item.productId !== null &&
                    "id" in item.productId
                        ? (item.productId as { id?: string }).id || ""
                        : String(item.productId || ""),
                name: item.name,
                quantity: item.quantity,
                unitCost: item.unitCost,
                taxRate: item.taxRate ?? 10.5,
            })) || [],

        document: {
            date: purchase?.document?.date
                ? purchase.document.date.split("T")[0]
                : new Date().toISOString().split("T")[0],
            type: purchase?.document?.type || "generic",
            number: purchase?.document?.number || "",
            fileUrl: purchase?.document?.fileUrl || undefined,
        },

        notes: purchase?.notes || "",
    });

    const addItem = () => {
        if (isReadOnly) return;
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                { productId: "", quantity: 1, unitCost: 0, taxRate: 10.5 },
            ],
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        if (isReadOnly) return;
        setForm((prev) => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const removeItem = (index: number) => {
        if (isReadOnly) return;
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const formatCurrency = (value: number, curr = form.currency) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: curr === "USD" ? "USD" : "ARS",
        }).format(value);
    };

    const subtotal =
        Math.round(
            form.items.reduce(
                (acc, item) =>
                    acc +
                    Number(item.quantity || 0) * Number(item.unitCost || 0),
                0,
            ) * 100,
        ) / 100;

    const tax =
        Math.round(
            form.items.reduce((acc, item) => {
                const lineSubtotal =
                    Number(item.quantity || 0) * Number(item.unitCost || 0);
                const rate = Number(item.taxRate ?? 10.5);
                return acc + lineSubtotal * (rate / 100);
            }, 0) * 100,
        ) / 100;

    const total = Math.round((subtotal + tax) * 100) / 100;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        if (isReadOnly) return;
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const buildPayload = () => ({
        supplierId: form.supplierId,
        status: form.status,
        currency: form.currency,
        exchangeRate: form.currency === "USD" ? Number(form.exchangeRate) : 1,

        items: form.items.map((item) => ({
            productId: item.productId,
            name: item.name || "Producto",
            taxRate: Number(item.taxRate ?? 10.5),
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
        })),

        document: form.document,
        notes: form.notes,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (!form.supplierId) {
                throw new Error("Debe seleccionar un proveedor");
            }
            if (form.items.length === 0) {
                throw new Error(
                    "Debe agregar al menos un producto a la compra",
                );
            }
            for (const it of form.items) {
                if (!it.productId) {
                    throw new Error(
                        "Todos los renglones deben tener un producto seleccionado",
                    );
                }
                if (Number(it.quantity) < 1) {
                    throw new Error("La cantidad debe ser de al menos 1");
                }
            }

            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/purchases/${purchase?.id}`
                    : "/api/admin/purchases",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                    credentials: "include",
                },
            );

            const data = await res.json();
            if (!res.ok)
                throw new Error(
                    data.error || "Error al procesar la solicitud",
                );

            setSuccess(
                mode === "edit"
                    ? "Compra actualizada con éxito"
                    : "Compra creada con éxito",
            );
            if (mode === "create") {
                const targetId = data.data?._id || data.data?.id;
                if (targetId) {
                    router.push(`/admin/purchases/${targetId}`);
                } else {
                    router.push("/admin/purchases");
                }
            } else {
                router.refresh();
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                "¿Estás seguro que querés eliminar esta compra? Esta acción no se puede deshacer.",
            )
        )
            return;
        setDeleting(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/purchases/${purchase?.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al eliminar la compra");
            }
            router.push("/admin/purchases");
        } catch (e: unknown) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Error al eliminar la compra",
            );
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    return (
        <>
            {isReadOnly && (
                <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm flex items-center justify-between">
                    <div>
                        <strong>Modo sólo lectura:</strong> Esta compra está en
                        estado{" "}
                        <span className="font-semibold uppercase">
                            {purchase?.status}
                        </span>
                        .
                        {purchase?.status === "received"
                            ? " Ya ha sido recibida completamente y no admite modificaciones."
                            : purchase?.status === "partially_received"
                              ? " Ya comenzó el proceso de recepción de inventario y no se pueden editar los productos."
                              : " Se encuentra cancelada."}
                    </div>
                    {purchase?.status === "partially_received" && (
                        <Link
                            href={`/admin/purchases/${purchase.id}/receive`}
                            className="ml-4 px-3 py-1.5 bg-yellow-500 text-gray-950 font-medium rounded-lg text-xs hover:bg-yellow-400 transition"
                        >
                            Continuar recepción →
                        </Link>
                    )}
                </div>
            )}

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
                                <label className={labelClass}>Proveedor</label>
                                <div className="flex gap-2">
                                    <SearchableEntitySelect
                                        className="flex-1"
                                        options={supplierOptions}
                                        value={form.supplierId}
                                        onChange={(val) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                supplierId: val,
                                            }))
                                        }
                                        disabled={
                                            loadingSuppliers || isReadOnly
                                        }
                                        placeholder={
                                            loadingSuppliers
                                                ? "Cargando proveedores..."
                                                : "Seleccionar proveedor"
                                        }
                                        searchPlaceholder="Buscar por nombre, contacto o CUIT..."
                                        emptyText="No se encontraron proveedores"
                                    />
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowSupplierModal(true)
                                            }
                                            title="Crear nuevo proveedor"
                                            className="px-4 py-3 rounded-lg bg-brand text-white text-sm font-medium hover:brightness-110 transition shrink-0"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Fecha</label>
                                <input
                                    name="date"
                                    value={form.document.date}
                                    className={inputClass}
                                    disabled={isReadOnly}
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
                                    disabled={isReadOnly}
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
                                        Comprobante Genérico (automático)
                                    </option>
                                    <option value="invoice">Factura</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Nro de Comprobante{" "}
                                    {form.document.type === "generic" && (
                                        <span className="text-xs text-gray-500 font-normal">
                                            (se autogenera si está vacío)
                                        </span>
                                    )}
                                </label>
                                <input
                                    className={inputClass}
                                    placeholder={
                                        form.document.type === "generic"
                                            ? "Ej: COM-0001 (autogenerado)"
                                            : "Ej: 0001-00001234"
                                    }
                                    value={form.document.number}
                                    disabled={isReadOnly}
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
                                <label className={labelClass}>Moneda</label>
                                <select
                                    className={inputClass}
                                    value={form.currency}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            currency: e.target.value as
                                                | "ARS"
                                                | "USD",
                                        })
                                    }
                                >
                                    <option value="ARS">Pesos (ARS)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>
                            {form.currency === "USD" && (
                                <div>
                                    <label className={labelClass}>
                                        Cotización USD (tipo de cambio)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.exchangeRate}
                                        disabled={isReadOnly}
                                        className={inputClass}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                exchangeRate: Number(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white">
                                Productos
                            </h2>
                            {mode === "edit" && purchase?.items && (
                                <span className="text-xs text-gray-400">
                                    {purchase.items.reduce(
                                        (acc, i) => acc + (i.quantity || 0),
                                        0,
                                    )}{" "}
                                    unidades totales
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-gray-400 px-1">
                            <div className="col-span-6">Producto</div>
                            <div className="col-span-2">Cantidad</div>
                            <div className="col-span-2">
                                {form.currency === "USD"
                                    ? "Costo USD"
                                    : "Costo ARS"}
                            </div>
                            <div className="col-span-1 text-center">IVA %</div>
                            {!isReadOnly && (
                                <div className="col-span-1 text-center">
                                    Quitar
                                </div>
                            )}
                        </div>

                        {form.items.map((item, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-12 gap-2 items-center mb-2"
                            >
                                <div
                                    className={
                                        isReadOnly ? "col-span-7" : "col-span-6"
                                    }
                                >
                                    {isReadOnly ? (
                                        <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200">
                                            {item.name || "Producto"}
                                        </div>
                                    ) : (
                                        <ProductSelector
                                            statusAll
                                            excludeBundles
                                            value={
                                                item.productId
                                                    ? {
                                                          id: item.productId,
                                                          name: item.name || "",
                                                          sku: item.sku,
                                                          availableStock:
                                                              item.availableStock,
                                                          regularPrice:
                                                              item.unitCost,
                                                          taxRate: item.taxRate,
                                                          image:
                                                              item.image || "",
                                                      }
                                                    : null
                                            }
                                            onChange={(product) => {
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
                                                    "image",
                                                    product?.image || "",
                                                );
                                                updateItem(
                                                    i,
                                                    "taxRate",
                                                    product?.taxRate ?? 10.5,
                                                );
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="1"
                                        disabled={isReadOnly}
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

                                <div className="col-span-2">
                                    <input
                                        min="0"
                                        type="number"
                                        disabled={isReadOnly}
                                        value={item.unitCost}
                                        onChange={(e) =>
                                            updateItem(
                                                i,
                                                "unitCost",
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                        step="0.01"
                                    />
                                </div>

                                <div className="col-span-1 text-center">
                                    <span className="text-xs text-gray-400 font-mono">
                                        {item.taxRate}%
                                    </span>
                                </div>

                                {!isReadOnly && (
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
                                )}
                            </div>
                        ))}

                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={addItem}
                                className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 rounded-lg transition-colors border border-gray-700 flex items-center gap-2"
                            >
                                <span>+</span>
                                <span>Agregar producto</span>
                            </button>
                        )}
                    </section>

                    {/* Precios y totales */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Totales de la compra
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-gray-300">
                            <div>Subtotal ({form.currency}):</div>
                            <div className="text-right font-mono">
                                {formatCurrency(subtotal)}
                            </div>

                            <div>IVA ({form.currency}):</div>
                            <div className="text-right font-mono">
                                {formatCurrency(tax)}
                            </div>

                            <div className="font-bold text-white text-lg border-t border-gray-700 pt-2 mt-2">
                                Total ({form.currency}):
                            </div>
                            <div className="font-bold text-brand text-lg text-right border-t border-gray-700 pt-2 mt-2 font-mono">
                                {formatCurrency(total)}
                            </div>

                            {form.currency === "USD" &&
                                form.exchangeRate > 0 && (
                                    <>
                                        <div className="text-xs text-gray-400 pt-1">
                                            Equivalente en ARS (tipo de cambio{" "}
                                            {form.exchangeRate}):
                                        </div>
                                        <div className="text-xs text-right text-gray-400 pt-1 font-mono">
                                            {formatCurrency(
                                                total * form.exchangeRate,
                                                "ARS",
                                            )}
                                        </div>
                                    </>
                                )}
                        </div>
                    </section>
                </div>

                {/* Columna lateral */}
                <div className="flex flex-col gap-4">
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Estado y acciones
                        </h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelClass}>Estado</label>
                                {isReadOnly ? (
                                    <div className="px-4 py-3 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 capitalize">
                                        {form.status === "partially_received"
                                            ? "Parcialmente recibida"
                                            : form.status === "received"
                                              ? "Recibida"
                                              : form.status === "cancelled"
                                                ? "Cancelada"
                                                : form.status}
                                    </div>
                                ) : (
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="confirmed">
                                            Confirmada
                                        </option>
                                        {mode === "edit" && (
                                            <option value="cancelled">
                                                Cancelada
                                            </option>
                                        )}
                                    </select>
                                )}
                            </div>

                            {mode === "edit" &&
                                (purchase?.status === "confirmed" ||
                                    purchase?.status ===
                                        "partially_received") && (
                                    <Link
                                        href={`/admin/purchases/${purchase.id}/receive`}
                                        className="w-full py-3 rounded-xl text-center text-white font-medium bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>📦</span>
                                        <span>Recepcionar compra</span>
                                    </Link>
                                )}

                            {error && (
                                <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                    {error}
                                </p>
                            )}
                            {success && (
                                <p className="text-sm text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                    {success}
                                </p>
                            )}

                            {!isReadOnly && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                    {loading
                                        ? "Guardando..."
                                        : mode === "edit"
                                          ? "Guardar cambios"
                                          : "Crear compra"}
                                </button>
                            )}

                            {mode === "edit" &&
                                (purchase?.status === "draft" ||
                                    purchase?.status === "cancelled") && (
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
                </div>
            </form>

            {showSupplierModal && (
                <FormModal title="Nuevo Proveedor">
                    <SupplierForm
                        onCancel={() => setShowSupplierModal(false)}
                        onSuccess={(created) => {
                            if (created?.id) {
                                setSuppliers((prev) => [...prev, created]);
                                setForm((prev) => ({
                                    ...prev,
                                    supplierId: created.id,
                                }));
                            }
                            setShowSupplierModal(false);
                        }}
                        mode="create"
                        modal
                    />
                </FormModal>
            )}
        </>
    );
}
