import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ClientSignInTrigger } from "@/components/auth/ClientsSignInTrigger";

interface Props {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function VerifyMagicLinkPage({ searchParams }: Props) {
    // 1. Si el usuario ya tiene sesión, lo sacamos de acá
    const session = await getServerSession(authOptions);
    if (session) {
        redirect("/");
    }

    const { token } = await searchParams;

    if (!token || token === "") {
        return (
            <ErrorState message="No se proporcionó ningún token de acceso." />
        );
    }

    try {
        // 2. Validamos el token en el servidor antes de renderizar NADA
        jwt.verify(token, process.env.NEXTAUTH_SECRET!);

        // 3. Si el token es válido, renderizamos la pantalla de éxito
        // y llamamos al disparador cliente para que NextAuth cree la cookie.
        return (
            <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center max-w-md w-full">
                    <h1 className="text-xl font-bold mb-4 text-brand">
                        Autenticando...
                    </h1>
                    <p className="text-gray-400">
                        Tu link es válido. Estamos iniciando tu sesión de forma
                        segura, por favor esperá un momento.
                    </p>
                    {/* Este componente invisible hace el trabajo con NextAuth */}
                    <ClientSignInTrigger token={token} />
                </div>
            </div>
        );
    } catch (error) {
        // Si jwt.verify falla (token alterado o expirado tras 15 mins), cae acá.
        return (
            <ErrorState message="El link mágico expiró o es inválido. Por favor, solicitá uno nuevo." />
        );
    }
}

// Componente visual para errores (también SSR)
function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
            <div className="bg-gray-900 p-8 rounded-2xl border border-red-900/50 text-center max-w-md w-full">
                <span className="text-4xl mb-4 block">❌</span>
                <h1 className="text-xl font-bold text-red-500 mb-2">
                    Acceso denegado
                </h1>
                <p className="text-gray-400">{message}</p>
            </div>
        </div>
    );
}
