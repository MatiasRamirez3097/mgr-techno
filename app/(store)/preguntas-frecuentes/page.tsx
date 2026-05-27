import type { Metadata } from "next";
import Link from "next/link";

const FAQS = [
    {
        question: "¿Hacen envíos a todo el país?",
        answer: "Sí, realizamos envíos a todo Argentina. Trabajamos con diferentes servicios de correo y transporte dependiendo del producto y la ubicación.",
    },
    {
        question: "¿Los productos tienen garantía?",
        answer: "Sí, todos nuestros productos cuentan con garantía oficial o garantía del proveedor según corresponda.",
    },
    {
        question: "¿Puedo pedir una PC armada a medida?",
        answer: "Sí, nos especializamos en armado e instalación de PC personalizadas según tus necesidades y presupuesto.",
    },
    {
        question: "¿Hacen factura A y B?",
        answer: "Sí, emitimos factura electrónica oficial AFIP tipo A y B.",
    },
    {
        question: "¿Qué métodos de pago aceptan?",
        answer: "Aceptamos transferencias, efectivo y diferentes medios de pago según disponibilidad.",
    },
    {
        question: "¿Puedo retirar personalmente?",
        answer: "Sí, podés coordinar retiro una vez confirmada la compra.",
    },
    {
        question: "¿Cómo puedo consultar stock o compatibilidad?",
        answer: "Podés escribirnos por WhatsApp y te asesoramos personalmente para asegurarte compatibilidad y disponibilidad.",
    },
    {
        question: "¿Qué pasa si un producto llega dañado?",
        answer: "Contactanos apenas recibas el pedido y te ayudaremos a resolverlo lo antes posible.",
    },
];

export const metadata: Metadata = {
    title: "Preguntas frecuentes",
    description:
        "Resolvé tus dudas sobre envíos, garantías, pagos, armado de PC y más.",
};

export default function FAQPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Preguntas <span className="text-brand">frecuentes</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Encontrá respuestas rápidas sobre compras, envíos,
                    garantías, armado de PC y más.
                </p>
            </div>

            {/* FAQ LIST */}
            <div className="flex flex-col gap-4 mb-16">
                {FAQS.map((faq, index) => (
                    <div
                        key={index}
                        className="
                            bg-gray-900
                            border border-gray-800
                            rounded-2xl
                            p-6
                        "
                    >
                        <h2 className="text-white font-semibold text-lg mb-3">
                            {faq.question}
                        </h2>

                        <p className="text-gray-400 leading-relaxed">
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>

            {/* Extra help */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿No encontraste tu respuesta?
                </h2>

                <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                    Nuestro equipo puede ayudarte a resolver cualquier duda
                    sobre productos, compatibilidad, presupuestos o armado de
                    PC.
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

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href="/products"
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
                    href="/about-us"
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
                    Sobre nosotros
                </Link>
            </div>
        </main>
    );
}
