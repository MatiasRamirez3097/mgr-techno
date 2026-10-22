"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductSelector, type ProductOption } from "@/components/admin/ProductSelector";
import { SearchableEntitySelect } from "@/components/admin/SearchableEntitySelect";
import { FormModal } from "@/components/admin/FormModal";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { DistributorProductSelectorModal } from "./DistributorProductSelectorModal";
import type { QuoteDTO, QuoteItemDTO, QuoteCustomerSnapshot } from "@/types/shared/quote";

interface Props {
    quote?: QuoteDTO;
    mode: "create" | "edit";
}

export function QuoteForm({ quote, mode }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [converting, setConverting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Clientes
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    // Modal de distribuidores
    const [showDistributorModal, setShowDistributorModal] = useState(false);

    // Estado del selector inline de producto interno
    const [showInternalSelector, setShowInternalSelector] = useState(false);

    useEffect(() => {
        fetch("/api/admin/customers", { credentials: "include" })
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
                return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
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
                    searchText: `${fullName} ${docNumber} ${c.email || ""}`,
                };
            });
    }, [customers]);

    // Helpers de fechas
    const getDefaultExpirationDate = (daysAhead = 15) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        return d.toISOString().split("T")[0];
    };

    const [form, setForm] = useState({
        customerId: quote?.customerId || "",
        customer: quote?.customer || {
            name: "",
            email: "",
            phone: "",
            documentType: "DNI",
            documentNumber: "",
            ivaCondition: "Consumidor Final",
            address: { street: "", number: "", city: "", state: "", zip: "" },
        },
        date: quote?.date
            ? quote.date.split("T")[0]
            : new Date().toISOString().split("T")[0],
        expirationDate: quote?.expirationDate
            ? quote.expirationDate.split("T")[0]
            : getDefaultExpirationDate(15),
        status: quote?.status || "draft",
        currency: quote?.currency || "ARS",
        exchangeRate: quote?.exchangeRate || 1,
        items: (quote?.items || []) as QuoteItemDTO[],
        notes: quote?.notes || "",
        terms:
            quote?.terms ||
            "Presupuesto válido hasta la fecha de vencimiento. Precios sujetos a modificación sin previo aviso en caso de variación cambiaria.",
    });

    // Sincronizar snapshot cuando se selecciona un cliente existente
    const handleSelectCustomer = (customerId: string) => {
        const found = customers.find((c) => c.id === customerId);
        if (found) {
            const fullName = `${found.firstName || ""} ${found.lastName || ""}`.trim();
            setForm((prev) => ({
                ...prev,
                customerId,
                customer: {
                    id: found.id,
                    name: fullName || found.username || "Cliente",
                    email: found.email || "",
                    phone: found.billing?.phone || "",
                    documentType: found.document?.documentType || "DNI",
                    documentNumber: found.document?.number || "",
                    ivaCondition: found.billing?.ivaCondition || "Consumidor Final",
                    address: {
                        street: found.billing?.address_1 || "",
                        number: "",
                        city: found.billing?.city || "",
                        state: found.billing?.state || "",
                        zip: found.billing?.postcode || "",
                    },
                },
            }));
        } else {
            setForm((prev) => ({ ...prev, customerId }));
        }
    };

    // Cálculos de totales (Precio ingresado CON IVA incluido)
    const { subtotal, ivaTotal, total } = useMemo(() => {
        let sub = 0;
        let iva = 0;
        let tot = 0;
        form.items.forEach((it) => {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const unit = Math.max(0, Number(it.unitPrice) || 0);
            const disc = Math.max(0, Number(it.discount) || 0);
            const tax = Number(it.taxRate) ?? 10.5;

            const lineGross = Math.max(0, unit * qty - disc);
            const lineNet = tax > 0 ? lineGross / (1 + tax / 100) : lineGross;
            const lineTax = lineGross - lineNet;

            sub += lineNet;
            iva += lineTax;
            tot += lineGross;
        });

        return {
            subtotal: Math.round(sub * 100) / 100,
            ivaTotal: Math.round(iva * 100) / 100,
            total: Math.round(tot * 100) / 100,
        };
    }, [form.items]);

    // Items handlers
    const updateItem = (index: number, field: keyof QuoteItemDTO, value: any) => {
        setForm((prev) => {
            const items = [...prev.items];
            const updated = { ...items[index], [field]: value };
            const qty = Math.max(1, Number(updated.quantity) || 1);
            const unit = Math.max(0, Number(updated.unitPrice) || 0);
            const disc = Math.max(0, Number(updated.discount) || 0);
            updated.subtotal = Math.max(0, unit * qty - disc);
            items[index] = updated;
            return { ...prev, items };
        });
    };

    const removeItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const addInternalProduct = (prod: ProductOption) => {
        const unit = prod.effectivePrice ?? prod.salePrice ?? prod.regularPrice ?? 0;
        const newItem: QuoteItemDTO = {
            origin: "internal",
            productId: prod.id,
            name: prod.name,
            sku: prod.sku || "",
            image: prod.image || undefined,
            quantity: 1,
            costPrice: 0,
            unitPrice: unit,
            taxRate: prod.taxRate ?? 10.5,
            discount: 0,
            subtotal: unit,
        };

        setForm((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
        setShowInternalSelector(false);
    };

    const addDistributorItem = (distItem: {
        name: string;
        sku: string;
        image?: string;
        distributor: string;
        distributorSku: string;
        costPrice: number;
        unitPrice: number;
        quantity: number;
        taxRate: number;
    }) => {
        const newItem: QuoteItemDTO = {
            origin: "distributor",
            name: distItem.name,
            sku: distItem.sku,
            image: distItem.image,
            distributor: distItem.distributor,
            distributorSku: distItem.distributorSku,
            costPrice: distItem.costPrice,
            unitPrice: distItem.unitPrice,
            quantity: distItem.quantity,
            taxRate: distItem.taxRate,
            discount: 0,
            subtotal: distItem.unitPrice * distItem.quantity,
        };

        setForm((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    };

    const addManualItem = () => {
        const newItem: QuoteItemDTO = {
            origin: "manual",
            name: "",
            sku: "",
            quantity: 1,
            unitPrice: 0,
            taxRate: 10.5,
            discount: 0,
            subtotal: 0,
        };

        setForm((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    };

    // Submit handler
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.customer.name.trim()) {
            setError("Debes indicar el nombre del cliente");
            return;
        }

        if (form.items.length === 0) {
            setError("Debes agregar al menos un ítem al presupuesto");
            return;
        }

        for (const it of form.items) {
            if (!it.name.trim()) {
                setError("Todos los ítems deben tener un nombre o descripción");
                return;
            }
        }

        setLoading(true);

        try {
            const url = mode === "edit" ? `/api/admin/quotes/${quote?.id}` : "/api/admin/quotes";
            const method = mode === "edit" ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al guardar presupuesto");
            }

            setSuccess("Presupuesto guardado con éxito");
            if (mode === "create" && data.quote?.id) {
                router.push(`/admin/quotes/${data.quote.id}`);
            } else {
                router.refresh();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setLoading(false);
        }
    }

    // Convertir a Orden
    async function handleConvert() {
        if (!quote?.id) return;
        if (!confirm("¿Deseas convertir este presupuesto en una Orden de venta? Se creará una orden con estos datos y productos.")) {
            return;
        }

        setConverting(true);
        setError("");

        try {
            const res = await fetch(`/api/admin/quotes/${quote.id}/convert`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al convertir presupuesto");
            }

            router.push(`/admin/orders/${data.orderId}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al convertir");
        } finally {
            setConverting(false);
        }
    }

    // Eliminar
    async function handleDelete() {
        if (!quote?.id) return;
        if (!confirm("¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.")) {
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/quotes/${quote.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/admin/quotes");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        } finally {
            setDeleting(false);
        }
    }

    const inputClass =
        "w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors";
    const labelClass = "text-sm text-gray-400 mb-1 block";

    const isExpired = new Date(form.expirationDate).getTime() < Date.now();

    return (
        <>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Principal (2 columnas) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* CLIENTE */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>👤</span>
                                <span>Datos del Cliente</span>
                            </h2>
                            {form.customerId && (
                                <span className="text-xs text-brand font-medium">
                                    Cliente vinculado del sistema
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Seleccionar cliente registrado</label>
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
                                                : "Buscar por nombre, apellido, DNI/CUIT o email..."
                                        }
                                        searchPlaceholder="Escribí para buscar cliente..."
                                        emptyText="No se encontraron clientes"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerModal(true)}
                                        title="Crear nuevo cliente"
                                        className="px-4 py-3 rounded-lg bg-brand text-white text-sm font-medium hover:brightness-110 transition shrink-0"
                                    >
                                        + Nuevo
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Nombre / Razón Social *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.customer.name}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            customer: { ...prev.customer, name: e.target.value },
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="Nombre completo o Empresa"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Email</label>
                                <input
                                    type="email"
                                    value={form.customer.email || ""}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            customer: { ...prev.customer, email: e.target.value },
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Teléfono / WhatsApp</label>
                                <input
                                    type="text"
                                    value={form.customer.phone || ""}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            customer: { ...prev.customer, phone: e.target.value },
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="Ej: +54 9 341..."
                                />
                            </div>

                            <div>
                                <label className={labelClass}>DNI / CUIT</label>
                                <div className="flex gap-2">
                                    <select
                                        value={form.customer.documentType || "DNI"}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                customer: {
                                                    ...prev.customer,
                                                    documentType: e.target.value,
                                                },
                                            }))
                                        }
                                        className="w-24 bg-gray-800 text-white text-sm rounded-lg px-2 border border-gray-700"
                                    >
                                        <option value="DNI">DNI</option>
                                        <option value="CUIT">CUIT</option>
                                        <option value="CUIL">CUIL</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={form.customer.documentNumber || ""}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                customer: {
                                                    ...prev.customer,
                                                    documentNumber: e.target.value,
                                                },
                                            }))
                                        }
                                        className={inputClass}
                                        placeholder="Número de documento"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Domicilio / Localidad</label>
                                <input
                                    type="text"
                                    value={form.customer.address?.street || ""}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            customer: {
                                                ...prev.customer,
                                                address: {
                                                    ...prev.customer.address,
                                                    street: e.target.value,
                                                },
                                            },
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="Calle, número, ciudad (opcional para el presupuesto)"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ITEMS DEL PRESUPUESTO */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>📦</span>
                                    <span>Productos e Ítems del Presupuesto</span>
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Podés combinar productos del catálogo, mayoristas (Elit / NewBytes) o conceptos manuales
                                </p>
                            </div>

                            {/* Botones para agregar items */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInternalSelector(true)}
                                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition flex items-center gap-1.5"
                                >
                                    <span>🏪</span>
                                    <span>+ Catálogo Propio</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDistributorModal(true)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-xs font-semibold text-blue-300 border border-blue-500/30 transition flex items-center gap-1.5"
                                >
                                    <span>🚚</span>
                                    <span>+ Mayoristas</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={addManualItem}
                                    className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-xs font-semibold text-yellow-300 border border-yellow-500/30 transition flex items-center gap-1.5"
                                >
                                    <span>✍️</span>
                                    <span>+ Manual / Servicio</span>
                                </button>
                            </div>
                        </div>

                        {/* Selector inline para catálogo interno */}
                        {showInternalSelector && (
                            <div className="mb-4 p-4 rounded-xl bg-gray-800/80 border border-brand/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-brand">
                                        Seleccionar producto de la tienda:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowInternalSelector(false)}
                                        className="text-xs text-gray-400 hover:text-white"
                                    >
                                        Cancelar ✕
                                    </button>
                                </div>
                                <ProductSelector
                                    value={null}
                                    statusAll
                                    onChange={(prod) => {
                                        if (prod) addInternalProduct(prod);
                                    }}
                                />
                            </div>
                        )}

                        {/* Tabla de Items */}
                        {form.items.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl text-gray-400">
                                <span className="text-3xl block mb-2">📋</span>
                                <p className="text-sm font-medium text-white mb-1">
                                    No hay ítems agregados al presupuesto
                                </p>
                                <p className="text-xs text-gray-500">
                                    Usá los botones superiores para sumar productos del catálogo, consultar mayoristas o tipear un ítem manual.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {form.items.map((item, idx) => {
                                    const originBadge =
                                        item.origin === "distributor" ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                {item.distributor || "DISTRIB"}
                                            </span>
                                        ) : item.origin === "manual" ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                                MANUAL
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                TIENDA
                                            </span>
                                        );

                                    const lineGross = Math.max(0, (item.unitPrice || 0) * (item.quantity || 1) - (item.discount || 0));
                                    const lineTaxRate = Number(item.taxRate) || 0;
                                    const lineNet = lineTaxRate > 0 ? lineGross / (1 + lineTaxRate / 100) : lineGross;
                                    const lineIva = lineGross - lineNet;

                                    return (
                                        <div
                                            key={idx}
                                            className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3"
                                        >
                                            {/* Imagen del producto si existe */}
                                            <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 overflow-hidden p-1 self-start md:self-center">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        referrerPolicy="no-referrer"
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-base text-gray-600">📦</span>
                                                )}
                                            </div>

                                            {/* Descripción y SKU */}
                                            <div className="flex-1 min-w-0 w-full md:w-auto">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {originBadge}
                                                    {item.sku && (
                                                        <span className="text-[11px] font-mono text-gray-400">
                                                             SKU: {item.sku}
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                                                    placeholder="Descripción del ítem..."
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-medium outline-none focus:border-brand"
                                                />
                                            </div>

                                            {/* Cantidad */}
                                            <div className="w-20 shrink-0">
                                                <label className="text-[11px] text-gray-400 block mb-1">Cant.</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        updateItem(idx, "quantity", Math.max(1, Number(e.target.value) || 1))
                                                    }
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono text-center outline-none focus:border-brand"
                                                />
                                            </div>

                                            {/* Precio Unitario */}
                                            <div className="w-32 shrink-0">
                                                <label className="text-[11px] text-gray-400 block mb-1">Precio Unit. c/IVA ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) =>
                                                        updateItem(idx, "unitPrice", Number(e.target.value) || 0)
                                                    }
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono text-right outline-none focus:border-brand font-semibold"
                                                />
                                            </div>

                                            {/* Alícuota IVA */}
                                            <div className="w-24 shrink-0">
                                                <label className="text-[11px] text-gray-400 block mb-1">IVA %</label>
                                                <select
                                                    value={item.taxRate}
                                                    onChange={(e) =>
                                                        updateItem(idx, "taxRate", Number(e.target.value))
                                                    }
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand"
                                                >
                                                    <option value={10.5}>10.5%</option>
                                                    <option value={21}>21%</option>
                                                    <option value={0}>0% (Exento)</option>
                                                </select>
                                            </div>

                                            {/* Subtotal calculado */}
                                            <div className="w-28 shrink-0 text-right">
                                                <span className="text-[11px] text-gray-400 block mb-1">Subtotal</span>
                                                <span className="text-sm font-bold text-white font-mono block py-0.5">
                                                    ${(item.subtotal || 0).toLocaleString("es-AR")}
                                                </span>
                                                {lineTaxRate > 0 && (
                                                    <span className="text-[10px] text-gray-400 font-mono block">
                                                        IVA: ${Math.round(lineIva).toLocaleString("es-AR")}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quitar */}
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition shrink-0 self-end md:self-center"
                                                title="Quitar ítem"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* TÉRMINOS Y OBSERVACIONES */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <span>📝</span>
                            <span>Notas y Condiciones Comerciales</span>
                        </h2>

                        <div>
                            <label className={labelClass}>Cláusula de Validez y Términos (visible en el PDF)</label>
                            <textarea
                                rows={2}
                                value={form.terms}
                                onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Observaciones / Notas adicionales (visible en el PDF)</label>
                            <textarea
                                rows={2}
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="Ej: No incluye armado. Entrega en 48hs hábiles. Formas de pago acordadas..."
                                className={inputClass}
                            />
                        </div>
                    </section>
                </div>

                {/* Columna Lateral (1 columna) */}
                <div className="flex flex-col gap-6">
                    {/* FECHAS Y ESTADO */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
                        <h2 className="text-base font-bold text-white">Vigencia del Presupuesto</h2>

                        <div>
                            <label className={labelClass}>Fecha de Emisión</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className={labelClass}>Fecha de Vencimiento *</label>
                                {isExpired && (
                                    <span className="text-[11px] font-bold text-red-400">
                                        ⚠️ VENCIDO
                                    </span>
                                )}
                            </div>
                            <input
                                type="date"
                                required
                                value={form.expirationDate}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, expirationDate: e.target.value }))
                                }
                                className={`${inputClass} ${isExpired ? "border-red-500/50 bg-red-500/10" : ""}`}
                            />

                            {/* Accesos rápidos de vencimiento */}
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-[11px] text-gray-500">Sumar:</span>
                                {[7, 15, 30].map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                expirationDate: getDefaultExpirationDate(days),
                                            }))
                                        }
                                        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 border border-gray-700 transition"
                                    >
                                        +{days}d
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Estado</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
                                className={inputClass}
                            >
                                <option value="draft">Borrador</option>
                                <option value="sent">Enviado al cliente</option>
                                <option value="accepted">Aceptado</option>
                                <option value="rejected">Rechazado</option>
                                <option value="converted">Convertido a Venta</option>
                            </select>
                        </div>
                    </section>

                    {/* MONEDA Y TOTALES */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
                        <h2 className="text-base font-bold text-white">Totales</h2>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={labelClass}>Moneda</label>
                                <select
                                    value={form.currency}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, currency: e.target.value as any }))
                                    }
                                    className={inputClass}
                                >
                                    <option value="ARS">Pesos (ARS)</option>
                                    <option value="USD">Dólares (USD)</option>
                                </select>
                            </div>

                            {form.currency === "USD" && (
                                <div>
                                    <label className={labelClass}>Cotiz. USD</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.exchangeRate}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, exchangeRate: Number(e.target.value) || 1 }))
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-800 pt-3 space-y-2 text-sm text-gray-300">
                            <div className="flex justify-between">
                                <span>Subtotal neto (sin IVA):</span>
                                <span className="font-mono">${subtotal.toLocaleString("es-AR")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>IVA discriminado:</span>
                                <span className="font-mono text-blue-400 font-semibold">${ivaTotal.toLocaleString("es-AR")}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-white border-t border-gray-700 pt-2">
                                <span>Total final ({form.currency}):</span>
                                <span className="font-mono text-brand text-lg">
                                    ${total.toLocaleString("es-AR")}
                                </span>
                            </div>
                            {form.currency === "USD" && form.exchangeRate > 1 && (
                                <div className="text-xs text-gray-500 text-right font-mono">
                                    Aprox. ${(total * form.exchangeRate).toLocaleString("es-AR")} ARS
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                {error}
                            </p>
                        )}
                        {success && (
                            <p className="text-xs text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                {success}
                            </p>
                        )}

                        {/* BOTÓN GUARDAR */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-brand hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                        >
                            <span>💾</span>
                            <span>{loading ? "Guardando..." : mode === "edit" ? "Guardar Cambios" : "Crear Presupuesto"}</span>
                        </button>

                        {/* ACCIONES DEL MODO EDIT */}
                        {mode === "edit" && quote?.id && (
                            <div className="space-y-2 pt-2 border-t border-gray-800">
                                {/* DESCARGAR PDF LETRA X */}
                                <a
                                    href={`/api/admin/quotes/${quote.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                                >
                                    <span>📄</span>
                                    <span>Descargar / Imprimir PDF (Letra X)</span>
                                </a>

                                {/* CONVERTIR A VENTA / ORDEN */}
                                {quote.status !== "converted" && (
                                    <button
                                        type="button"
                                        onClick={handleConvert}
                                        disabled={converting}
                                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                                    >
                                        <span>🛍️</span>
                                        <span>{converting ? "Convirtiendo..." : "Convertir a Venta / Orden"}</span>
                                    </button>
                                )}

                                {quote.orderId && (
                                    <Link
                                        href={`/admin/orders/${quote.orderId}`}
                                        className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-400 text-xs font-medium text-center block transition border border-emerald-500/20"
                                    >
                                        ✓ Ver Orden de Venta vinculada →
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="w-full py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                                >
                                    {deleting ? "Eliminando..." : "Eliminar Presupuesto"}
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </form>

            {/* Modal de Crear Cliente */}
            {showCustomerModal && (
                <FormModal title="Nuevo Cliente">
                    <CustomerForm
                        onCancel={() => setShowCustomerModal(false)}
                        onSuccess={(created) => {
                            if (created?.id) {
                                setCustomers((prev) => [...prev, created]);
                                handleSelectCustomer(created.id);
                            }
                            setShowCustomerModal(false);
                        }}
                        mode="create"
                        modal
                    />
                </FormModal>
            )}

            {/* Modal de Mayoristas */}
            <DistributorProductSelectorModal
                isOpen={showDistributorModal}
                onClose={() => setShowDistributorModal(false)}
                onSelect={addDistributorItem}
            />
        </>
    );
}
