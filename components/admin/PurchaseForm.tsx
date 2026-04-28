"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSelector } from "./ProductSelector";
import { FormModal } from "./FormModal";
import { SupplierForm } from "./SupplierForm";
import { PurchaseDTO } from "@/types/shared/purchase";

interface Props {
    purchase?: any;
    mode: "create" | "edit";
}

type Document = {
    date: string | undefined;
    type: string;
    number: string;
    fileUrl: string | undefined;
};

type PurchaseItem = {
    productId: string;
    name?: string;
    quantity: number;
    unitCost: number;
};

type PurchaseFormState = {
    supplierId: string;
    status: string;
    items: PurchaseItem[];
    document: Document;
    notes: string;
};

export function PurchaseForm({ purchase, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    //useEffect
    useEffect(() => {
        fetch("/api/admin/suppliers")
            .then((res) => res.json())
            .then((data) => {
                setSuppliers(data.suppliers);
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

    const [form, setForm] = useState<PurchaseFormState>({
        supplierId: purchase?.supplierId || "",
        status: purchase?.status || "draft",

        items: purchase?.items || [],

        document: {
            date: purchase?.document?.date || undefined,
            type: purchase?.document?.type || "generic",
            number: purchase?.document?.number || "",
            fileUrl: purchase?.document?.fileUrl || undefined,
        },

        notes: purchase?.notes || "",
    });

    const addItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { productId: "", quantity: 1, unitCost: 0 }],
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
        (acc, item) => acc + item.quantity * item.unitCost,
        0,
    );

    const tax = subtotal * 0.21; // si aplica
    const total = subtotal + tax;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
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

        items: form.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
        })),

        document: form.document,

        notes: form.notes,
        subtotal: subtotal,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(
                mode === "edit"
                    ? `/api/admin/purchases/${purchase.id}`
                    : "/api/admin/purchases",
                {
                    method: mode === "edit" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(
                mode === "edit" ? "Producto actualizado" : "Producto creado",
            );
            if (mode === "create")
                router.push(`/admin/purchases/${data.data._id}`);
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
            await fetch(`/api/admin/purchases/${purchase.id}`, {
                method: "DELETE",
            });
            router.push("/admin/products");
        } finally {
            setDeleting(false);
        }
    };

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

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
                                <label className={labelClass}>Proveedor</label>
                                <div className="flex gap-2">
                                    <select
                                        name="supplierId"
                                        value={form.supplierId}
                                        onChange={handleChange}
                                        className={`${inputClass} flex-1`}
                                        disabled={loadingSuppliers}
                                    >
                                        <option value="">
                                            {loadingSuppliers
                                                ? "Cargando..."
                                                : "Seleccionar proveedor"}
                                        </option>

                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{" "}
                                                {s.taxId ? `(${s.taxId})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowSupplierModal(true)
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
                                    value={form.document.date}
                                    className={inputClass}
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
                                        value={
                                            item.productId
                                                ? {
                                                      id: item.productId,
                                                      name: item.name || "",
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
                                    value={item.unitCost}
                                    onChange={(e) =>
                                        updateItem(
                                            i,
                                            "unitCost",
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
                        <div className="grid grid-cols-2 gap-4">
                            Subtotal: ${subtotal}
                            IVA: ${tax}
                            Total: ${total}
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
                                    <option value="draft">Borrador</option>
                                    <option value="confirmed">
                                        Confirmada
                                    </option>
                                    <option value="received">Recibida</option>
                                    <option value="cancelled">Cancelada</option>
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
                </div>
            </form>
            {showSupplierModal && (
                <FormModal>
                    <SupplierForm
                        onCancel={() => setShowSupplierModal(false)}
                        mode="create"
                    />
                </FormModal>
            )}
        </>
    );
}
