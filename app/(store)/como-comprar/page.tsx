export const revalidate = 86400;

import type { Metadata } from "next";
import Link from "next/link";
import {
    ShoppingCart,
    CreditCard,
    PackageCheck,
    Truck,
    MessageCircle,
    ShieldCheck,
} from "lucide-react";

const STEPS = [
    {
        icon: ShoppingCart,
        title: "Elegí tus productos",
        description:
            "Explorá nuestro catálogo y agregá al carrito los productos que necesitás.",
    },
    {
        icon: MessageCircle,
        title: "Consultá compatibilidad",
        description:
            "Si tenés dudas, podés escribirnos por WhatsApp y te ayudamos a elegir correctamente.",
    },
    {
        icon: CreditCard,
        title: "Confirmá tu compra",
        description:
            "Coordinamos el método de pago y verificamos disponibilidad antes de procesar el pedido.",
    },
    {
        icon: PackageCheck,
        title: "Preparamos tu pedido",
        description:
            "Embalamos los productos para garantizar una entrega segura.",
    },
    {
        icon: Truck,
        title: "Recibí tu compra",
        description:
            "Realizamos envíos a todo el país o podés coordinar retiro personalmente.",
    },
];

export const metadata: Metadata = {
    title: "Cómo comprar",
    description:
        "Conocé el proceso de compra en MGR Techno y cómo realizamos envíos, pagos y asesoramiento personalizado.",
};

export default function HowToBuyPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Cómo <span className="text-brand">comprar</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Te acompañamos durante todo el proceso para que comprar en
                    MGR Techno sea simple, rápido y seguro.
                </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                {STEPS.map((step, index) => {
                    const Icon = step.icon;

                    return (
                        <div
                            key={index}
                            className="
                                bg-gray-900
                                border border-gray-800
                                rounded-2xl
                                p-6
                                flex
                                gap-5
                            "
                        >
                            <div
                                className="
                                    w-14 h-14
                                    rounded-2xl
                                    bg-brand/10
                                    border border-brand/20
                                    flex
                                    items-center
                                    justify-center
                                    shrink-0
                                "
                            >
                                <Icon className="w-6 h-6 text-brand" />
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span
                                        className="
                                            text-xs
                                            font-semibold
                                            px-2.5
                                            py-1
                                            rounded-full
                                            bg-white/5
                                            border border-white/10
                                            text-gray-300
                                        "
                                    >
                                        Paso {index + 1}
                                    </span>
                                </div>

                                <h2 className="text-white font-semibold text-lg mb-2">
                                    {step.title}
                                </h2>

                                <p className="text-gray-400 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-white font-semibold text-xl mb-4">
                        Métodos de pago
                    </h2>

                    <p className="text-gray-400 leading-relaxed">
                        Aceptamos transferencias, efectivo y otros medios de
                        pago según disponibilidad. Si necesitás factura A o B,
                        podemos emitir comprobante oficial AFIP.
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-brand" />

                        <h2 className="text-white font-semibold text-xl">
                            Compra segura
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        Todos los productos cuentan con garantía oficial o del
                        proveedor según corresponda. Además, verificamos cada
                        pedido antes del envío.
                    </p>
                </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Necesitás ayuda para comprar?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    Podemos asesorarte sobre compatibilidad, armado de PC,
                    rendimiento, stock y presupuesto para ayudarte a elegir la
                    mejor opción.
                </p>

                <a
                    href="https://wa.me/5493417223739"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                        inline-flex
                        items-center
                        justify-center
                        px-8
                        py-3
                        rounded-xl
                        bg-brand
                        text-white
                        font-medium
                        hover:brightness-110
                        transition-all
                    "
                >
                    Consultar por WhatsApp
                </a>
            </div>

            {/* Bottom CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href="/productos"
                    className="
                        px-8 py-3
                        rounded-xl
                        bg-white/10
                        hover:bg-white/20
                        text-white
                        font-medium
                        transition-all
                    "
                >
                    Ver catálogo
                </Link>

                <Link
                    href="/preguntas-frecuentes"
                    className="
                        px-8 py-3
                        rounded-xl
                        border border-gray-700
                        text-gray-300
                        hover:text-white
                        hover:border-gray-500
                        font-medium
                        transition-all
                    "
                >
                    Ver preguntas frecuentes
                </Link>
            </div>
        </main>
    );
}
