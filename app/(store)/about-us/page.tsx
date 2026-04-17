import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Sobre nosotros",
    description:
        "Somos una tienda de tecnología especializada en el armado e instalación de PC en Rosario.",
};

export default function AboutUsPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Sobre <span className="text-brand">nosotros</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Somos una tienda de tecnología especializada en el armado e
                    instalación de PC, con una amplia variedad de insumos
                    informáticos para cada necesidad.
                </p>
            </div>

            {/* Cards de valores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-brand"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
                            />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">Armado de PC</h3>
                    <p className="text-sm text-gray-400">
                        Especialistas en armado e instalación de equipos a
                        medida para cada cliente.
                    </p>
                </div>

                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-brand"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">
                        Amplio catálogo
                    </h3>
                    <p className="text-sm text-gray-400">
                        Primeras marcas y opciones alternativas para todos los
                        presupuestos.
                    </p>
                </div>

                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-brand"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">
                        Atención personalizada
                    </h3>
                    <p className="text-sm text-gray-400">
                        Te asesoramos para encontrar exactamente lo que
                        necesitás.
                    </p>
                </div>
            </div>

            {/* Texto principal */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-10">
                <div className="flex flex-col gap-4 text-gray-300 leading-relaxed">
                    <p>
                        Somos una tienda de tecnología especializada en el
                        armado e instalación de PC. Nos dedicamos además a la
                        venta de insumos informáticos, ofreciendo una amplia
                        variedad de marcas y gamas.
                    </p>
                    <p>
                        Ya sean artículos de las primeras marcas u opciones
                        alternativas, te aseguramos que tenemos el producto
                        indicado para vos.
                    </p>
                    <p>
                        Te ofrecemos una cálida atención personalizada para que
                        el armado e instalación de PC sea a tu medida, y te
                        asesoramos para que encuentres los insumos informáticos
                        que estás necesitando.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href="/products"
                    className="px-8 py-3 rounded-xl bg-brand text-white font-medium hover:brightness-110 transition-all"
                >
                    Ver catálogo
                </Link>
                <a
                    href="https://wa.me/5493413762222"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-medium transition-all"
                >
                    Contactanos por WhatsApp
                </a>
            </div>
        </main>
    );
}
