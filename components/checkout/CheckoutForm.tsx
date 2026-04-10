"use client";

import { useState } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";

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
        cost: 0,
    },
    {
        id: "andreani",
        label: "Envío por Andreani",
        description: "Ingresá tu código postal para cotizar",
        cost: 0,
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shippingCost = shippingMethod === "local_pickup" ? 0 : 0;
    const total = subtotal + shippingCost;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

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
                                </div>
                                <span className="text-sm font-bold text-white shrink-0">
                                    {method.id === "local_pickup"
                                        ? "Gratis"
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

                    <div className="flex flex-col gap-3 mb-4">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex justify-between text-sm gap-2"
                            >
                                <span className="text-gray-400 line-clamp-1 flex-1">
                                    {item.name} x{item.quantity}
                                </span>
                                <span className="text-white shrink-0">
                                    $
                                    {(
                                        item.price * item.quantity
                                    ).toLocaleString("es-AR")}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString("es-AR")}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Envío</span>
                            <span>
                                {shippingMethod === "local_pickup"
                                    ? "Gratis"
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
                        disabled={loading}
                        className="w-full mt-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                        {loading ? "Procesando..." : "Confirmar pedido"}
                    </button>
                </section>
            </div>
        </form>
    );
}
