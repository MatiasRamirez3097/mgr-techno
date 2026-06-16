export const revalidate = 86400;

import type { Metadata } from "next";
import Link from "next/link";
import {
    MapPin,
    Map,
    Truck,
    Package,
    Clock,
    CalendarClock,
} from "lucide-react";

const LOCAL_SHIPPING = [
    {
        icon: MapPin,
        title: "Rosario (Dentro de Circunvalación)",
        description:
            "Envío por cadetería con precio fijo. Rápido y seguro directo a tu domicilio.",
    },
    {
        icon: Map,
        title: "Rosario (Fuera de Circunvalación)",
        description:
            "Envío por cadetería. Consultanos por WhatsApp para cotizar el valor exacto según tu ubicación.",
    },
];

const NATIONAL_SHIPPING = [
    {
        icon: Truck,
        title: "Resto del país (Andreani)",
        description:
            "Envíos a toda la Argentina a través de Correo Andreani con código de seguimiento.",
    },
];

export const metadata: Metadata = {
    title: "Envíos y Entregas",
    description:
        "Conocé nuestras zonas de cobertura, métodos de envío por cadetería en Rosario y envíos a todo el país por Andreani.",
};

export default function ShippingMethodsPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Métodos de <span className="text-brand">envío</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Llevamos la tecnología a tu puerta. Conocé nuestras opciones
                    para Rosario y el resto del país.
                </p>
            </div>

            {/* Local Shipping */}
            <section className="mb-16">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Envíos locales (Rosario y alrededores)
                    </h2>

                    <p className="text-gray-400">
                        Entregas personalizadas mediante nuestro servicio de
                        cadetería de confianza.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {LOCAL_SHIPPING.map((method, index) => {
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

            {/* National Shipping */}
            <section className="mb-16">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Envíos nacionales
                    </h2>

                    <p className="text-gray-400">
                        Llegamos a cada rincón de la Argentina garantizando que
                        tus componentes viajen seguros.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-5">
                    {NATIONAL_SHIPPING.map((method, index) => {
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
                                    md:flex-row
                                    md:items-center
                                    gap-6
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
                                    <h3 className="text-white font-semibold text-lg mb-2">
                                        {method.title}
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed max-w-3xl">
                                        {method.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Extra info - Tiempos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Package className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            Tiempos de despacho
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        Una vez acreditado el pago, preparamos y despachamos tu
                        pedido cuidadosamente entre{" "}
                        <strong className="text-white">
                            1 y 2 días hábiles
                        </strong>
                        .
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <CalendarClock className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            Tiempos del correo
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        El tiempo estimado de entrega por parte de Correo
                        Andreani es de{" "}
                        <strong className="text-white">
                            2 a 10 días hábiles
                        </strong>
                        , dependiendo de tu código postal.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Tenés dudas sobre tu envío?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    Si estás fuera del anillo de Circunvalación o necesitás
                    coordinar detalles específicos, escribinos.
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
                    Consultar envío por WhatsApp
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
                    href="/metodos-de-pago"
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
                    Métodos de pago
                </Link>
            </div>
        </main>
    );
}
