import type { Metadata } from "next";
import Link from "next/link";
import {
    RefreshCcw,
    Box,
    AlertTriangle,
    FileCheck,
    Wrench,
} from "lucide-react";

const POLICIES = [
    {
        icon: Wrench,
        title: "Garantía por fallas de fábrica",
        description:
            "Todos nuestros componentes cuentan con garantía. Si el producto presenta un defecto de fabricación, nos encargamos de gestionar el reclamo correspondiente.",
    },
    {
        icon: Box,
        title: "Condiciones para cambios",
        description:
            "Solo aceptamos cambios o devoluciones de productos siempre que no hayan sido abiertos ni manipulados. El artículo debe conservar sus sellos de fábrica y estar en sus condiciones iniciales.",
    },
    {
        icon: AlertTriangle,
        title: "Exclusiones de garantía",
        description:
            "La garantía no cubre daños físicos, pines doblados en procesadores/motherboards, golpes, quemaduras o modificaciones (ej. minería o overclock extremo).",
    },
];

export const metadata: Metadata = {
    title: "Cambios y Devoluciones",
    description:
        "Información sobre garantías, proceso de RMA y políticas de cambio en MGR Techno.",
};

export default function ReturnsPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Cambios y <span className="text-brand">devoluciones</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Tu tranquilidad es nuestra prioridad. Conocé cómo proceder
                    si necesitas gestionar la garantía de un componente.
                </p>
            </div>

            {/* Policies */}
            <section className="mb-16">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Nuestras Políticas
                    </h2>

                    <p className="text-gray-400">
                        Lineamientos generales para la gestión de productos en
                        garantía o devoluciones.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {POLICIES.map((policy, index) => {
                        const Icon = policy.icon;

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
                                    {policy.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed">
                                    {policy.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Extra info - Proceso RMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <RefreshCcw className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            ¿Cómo inicio un reclamo?
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        Contactanos por WhatsApp indicando tu número de orden y
                        detallando el problema. Te pediremos fotos o videos del
                        componente para hacer un diagnóstico inicial antes de
                        que lo envíes.
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <FileCheck className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            Costos de traslado
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed">
                        Todos los gastos de envío derivados de la gestión de
                        garantías o cambios (tanto el envío del producto hacia
                        nosotros como su posterior regreso al domicilio) corren{" "}
                        <strong className="text-white">
                            exclusivamente por cuenta del cliente
                        </strong>
                        .
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Tenés algún problema con tu equipo?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    El área técnica está lista para ayudarte. Escribinos para
                    que podamos darte soporte rápido y guiarte en los pasos a
                    seguir.
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
                    Contactar a Soporte
                </a>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href="/envios"
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
                    Ver info de envíos
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
