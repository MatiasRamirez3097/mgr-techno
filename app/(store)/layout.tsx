import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function StoreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}

export const metadata: Metadata = {
    metadataBase: new URL("https://www.mgrtechno.com.ar"),
    title: {
        default: "MGR Techno — Tecnología en Rosario",
        template: "%s | MGR Techno",
    },
    description:
        "Componentes de PC, periféricos, refrigeración y más. Envíos a todo el país desde Rosario.",
    openGraph: {
        siteName: "MGR Techno",
        locale: "es_AR",
        type: "website",
    },
    verification: {
        google: "TU_CODIGO_DE_VERIFICACION",
    },
};

export const dynamic = "force-dynamic";
