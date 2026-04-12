import Link from "next/link";

interface Props {
    searchParams: Promise<{ order?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
    const { order } = await searchParams;

    return (
        <main className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
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
                <h1 className="text-2xl font-bold text-white mb-2">
                    ¡Pedido confirmado!
                </h1>
                <p className="text-gray-400 mb-2">
                    Tu pedido{" "}
                    <span className="text-white font-medium">#{order}</span> fue
                    recibido correctamente.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                    Te contactaremos a la brevedad para coordinar el pago y la
                    entrega.
                </p>
                <Link
                    href="/products"
                    className="inline-block px-6 py-3 rounded-xl text-white font-medium bg-brand hover:brightness-110 transition-all"
                >
                    Seguir comprando
                </Link>
            </div>
        </main>
    );
}
