import { Wrench, Clock3 } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Sitio en mantenimiento | MGR Techno",
    description: "Estamos realizando mejoras. Volvemos pronto.",
};

export default function MaintenancePage() {
    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                {/* Brillo de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full pointer-events-none"></div>

                <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Wrench className="w-10 h-10 text-brand" />
                </div>

                <h1 className="text-3xl font-black text-white tracking-tight mb-3">
                    Modo Mantenimiento
                </h1>

                <p className="text-gray-400 leading-relaxed mb-6">
                    ¡Hola! La tienda se encuentra temporalmente en pausa porque
                    estamos de viaje. No te preocupes, volvemos en unos días
                    para seguir ofreciéndote el mejor hardware.
                </p>

                <div className="flex items-center justify-center gap-2 text-brand font-medium bg-brand/10 py-3 px-4 rounded-xl mb-6 w-fit mx-auto">
                    <Clock3 className="w-5 h-5" />
                    <span>Volvemos pronto</span>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    Si tenés una consulta urgente sobre un pedido en curso,
                    escribinos por WhatsApp.
                </p>

                <a
                    href="https://wa.me/5493417223739"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl bg-brand text-white font-medium hover:brightness-110 transition-all"
                >
                    Contactar por WhatsApp
                </a>
            </div>
        </main>
    );
}
