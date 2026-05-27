import type { Metadata } from "next";
import Link from "next/link";
import {
    Banknote,
    Landmark,
    CreditCard,
    Wallet,
    Clock3,
    ShieldCheck,
} from "lucide-react";

const ONLINE_METHODS = [
    {
        icon: Landmark,
        title: "Transferencia bancaria",
        description:
            "Podés realizar el pago mediante transferencia bancaria o virtual. La acreditación suele ser inmediata.",
    },
    {
        icon: Banknote,
        title: "Pago en efectivo",
        description:
            "Podés coordinar pago en efectivo para retiros o entregas presenciales según disponibilidad.",
    },
    {
        icon: Wallet,
        title: "Mercado Pago (próximamente)",
        description:
            "Muy pronto vas a poder pagar online utilizando Mercado Pago.",
        soon: true,
    },
];

const PRESENTIAL_METHODS = [
    {
        icon: Banknote,
        title: "Efectivo",
    },
    {
        icon: Landmark,
        title: "Transferencia bancaria",
    },
    {
        icon: CreditCard,
        title: "Tarjeta de crédito",
    },
    {
        icon: CreditCard,
        title: "Tarjeta de débito",
    },
];

export const metadata: Metadata = {
    title: "Métodos de pago",
    description:
        "Conocé los métodos de pago disponibles en MGR Techno para compras online y presenciales.",
};

export default function PaymentMethodsPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Metodos de <span className="text-brand">pago</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Elegí la forma de pago que más te convenga para compras
                    online o presenciales.
                </p>
            </div>

            {/* Online Payments */}
            <section className="mb-16">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Pagos online
                    </h2>

                    <p className="text-gray-400">
                        Métodos disponibles para compras realizadas desde la
                        tienda online o coordinadas por WhatsApp.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {ONLINE_METHODS.map((method, index) => {
                        const Icon = method.icon;

                        return (
                            <div
                                key={index}
                                className="
                                    bg-gray-900
                                    border border-gray-800
                                    rounded-2xl
                                    p-6
                                    relative
                                    overflow-hidden
                                "
                            >
                                {method.soon && (
                                    <div
                                        className="
                                            absolute
                                            top-4
                                            right-4
                                            text-xs
                                            font-semibold
                                            px-2.5
                                            py-1
                                            rounded-full
                                            bg-brand/10
                                            border border-brand/20
                                            text-brand
                                        "
                                    >
                                        Próximamente
                                    </div>
                                )}

                                <div
                                    className="
                                        w-14 h-14
                                        rounded-2xl
                                        bg-brand/10
                                        border border-brand/20
                                        flex
                                        items-center
                                        justify-center
                                        mb-5
                                    "
                                >
                                    <Icon className="w-6 h-6 text-brand" />
                                </div>

                                <h3 className="text-white font-semibold text-lg mb-3">
                                    {method.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed">
                                    {method.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Presential Payments */}
            <section className="mb-16">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Pagos presenciales
                    </h2>

                    <p className="text-gray-400">
                        Opciones disponibles para compras con retiro o atención
                        presencial.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {PRESENTIAL_METHODS.map((method, index) => {
                        const Icon = method.icon;

                        return (
                            <div
                                key={index}
                                className="
                                    bg-gray-900
                                    border border-gray-800
                                    rounded-2xl
                                    p-6
                                    flex
                                    flex-col
                                    items-center
                                    text-center
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
                                        mb-4
                                    "
                                >
                                    <Icon className="w-6 h-6 text-brand" />
                                </div>

                                <h3 className="text-white font-semibold">
                                    {method.title}
                                </h3>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Extra info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock3 className="w-6 h-6 text-brand" />

                        <h2 className="text-white font-semibold text-xl">
                            Acreditación
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        Las transferencias suelen acreditarse rápidamente.
                        Algunas operaciones pueden requerir validación manual
                        antes de procesar el pedido.
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
                        Todos los pagos son verificados antes del despacho para
                        garantizar una operación segura y transparente.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Tenés dudas sobre los pagos?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    Podemos ayudarte a elegir el método más conveniente y
                    resolver cualquier consulta antes de confirmar tu compra.
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

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href="/como-comprar"
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
                    Cómo comprar
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
                    Preguntas frecuentes
                </Link>
            </div>
        </main>
    );
}
