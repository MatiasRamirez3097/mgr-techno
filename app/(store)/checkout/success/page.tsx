import { getOrdersById } from "@/lib/orders/getOrdersById";
import MetaPurchaseTracker from "@/components/MetaPurchaseTracker";
import Link from "next/link";

interface Props {
    searchParams: Promise<{
        order?: string;
        status?: string; // MercadoPago manda este parámetro
        payment_id?: string;
    }>;
}

export default async function SuccessPage({ searchParams }: Props) {
    const { order, status: urlStatus } = await searchParams;

    const data = await getOrdersById(order ?? "");

    if (!data)
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-300">
                Ocurrió un problema al buscar tu orden. Por favor, contactate
                por WhatsApp.
            </div>
        );

    const isBankTransfer = data.payments?.[0]?.method === "bank_transfer";
    const isMercadoPago = data.payments?.[0]?.method === "mercadopago";

    // ==========================================
    // LÓGICA DE ESTADOS Y UI DINÁMICA
    // ==========================================

    // Por defecto asumimos éxito (aplica para Transferencia y MP Aprobado)
    let uiConfig = {
        title: isBankTransfer ? "¡Pedido recibido!" : "¡Compra confirmada!",
        description: "Tu pedido fue registrado correctamente.",
        icon: (
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
        ),
        colorClass: "bg-green-500/10",
        step2Title: isBankTransfer
            ? "Confirmación del pago"
            : "Preparación del pedido",
        step2Desc: isBankTransfer
            ? "Verificaremos la transferencia una vez recibido el comprobante."
            : "Comenzaremos a preparar tu pedido.",
    };

    // Si es MercadoPago, evaluamos el status que viene en la URL
    if (isMercadoPago) {
        if (urlStatus === "pending" || urlStatus === "in_process") {
            uiConfig = {
                title: "¡Pago pendiente!",
                description:
                    "Estamos procesando tu pago o esperando que abones en efectivo (Pago Fácil/Rapipago).",
                icon: (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-yellow-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                ),
                colorClass: "bg-yellow-500/10",
                step2Title: "Acreditación del pago",
                step2Desc:
                    "Una vez que Mercado Pago nos confirme la acreditación, comenzaremos a preparar tu pedido.",
            };
        } else if (urlStatus === "rejected" || urlStatus === "null") {
            uiConfig = {
                title: "Pago rechazado",
                description:
                    "Hubo un problema al procesar tu pago en Mercado Pago.",
                icon: (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                ),
                colorClass: "bg-red-500/10",
                step2Title: "Revisión del pago",
                step2Desc:
                    "Por favor, intentá realizar la compra nuevamente o contactanos.",
            };
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-10">
            {/* Solo traqueamos la compra en Meta si está aprobada o es transferencia */}
            {(urlStatus === "approved" || isBankTransfer) && (
                <MetaPurchaseTracker
                    orderId={data.id}
                    items={data.items}
                    total={data.total}
                />
            )}

            <div className="w-full max-w-2xl">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    {/* Estado Visual Dinámico */}
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${uiConfig.colorClass}`}
                    >
                        {uiConfig.icon}
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {uiConfig.title}
                        </h1>
                        <p className="text-gray-400">{uiConfig.description}</p>
                    </div>

                    {/* Resumen */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
                        <h2 className="text-sm font-medium text-gray-300 mb-3">
                            Resumen del pedido
                        </h2>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Pedido</span>
                                <span className="font-semibold text-white">
                                    #{order?.slice(-6).toUpperCase()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-400">
                                    Método de pago
                                </span>
                                <span className="text-white">
                                    {isBankTransfer
                                        ? "Transferencia bancaria"
                                        : "Mercado Pago"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-400">Total</span>
                                <span className="font-semibold text-white">
                                    ${data?.total.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Transferencia (Solo si aplica y no está pagada aún) */}
                    {isBankTransfer && data.paymentStatus !== "paid" && (
                        <div className="bg-brand/10 border border-brand/20 rounded-xl p-5 mb-6">
                            <h2 className="font-semibold text-white mb-4">
                                Datos para transferencia
                            </h2>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-400">Banco</p>
                                    <p className="text-white font-medium">
                                        {process.env.BANK_NAME}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Titular</p>
                                    <p className="text-white font-medium">
                                        {process.env.BANK_OWNER}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">CUIT</p>
                                    <p className="text-white font-medium">
                                        {process.env.BANK_OWNER_CUIT}
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
                                    Una vez realizada la transferencia, envianos
                                    el comprobante por WhatsApp indicando el
                                    número de pedido{" "}
                                    <span className="font-semibold text-white">
                                        #{order?.slice(-6).toUpperCase()}
                                    </span>
                                    .
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Próximos pasos Dinámicos */}
                    <div className="mb-8">
                        <h2 className="font-semibold text-white mb-4">
                            Próximos pasos
                        </h2>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-black shrink-0">
                                    ✓
                                </div>
                                <div>
                                    <p className="text-white">
                                        Pedido registrado
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Guardamos tu orden en el sistema.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 ${urlStatus === "approved" || (isBankTransfer && data.paymentStatus === "paid") ? "bg-green-500 border-green-500 text-black font-bold" : "border-gray-600 text-gray-400"}`}
                                >
                                    {urlStatus === "approved" ||
                                    (isBankTransfer &&
                                        data.paymentStatus === "paid")
                                        ? "✓"
                                        : "2"}
                                </div>
                                <div>
                                    <p className="text-white">
                                        {uiConfig.step2Title}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {uiConfig.step2Desc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs text-gray-400 shrink-0">
                                    3
                                </div>
                                <div>
                                    <p className="text-white">Envío o retiro</p>
                                    <p className="text-sm text-gray-500">
                                        Te notificaremos por email cuando tu
                                        pedido esté listo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/productos"
                            className="flex-1 text-center px-6 py-3 rounded-xl bg-brand text-white font-medium hover:brightness-110 transition-all"
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
