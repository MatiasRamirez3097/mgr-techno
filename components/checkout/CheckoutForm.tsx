"use client";

import { useState, useEffect, useCallback } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import { getFinalPrice, getListPriceFinal } from "@/lib/pricing";

interface Props {
    session: Session;
}

const PAYMENT_METHODS = [
    { id: "mercadopago", label: "MercadoPago", icon: "💳" },
    { id: "bacs", label: "Transferencia bancaria", icon: "🏦" },
    { id: "cod", label: "Contra entrega", icon: "📦" },
] as const;

const SHIPPING_METHODS = [
    {
        id: "local_pickup",
        label: "Retiro en local",
        description: "Sin costo · Av. Ejemplo 1234, Rosario",
    },
    {
        id: "andreani",
        label: "Envío por Andreani",
        description: "Ingresá tu código postal para cotizar",
    },
] as const;

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
    const items = useCart((state) => state.items);
    const clearCart = useCart((state) => state.clearCart);

    const billing = (session as any).billing;
    const tipoDocumento = (session as any).tipoDocumento;
    const numeroDocumento = (session as any).numeroDocumento;

    const [form, setForm] = useState({
        first_name: billing?.first_name || "",
        last_name: billing?.last_name || "",
        address_1: billing?.address_1 || "",
        city: billing?.city || "",
        state: billing?.state || "",
        postcode: billing?.postcode || "",
        phone: billing?.phone || "",
        tipo_documento: tipoDocumento || "DNI",
        numero_documento: numeroDocumento || "",
    });

    const [shippingMethod, setShippingMethod] = useState<
        "local_pickup" | "andreani"
    >("local_pickup");
    const [paymentMethod, setPaymentMethod] = useState<
        "mercadopago" | "bacs" | "cod"
    >("mercadopago");
    const [shippingCost, setShippingCost] = useState(0);
    const [quotingShipping, setQuotingShipping] = useState(false);
    const [shippingError, setShippingError] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Determinamos si el método de pago usa precio de lista
    const usesListPrice = paymentMethod === "mercadopago";

    // Subtotal dinámico según método de pago
    const subtotal = items.reduce((acc, i) => {
        const price = usesListPrice
            ? getListPriceFinal(getFinalPrice(i))
            : i.regularPrice;
        return acc + price * i.quantity;
    }, 0);

    const total = subtotal + (shippingMethod === "andreani" ? shippingCost : 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const cotizarEnvio = useCallback(
        async (postcode: string) => {
            if (postcode.length < 4) return;

            setQuotingShipping(true);
            setShippingError("");
            setShippingCost(0);

            try {
                const res = await fetch("/api/shipping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        postcode,
                        items: items.map((i) => ({
                            weight: (i as any).weight || 0,
                            dimensions: (i as any).dimensions || {
                                length: 0,
                                width: 0,
                                height: 0,
                            },
                            price: getFinalPrice(i),
                            quantity: i.quantity,
                        })),
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setShippingError(
                        data.error || "No se pudo cotizar el envío",
                    );
                } else {
                    setShippingCost(data.total);
                }
            } catch {
                setShippingError("Error al cotizar el envío");
            } finally {
                setQuotingShipping(false);
            }
        },
        [items],
    );

    // Cotizar automáticamente cuando cambia CP o método de envío
    useEffect(() => {
        if (shippingMethod === "andreani" && form.postcode.length >= 4) {
            cotizarEnvio(form.postcode);
        } else {
            setShippingCost(0);
            setShippingError("");
        }
    }, [shippingMethod, form.postcode, cotizarEnvio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        // Validar que si eligió Andreani tenga cotización
        if (shippingMethod === "andreani" && shippingCost === 0) {
            setError("Por favor esperá la cotización del envío");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    billing: { ...form, country: "AR" },
                    shipping: { ...form, country: "AR" },
                    items: items.map((i) => ({
                        product_id: parseInt(i.id),
                        quantity: i.quantity,
                        // 👇 precio según método de pago
                        price: usesListPrice
                            ? getListPriceFinal(getFinalPrice(i)).toString()
                            : i.regularPrice.toString(),
                    })),
                    paymentMethod,
                    shippingMethod,
                    shippingCost,
                    meta_data: [
                        {
                            key: "_billing_tipo_documento",
                            value: form.tipo_documento,
                        },
                        {
                            key: "_billing_numero_documento",
                            value: form.numero_documento,
                        },
                    ],
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al procesar el pedido");
                return;
            }

            clearCart();
            router.push(`/checkout/success?order=${data.orderId}`);
        } catch {
            setError("Error de conexión, intentá de nuevo");
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
        <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
            {/* Columna izquierda */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Datos personales */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-lg font-bold text-white mb-4">
                        Datos personales
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Nombre
                            </label>
                            <input
                                name="first_name"
                                value={form.first_name}
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
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                required
                                className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                                Tipo de documento
                            </label>
                            <select
                                name="tipo_documento"
                                value={form.tipo_documento}
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
                                name="numero_documento"
                                value={form.numero_documento}
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
                                name="address_1"
                                value={form.address_1}
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

                {/* Método de envío */}
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-lg font-bold text-white mb-4">
                        Método de envío
                    </h2>
                    <div className="flex flex-col gap-3">
                        {SHIPPING_METHODS.map((method) => (
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
                                    checked={shippingMethod === method.id}
                                    onChange={() =>
                                        setShippingMethod(method.id as any)
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

                                    {/* Cotización Andreani */}
                                    {method.id === "andreani" &&
                                        shippingMethod === "andreani" && (
                                            <div className="mt-2">
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
                                                {shippingError &&
                                                    !quotingShipping && (
                                                        <p className="text-xs text-red-400">
                                                            {shippingError}
                                                        </p>
                                                    )}
                                                {shippingCost > 0 &&
                                                    !quotingShipping && (
                                                        <p className="text-xs text-green-400 font-medium">
                                                            Costo de envío: $
                                                            {shippingCost.toLocaleString(
                                                                "es-AR",
                                                            )}
                                                        </p>
                                                    )}
                                                {!form.postcode &&
                                                    !quotingShipping && (
                                                        <p className="text-xs text-gray-500">
                                                            Ingresá tu código
                                                            postal para cotizar
                                                        </p>
                                                    )}
                                            </div>
                                        )}
                                </div>

                                <span className="text-sm font-bold text-white shrink-0">
                                    {method.id === "local_pickup"
                                        ? "Gratis"
                                        : shippingCost > 0 &&
                                            shippingMethod === "andreani"
                                          ? `$${shippingCost.toLocaleString("es-AR")}`
                                          : "A cotizar"}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Método de pago */}
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
                                <span className="text-lg">{method.icon}</span>
                                <span className="text-sm font-medium text-white">
                                    {method.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>
            </div>

            {/* Columna derecha — resumen */}
            <div className="flex flex-col gap-4">
                <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800 sticky top-24">
                    <h2 className="text-lg font-bold text-white mb-4">
                        Resumen
                    </h2>

                    {/* Items */}
                    <div className="flex flex-col gap-4 mb-4">
                        {items.map((item) => {
                            const finalPrice = getFinalPrice(item);

                            const price = usesListPrice
                                ? getListPriceFinal(finalPrice)
                                : finalPrice;

                            const hasDiscount =
                                item.salePrice < item.regularPrice;

                            return (
                                <div
                                    key={item.id}
                                    className="flex gap-4 items-start"
                                >
                                    {/* 🖼 Imagen */}
                                    <div className="w-14 h-14 bg-gray-800 rounded-md overflow-hidden shrink-0 border border-gray-700">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* 🧠 Info */}
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-sm text-gray-200 line-clamp-2">
                                            {item.name}
                                        </p>

                                        {/* 💰 precio */}
                                        <div className="flex items-center gap-2 mt-1">
                                            {hasDiscount && (
                                                <span className="text-xs text-gray-500 line-through">
                                                    $
                                                    {item.regularPrice.toLocaleString(
                                                        "es-AR",
                                                    )}
                                                </span>
                                            )}

                                            <span className="text-sm text-white font-medium">
                                                ${price.toLocaleString("es-AR")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Totales */}
                    <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
                        {/* Aviso de recargo */}
                        {usesListPrice && (
                            <div className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-1">
                                <span className="text-amber-400 text-xs mt-0.5">
                                    ⚠
                                </span>
                                <p className="text-xs text-amber-400">
                                    Se aplica precio de lista (+10%) para este
                                    método de pago
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
                                    : quotingShipping
                                      ? "Cotizando..."
                                      : shippingCost > 0
                                        ? `$${shippingCost.toLocaleString("es-AR")}`
                                        : "A cotizar"}
                            </span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-white mt-2">
                            <span>Total</span>
                            <span>${total.toLocaleString("es-AR")}</span>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 mt-4">{error}</p>
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
    );
}
