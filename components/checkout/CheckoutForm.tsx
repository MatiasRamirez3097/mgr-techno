"use client";

import { useState, useEffect, useCallback } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
// import { signIn } from "next-auth/react"; // (Lo comento si no lo usás directo acá)
import { getFinalPrice, getListPriceFinal } from "@/lib/pricing";
import { LoginModal } from "../LoginModal";

interface Props {
    session: Session | null;
}

type FieldError = {
    path: string[];
    message: string;
};

const PAYMENT_METHODS = [
    { id: "bank_transfer", label: "Transferencia bancaria", icon: "🏦" },
    { id: "cash", label: "Pago Efectivo", icon: "📦" },
] as const;

const SHIPPING_METHODS = [
    {
        id: "local_pickup",
        label: "Retiro en local",
        description: "Sin costo · Caaguazu 3971, Rosario",
    },
    {
        id: "local_shipping",
        label: "Envio Cadeteria (Rosario)",
        description:
            "Se envia a traves de cadeteria, solo disponible en Rosario, el costo es dentro de los limites de Circunvalacion, consultar por costo fuera de esta zona.",
    },
    {
        id: "viacargo",
        label: "Via Cargo - Retiro en sucursal",
        description: "Ingresa tu código postal para cotizar",
    },
    {
        id: "andreani",
        label: "Envío por Andreani",
        description: "Ingresá tu código postal para cotizar",
    },
] as const;

const LOCAL_SHIPPING_COST = 5000;

const PROVINCIAS = [
    "Buenos Aires",
    "CABA",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Córdoba",
    "Corrientes",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego",
    "Tucumán",
];

export function CheckoutForm({ session }: Props) {
    const router = useRouter();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const items = useCart((state) => state.items);
    const clearCart = useCart((state) => state.clearCart);

    const billing = session ? (session as any).billing : null;

    const [form, setForm] = useState({
        email: session?.user?.email || "",
        firstName: billing?.firstName || "",
        lastName: billing?.lastName || "",
        address: billing?.address || "",
        city: billing?.city || "",
        state: billing?.state || "",
        postcode: billing?.postcode || "",
        phone: billing?.phone || "",
        documentType: billing?.document?.documentType || "DNI",
        documentNumber: billing?.document?.number || "",
    });

    const [shippingMethod, setShippingMethod] = useState<
        "local_shipping" | "local_pickup" | "andreani" | "viacargo"
    >("local_pickup");
    const [paymentMethod, setPaymentMethod] = useState<
        "mercadopago" | "bank_transfer" | "cash"
    >("bank_transfer");

    const [shippingCosts, setShippingCosts] = useState<Record<string, number>>(
        {},
    );
    const [shippingErrors, setShippingErrors] = useState<
        Record<string, string>
    >({});
    const [quotingShipping, setQuotingShipping] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | FieldError[] | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState("");

    const usesListPrice = paymentMethod === "mercadopago";

    const subtotal = items.reduce((acc, i) => {
        const price = usesListPrice
            ? getListPriceFinal(getFinalPrice(i))
            : getFinalPrice(i);
        return acc + price * i.quantity;
    }, 0);

    // ========================================================
    // LÓGICA DE CÁLCULO DE ENVÍO GRATIS Y TAMAÑOS
    // ========================================================
    const hasFreeShippingItem = items.some((i) => i.hasFreeShipping);
    const nonFreeShippingItems = items.filter((i) => !i.hasFreeShipping);

    let shippingModifier = 1; // 1 = 100% del costo
    let shippingMessage: string | null = null;
    let shippingMessageType: "success" | "warning" = "success";

    if (hasFreeShippingItem) {
        if (nonFreeShippingItems.length === 0) {
            shippingModifier = 0;
            shippingMessage = "¡Tenés envío gratis en todos tus productos!";
        } else {
            const hasBulky = nonFreeShippingItems.some(
                (i) => i.shippingSize === "bulky",
            );
            const allSmall = nonFreeShippingItems.every(
                (i) => i.shippingSize === "small",
            );

            if (hasBulky) {
                shippingModifier = 1;
                shippingMessage =
                    "Se anuló el envío gratis porque agregaste productos voluminosos.";
                shippingMessageType = "warning";
            } else if (allSmall) {
                shippingModifier = 0;
                shippingMessage =
                    "¡Mantuviste el envío gratis por combinar con productos pequeños!";
            } else {
                shippingModifier = 0.5; // 50% de descuento
                shippingMessage =
                    "¡Tenés un 50% de descuento en el envío por combinar estos productos!";
            }
        }
    }

    // Costo base devuelto por la API (o fijo)
    const baseShippingCost =
        shippingMethod === "local_pickup"
            ? 0
            : shippingMethod === "local_shipping"
              ? LOCAL_SHIPPING_COST
              : shippingCosts[shippingMethod] || 0;

    // Costo final aplicando el modificador
    const finalShippingCost =
        shippingMethod === "local_pickup"
            ? 0
            : baseShippingCost * shippingModifier;

    const total = subtotal + finalShippingCost;
    // ========================================================

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === "postcode") {
            value = value.replace(/\D/g, "").slice(0, 4);
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const cotizarEnvio = useCallback(
        async (postcode: string) => {
            if (postcode.length < 4) return;

            setQuotingShipping(true);
            setShippingErrors({});

            const methodsToQuote = ["andreani", "viacargo"];
            const newCosts: Record<string, number> = {};
            const newErrors: Record<string, string> = {};

            try {
                await Promise.all(
                    methodsToQuote.map(async (method) => {
                        try {
                            const res = await fetch("/api/shipping", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    postcode,
                                    shippingMethod: method,
                                    items: items.map((i) => ({
                                        id: i.id.split("|")[0],
                                        quantity: i.quantity,
                                    })),
                                }),
                            });

                            const data = await res.json();
                            if (!res.ok) {
                                throw new Error(
                                    data.error ||
                                        `No se pudo cotizar ${method}`,
                                );
                            }

                            newCosts[method] = data.total;
                        } catch (error: any) {
                            newErrors[method] = error.message;
                        }
                    }),
                );

                setShippingCosts(newCosts);
                setShippingErrors(newErrors);
            } finally {
                setQuotingShipping(false);
            }
        },
        [items],
    );

    useEffect(() => {
        if (form.postcode.length === 4) {
            cotizarEnvio(form.postcode);
        } else {
            setShippingCosts({});
            setShippingErrors({});
        }
    }, [form.postcode, cotizarEnvio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        if (
            (shippingMethod === "andreani" || shippingMethod === "viacargo") &&
            !shippingCosts[shippingMethod]
        ) {
            setError(
                "Por favor esperá la cotización del envío o verifica tu código postal.",
            );
            return;
        }

        setLoading(true);
        setError("");
        setFieldErrors({});

        try {
            const paymentMap = {
                mercadopago: { method: "mercadopago", title: "MercadoPago" },
                bank_transfer: {
                    method: "bank_transfer",
                    title: "Transferencia bancaria",
                },
                cash: { method: "cash", title: "Pago contra entrega" },
            };

            const selectedPayment = paymentMap[paymentMethod];

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: "ecommerce",
                    customerId: session
                        ? (session as any).customerId
                        : undefined,
                    customerEmail: form.email,
                    billing: {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        address: form.address,
                        city: form.city,
                        state: form.state,
                        postcode: form.postcode,
                        phone: form.phone,
                        country: "AR",
                        document: {
                            documentType: form.documentType,
                            number: form.documentNumber,
                        },
                    },
                    shipping: {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        address: form.address,
                        city: form.city,
                        state: form.state,
                        postcode: form.postcode,
                        phone: form.phone,
                        country: "AR",
                    },
                    items: items.map((i) => {
                        const [realProductId, inventoryId] = i.id.split("|");
                        return {
                            productId: realProductId,
                            inventoryId: inventoryId || undefined,
                            quantity: i.quantity,
                        };
                    }),
                    payments: [
                        {
                            method: selectedPayment.method,
                            title: selectedPayment.title,
                            status: "pending",
                            amount: total,
                        },
                    ],
                    shippingMethod: {
                        method: shippingMethod,
                        title:
                            shippingMethod === "local_pickup"
                                ? "Retiro en local"
                                : shippingMethod === "local_shipping"
                                  ? "Envio Cadeteria (Rosario)"
                                  : shippingMethod === "viacargo"
                                    ? "Via Cargo"
                                    : "Andreani",
                        cost: baseShippingCost, // <- Mandamos el costo con el descuento aplicado
                    },
                    notes: "",
                }),
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);

                if (Array.isArray(data.error)) {
                    const errors = Object.fromEntries(
                        data.error.map((e: any) => [
                            e.path.join("."),
                            e.message,
                        ]),
                    );
                    setFieldErrors(errors);
                }
                throw new Error(data.error);
            }

            setSuccess("Compra exitosa!");
            clearCart();
            router.push(`/checkout/success?order=${data.order}`);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400">
                <p className="text-lg">Tu carrito está vacío</p>
            </div>
        );
    }

    return (
        <>
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* ... (SECCIÓN DE AVISO DE LOGIN Y DATOS PERSONALES IGUAL QUE ANTES) ... */}
                    {!session && (
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-white font-medium">
                                    ¿Ya tenés una cuenta?
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Iniciá sesión para cargar tus datos más
                                    rápido y hacer seguimiento de tu pedido.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLoginModalOpen(true)}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-600 shrink-0"
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    )}

                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        {/* Contenido de datos personales omitido por brevedad, se mantiene igual */}
                        <h2 className="text-lg font-bold text-white mb-4">
                            Datos personales
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Correo electrónico
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    readOnly={!!session}
                                    required
                                    placeholder="tu@email.com"
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["email"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    } ${session ? "opacity-60 cursor-not-allowed" : ""}`}
                                />
                            </div>
                            {/* ... Resto de los inputs de datos personales ... */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Nombre
                                </label>
                                <input
                                    name="firstName"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Apellido
                                </label>
                                <input
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Tipo documento
                                </label>
                                <select
                                    name="documentType"
                                    value={form.documentType}
                                    onChange={handleSelectChange}
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CUIL">CUIL</option>
                                    <option value="CUIT">CUIT</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Número de documento
                                </label>
                                <input
                                    name="documentNumber"
                                    value={form.documentNumber}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Dirección
                                </label>
                                <input
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Ciudad
                                </label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Provincia
                                </label>
                                <select
                                    name="state"
                                    value={form.state}
                                    onChange={handleSelectChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                >
                                    <option value="">
                                        Seleccioná una provincia
                                    </option>
                                    {PROVINCIAS.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Código postal
                                </label>
                                <input
                                    name="postcode"
                                    value={form.postcode}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: 2000"
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Teléfono
                                </label>
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ---------- MÉTODO DE ENVÍO ---------- */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-4">
                            Método de envío
                        </h2>

                        {/* MENSAJE INFORMATIVO DE BENEFICIO DE ENVÍO */}
                        {shippingMessage &&
                            shippingMethod !== "local_pickup" && (
                                <div
                                    className={`mb-5 p-4 rounded-xl border flex gap-3 text-sm font-medium ${
                                        shippingMessageType === "warning"
                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                            : "bg-green-500/10 border-green-500/20 text-green-400"
                                    }`}
                                >
                                    <span className="text-lg shrink-0 mt-0.5">
                                        {shippingMessageType === "warning"
                                            ? "⚠️"
                                            : "🚚"}
                                    </span>
                                    <p className="leading-snug">
                                        {shippingMessage}
                                    </p>
                                </div>
                            )}

                        <div className="flex flex-col gap-3">
                            {SHIPPING_METHODS.map((method) => {
                                const isQuotable =
                                    method.id === "andreani" ||
                                    method.id === "viacargo";
                                const rawCost = shippingCosts[method.id];
                                const mError = shippingErrors[method.id];

                                // Calculamos el precio de CADA método para mostrarlo en la lista
                                const displayCost =
                                    method.id === "local_shipping"
                                        ? LOCAL_SHIPPING_COST * shippingModifier
                                        : rawCost !== undefined
                                          ? rawCost * shippingModifier
                                          : undefined;

                                return (
                                    <label
                                        key={method.id}
                                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                                            shippingMethod === method.id
                                                ? "border-brand bg-brand/10"
                                                : "border-gray-700 hover:border-gray-600"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="shippingMethod"
                                            value={method.id}
                                            checked={
                                                shippingMethod === method.id
                                            }
                                            onChange={() =>
                                                setShippingMethod(
                                                    method.id as any,
                                                )
                                            }
                                            className="mt-1 accent-brand"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">
                                                {method.label}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {method.description}
                                            </p>

                                            {isQuotable && (
                                                <div className="mt-2 min-h-[20px]">
                                                    {quotingShipping && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            Cotizando...
                                                        </p>
                                                    )}

                                                    {mError &&
                                                        !quotingShipping && (
                                                            <p className="text-xs text-red-400">
                                                                {mError}
                                                            </p>
                                                        )}

                                                    {displayCost !==
                                                        undefined &&
                                                        !quotingShipping && (
                                                            <p className="text-xs text-green-400 font-medium">
                                                                Costo de envío:{" "}
                                                                {displayCost ===
                                                                0
                                                                    ? "Gratis"
                                                                    : `$${displayCost.toLocaleString("es-AR")}`}
                                                            </p>
                                                        )}

                                                    {form.postcode.length < 4 &&
                                                        !quotingShipping && (
                                                            <p className="text-xs text-amber-400/90 leading-snug mt-1.5">
                                                                ℹ️ Ingresá tu
                                                                código postal (4
                                                                dígitos) arriba.
                                                            </p>
                                                        )}
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-sm font-bold text-white shrink-0">
                                            {method.id === "local_pickup" ||
                                            displayCost === 0
                                                ? "Gratis"
                                                : displayCost !== undefined
                                                  ? `$${displayCost.toLocaleString("es-AR")}`
                                                  : ""}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </section>

                    {/* ---------- MÉTODO DE PAGO ---------- */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        {/* Contenido omitido por brevedad, se mantiene igual */}
                        <h2 className="text-lg font-bold text-white mb-4">
                            Método de pago
                        </h2>
                        <div className="flex flex-col gap-3">
                            {PAYMENT_METHODS.map((method) => (
                                <label
                                    key={method.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                                        paymentMethod === method.id
                                            ? "border-brand bg-brand/10"
                                            : "border-gray-700 hover:border-gray-600"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method.id}
                                        checked={paymentMethod === method.id}
                                        onChange={() =>
                                            setPaymentMethod(method.id as any)
                                        }
                                        className="accent-brand"
                                    />
                                    <span className="text-lg">
                                        {method.icon}
                                    </span>
                                    <span className="text-sm font-medium text-white">
                                        {method.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ---------- COLUMNA DERECHA: RESUMEN ---------- */}
                <div className="flex flex-col gap-4">
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 sticky top-24">
                        <h2 className="text-lg font-bold text-white mb-4">
                            Resumen
                        </h2>

                        <div className="flex flex-col gap-4 mb-4">
                            {items.map((item) => {
                                const localFinalPrice = getFinalPrice(item);
                                const price = usesListPrice
                                    ? getListPriceFinal(localFinalPrice)
                                    : localFinalPrice;
                                return (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 items-start"
                                    >
                                        <div className="w-14 h-14 bg-gray-800 rounded-md overflow-hidden shrink-0 border border-gray-700">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-sm text-gray-200 line-clamp-2">
                                                {item.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.salePrice && (
                                                    <span className="text-xs text-gray-500 line-through">
                                                        $
                                                        {item.regularPrice.toLocaleString(
                                                            "es-AR",
                                                        )}
                                                    </span>
                                                )}
                                                <span className="text-sm text-white font-medium">
                                                    $
                                                    {price.toLocaleString(
                                                        "es-AR",
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
                            {usesListPrice && (
                                <div className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-1">
                                    <span className="text-amber-400 text-xs mt-0.5">
                                        ⚠
                                    </span>
                                    <p className="text-xs text-amber-400">
                                        Se aplica precio de lista (+10%) para
                                        este método de pago
                                    </p>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Subtotal</span>
                                <span>${subtotal.toLocaleString("es-AR")}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Envío</span>
                                <span>
                                    {shippingMethod === "local_pickup" ||
                                    finalShippingCost === 0
                                        ? "Gratis"
                                        : quotingShipping
                                          ? "Cotizando..."
                                          : shippingMethod ===
                                                  "local_shipping" ||
                                              shippingCosts[shippingMethod] !==
                                                  undefined
                                            ? `$${finalShippingCost.toLocaleString("es-AR")}`
                                            : "Ingresa tu CP"}
                                </span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-white mt-2">
                                <span>Total</span>
                                <span>${total.toLocaleString("es-AR")}</span>
                            </div>
                        </div>

                        {error &&
                            (Array.isArray(error) ? (
                                error.map((e, i) => (
                                    <p
                                        key={i}
                                        className="text-sm text-red-400 mt-2"
                                    >
                                        {e.message}
                                    </p>
                                ))
                            ) : (
                                <p className="text-sm text-red-400 mt-2">
                                    {error}
                                </p>
                            ))}

                        {success && (
                            <p className="text-sm text-green-400 mt-2">
                                {success}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || quotingShipping}
                            className="w-full mt-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                        >
                            {loading ? "Procesando..." : "Confirmar pedido"}
                        </button>
                    </section>
                </div>
            </form>
        </>
    );
}
