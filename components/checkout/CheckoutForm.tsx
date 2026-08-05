"use client";

import { useState, useEffect, useCallback } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import { signIn } from "next-auth/react";
import { getFinalPrice, getListPriceFinal } from "@/lib/pricing";
import { LoginModal } from "../LoginModal";

interface Props {
    session: Session | null; // <-- Ahora puede ser null
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

    // Protegemos la lectura de billing por si no hay sesión
    const billing = session ? (session as any).billing : null;

    const [form, setForm] = useState({
        email: session?.user?.email || "", // <-- Agregamos el email al estado
        firstName: billing?.firstName || "",
        lastName: billing?.lastName || "",
        address: billing?.address || "",
        city: billing?.city || "",
        state: billing?.state || "",
        postcode: billing?.postcode || "",
        phone: billing?.phone || "",
        documentType: billing?.document?.ducomentType || "DNI",
        documentNumber: billing?.document?.number || "",
    });

    const [shippingMethod, setShippingMethod] = useState<
        "local_shipping" | "local_pickup" | "andreani" | "viacargo"
    >("local_pickup");
    const [paymentMethod, setPaymentMethod] = useState<
        "mercadopago" | "bank_transfer" | "cash"
    >("bank_transfer");

    // Reemplazamos shippingCost escalar por objetos para manejar múltiples cotizaciones
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

    // Calculamos el costo actual basándonos en el método seleccionado y los costos cacheados
    const currentShippingCost =
        shippingMethod === "local_pickup"
            ? 0
            : shippingMethod === "local_shipping"
              ? LOCAL_SHIPPING_COST
              : shippingCosts[shippingMethod] || 0;

    const total = subtotal + currentShippingCost;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;

        // Forzamos a que el código postal sea solo numérico y máximo 4 dígitos
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
                // Cotizamos todos los métodos en paralelo
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
                                        id: i.id,
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

    // Cotizar automáticamente SOLAMENTE cuando el CP alcanza los 4 dígitos
    useEffect(() => {
        if (form.postcode.length === 4) {
            cotizarEnvio(form.postcode);
        } else {
            // Limpiamos los costos si el usuario borra o cambia el código postal
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
                    items: items.map((i) => ({
                        productId: i.id,
                        quantity: i.quantity,
                    })),
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
                        cost: currentShippingCost,
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
                    {/* ---------- AVISO DE LOGIN PARA INVITADOS ---------- */}
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
                                onClick={() => setIsLoginModalOpen(true)} // <-- Abrimos el modal
                                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-600 shrink-0"
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    )}
                    {/* ---------- DATOS PERSONALES ---------- */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-4">
                            Datos personales
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Email (Ocupa toda la fila) */}
                            <div className="sm:col-span-2">
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Correo electrónico
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    readOnly={!!session} // Si ya tiene sesión, no puede cambiar el mail desde acá
                                    required
                                    placeholder="tu@email.com"
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["email"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    } ${session ? "opacity-60 cursor-not-allowed" : ""}`}
                                />
                            </div>
                            {/* Nombre */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Nombre
                                </label>
                                <input
                                    name="firstName"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.firstName"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.firstName"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.firstName"]}
                                    </p>
                                )}
                            </div>

                            {/* Apellido */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Apellido
                                </label>
                                <input
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.lastName"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.lastName"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.lastName"]}
                                    </p>
                                )}
                            </div>

                            {/* Tipo de documento */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Tipo de documento
                                </label>
                                <select
                                    name="documentType"
                                    value={form.documentType}
                                    onChange={handleSelectChange}
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors[
                                            "billing.document.documentType"
                                        ]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CUIL">CUIL</option>
                                    <option value="CUIT">CUIT</option>
                                </select>
                            </div>

                            {/* Número de documento */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Número de documento
                                </label>
                                <input
                                    name="documentNumber"
                                    value={form.documentNumber}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.document.number"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.document.number"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.document.number"]}
                                    </p>
                                )}
                            </div>

                            {/* Dirección */}
                            <div className="sm:col-span-2">
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Dirección
                                </label>
                                <input
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.address"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.address"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.address"]}
                                    </p>
                                )}
                            </div>

                            {/* Ciudad */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Ciudad
                                </label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.city"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.city"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.city"]}
                                    </p>
                                )}
                            </div>

                            {/* Provincia */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Provincia
                                </label>
                                <select
                                    name="state"
                                    value={form.state}
                                    onChange={handleSelectChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.state"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
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
                                {fieldErrors["billing.state"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.state"]}
                                    </p>
                                )}
                            </div>

                            {/* Código postal */}
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
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.postcode"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.postcode"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.postcode"]}
                                    </p>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Teléfono
                                </label>
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border outline-none transition-colors ${
                                        fieldErrors["billing.phone"]
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-gray-700 focus:border-brand"
                                    }`}
                                />
                                {fieldErrors["billing.phone"] && (
                                    <p className="text-xs text-red-400 mt-1.5 font-medium">
                                        {fieldErrors["billing.phone"]}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ---------- MÉTODO DE ENVÍO ---------- */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-4">
                            Método de envío
                        </h2>
                        <div className="flex flex-col gap-3">
                            {SHIPPING_METHODS.map((method) => {
                                const isQuotable =
                                    method.id === "andreani" ||
                                    method.id === "viacargo";
                                const mCost = shippingCosts[method.id];
                                const mError = shippingErrors[method.id];

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

                                            {/* Estado de cotización para métodos que lo requieren */}
                                            {isQuotable && (
                                                <div className="mt-2 min-h-[20px]">
                                                    {quotingShipping && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            <svg
                                                                className="w-3 h-3 animate-spin"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                            >
                                                                <circle
                                                                    className="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                />
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8v8z"
                                                                />
                                                            </svg>
                                                            Cotizando...
                                                        </p>
                                                    )}

                                                    {mError &&
                                                        !quotingShipping && (
                                                            <p className="text-xs text-red-400">
                                                                {mError}
                                                            </p>
                                                        )}

                                                    {mCost !== undefined &&
                                                        !quotingShipping && (
                                                            <p className="text-xs text-green-400 font-medium">
                                                                Costo de envío:
                                                                $
                                                                {mCost.toLocaleString(
                                                                    "es-AR",
                                                                )}
                                                            </p>
                                                        )}

                                                    {form.postcode.length < 4 &&
                                                        !quotingShipping && (
                                                            <div className="flex items-start gap-1.5 mt-1.5">
                                                                <span className="text-amber-400/80 text-xs mt-0.5">
                                                                    ℹ️
                                                                </span>
                                                                <p className="text-xs text-amber-400/90 leading-snug">
                                                                    Ingresá tu{" "}
                                                                    <strong>
                                                                        Código
                                                                        postal
                                                                        (4
                                                                        dígitos)
                                                                    </strong>{" "}
                                                                    arriba para
                                                                    calcular el
                                                                    costo.
                                                                </p>
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Precio a la derecha del radio button */}
                                        <span className="text-sm font-bold text-white shrink-0">
                                            {method.id === "local_pickup"
                                                ? "Gratis"
                                                : method.id === "local_shipping"
                                                  ? `$${LOCAL_SHIPPING_COST.toLocaleString("es-AR")}`
                                                  : mCost !== undefined
                                                    ? `$${mCost.toLocaleString("es-AR")}`
                                                    : ""}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </section>

                    {/* ---------- MÉTODO DE PAGO ---------- */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
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
                                const finalPrice = getFinalPrice(item);
                                const price = usesListPrice
                                    ? getListPriceFinal(finalPrice)
                                    : finalPrice;
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
                                    {shippingMethod === "local_pickup"
                                        ? "Gratis"
                                        : shippingMethod === "local_shipping"
                                          ? `$${LOCAL_SHIPPING_COST.toLocaleString("es-AR")}`
                                          : quotingShipping
                                            ? "Cotizando..."
                                            : currentShippingCost > 0
                                              ? `$${currentShippingCost.toLocaleString("es-AR")}`
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
