import Link from "next/link";

interface Props {
    searchParams: Promise<{ order?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
    const { order } = await searchParams;

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    {/* Icono */}
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                            />
                        </svg>
                    </div>

                    {/* Título */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            ¡Pedido recibido!
                        </h1>

                        <p className="text-gray-400">
                            Tu pedido fue registrado correctamente y será
                            procesado a la brevedad.
                        </p>
                    </div>

                    {/* Resumen */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
                        <h2 className="text-sm font-medium text-gray-300 mb-3">
                            Resumen del pedido
                        </h2>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">
                                Número de pedido
                            </span>

                            <span className="font-semibold text-white">
                                #{order}
                            </span>
                        </div>
                    </div>

                    {/* Transferencia */}
                    <div className="bg-brand/10 border border-brand/20 rounded-xl p-5 mb-6">
                        <h2 className="font-semibold text-white mb-3">
                            Datos para transferencia bancaria
                        </h2>

                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-400">Titular</p>
                                <p className="text-white font-medium">
                                    MGR Techno
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-400">Alias</p>
                                <p className="text-white font-medium">
                                    {process.env.BANK_ALIAS}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-400">CBU</p>
                                <p className="text-white font-medium break-all">
                                    {process.env.BANK_CBU}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-brand/20">
                            <p className="text-sm text-gray-300">
                                Una vez realizada la transferencia, envianos el
                                comprobante indicando el número de pedido{" "}
                                <span className="font-semibold text-white">
                                    #{order}
                                </span>
                                .
                            </p>
                        </div>
                    </div>

                    {/* Próximos pasos */}
                    <div className="mb-8">
                        <h2 className="font-semibold text-white mb-4">
                            Próximos pasos
                        </h2>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-black">
                                    ✓
                                </div>

                                <div>
                                    <p className="text-white">
                                        Pedido recibido
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        Tu pedido fue registrado correctamente.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                    2
                                </div>

                                <div>
                                    <p className="text-white">
                                        Confirmación de pago
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        Verificaremos la transferencia una vez
                                        recibido el comprobante.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                    3
                                </div>

                                <div>
                                    <p className="text-white">
                                        Preparación del pedido
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        Comenzaremos a preparar tus productos.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                    4
                                </div>

                                <div>
                                    <p className="text-white">
                                        Envío o entrega
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        Te mantendremos informado sobre el
                                        estado de tu compra.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/productos"
                            className="flex-1 text-center px-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 transition-all"
                        >
                            Seguir comprando
                        </Link>

                        <Link
                            href="/"
                            className="flex-1 text-center px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}

export const dynamic = "force-dynamic";
