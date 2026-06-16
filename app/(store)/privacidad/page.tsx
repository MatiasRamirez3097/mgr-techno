import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Eye, Lock, Cookie, UserCheck, FileText } from "lucide-react";

// Cacheamos la página por 30 días (en segundos) ya que su contenido es estático
export const revalidate = 2592000;

const SECTIONS = [
    {
        icon: Eye,
        title: "Recopilación de Información",
        description:
            "Recopilamos datos estrictamente necesarios para procesar tus compras y envíos: nombre, apellido, DNI, dirección de entrega, teléfono y correo electrónico.",
    },
    {
        icon: Lock,
        title: "Protección y Seguridad",
        description:
            "Tus datos personales se almacenan de forma segura y no son compartidos, vendidos ni transferidos a terceros bajo ningún concepto, salvo requerimiento legal.",
    },
    {
        icon: Cookie,
        title: "Cookies y Tecnologías",
        description:
            "Utilizamos cookies técnicas para mantener tu carrito de compras activo y herramientas de análisis (como el Píxel de Meta) para optimizar la experiencia en nuestra web.",
    },
];

export const metadata: Metadata = {
    title: "Política de Privacidad",
    description:
        "Conocé cómo protegemos y tratamos tus datos personales en MGR Techno de acuerdo con las normativas vigentes.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Política de <span className="text-brand">privacidad</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    En MGR Techno nos tomamos muy en serio la seguridad de tu
                    información. Conocé cómo protegemos tus datos en cada etapa
                    de tu navegación.
                </p>
            </div>

            {/* Main Sections Grid */}
            <section className="mb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {SECTIONS.map((section, index) => {
                        const Icon = section.icon;

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
                                    {section.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed text-sm">
                                    {section.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Legal Framework and Rights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            Cumplimiento Legal
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed text-sm">
                        Todo el tratamiento de datos personales realizado en
                        este sitio web se efectúa en estricto cumplimiento de la{" "}
                        <strong className="text-white">
                            Ley N° 25.326 de Protección de Datos Personales
                        </strong>{" "}
                        vigente en la República Argentina, garantizando el
                        principio de confidencialidad.
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCheck className="w-6 h-6 text-brand" />
                        <h2 className="text-white font-semibold text-xl">
                            Tus Derechos
                        </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed text-sm">
                        Como usuario, tenés el derecho absoluto de acceso,
                        rectificación, actualización y supresión de tus datos de
                        nuestra base de datos. Para ejercer cualquiera de estos
                        derechos, podés comunicarte directamente con nosotros.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Tenés alguna duda sobre tus datos?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto text-sm">
                    Si querés solicitar la baja de tu información o realizar una
                    consulta sobre nuestras políticas de seguridad, estamos a tu
                    disposición.
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
                    href="/cambios-y-devoluciones"
                    className="
                        px-8 py-3
                        rounded-xl
                        bg-white/10
                        hover:bg-white/20
                        text-white
                        font-medium
                        transition-all
                        text-sm
                    "
                >
                    Garantías y Cambios
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
                        text-sm
                    "
                >
                    Preguntas frecuentes
                </Link>
            </div>
        </main>
    );
}
