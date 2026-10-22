import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@vercel/analytics/next";
import MetaPixel from "@/components/MetaPixel";
import { StoreSettingsProvider } from "@/components/providers/StoreSettingsProvider";
import { getStoreSettings } from "@/services/settings/getStoreSettings";

export default async function StoreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getStoreSettings();

    return (
        <StoreSettingsProvider settings={settings}>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
            <MetaPixel />
            <Analytics />
        </StoreSettingsProvider>
    );
}

export const metadata: Metadata = {
    metadataBase: new URL("https://www.mgrtechno.com.ar"),
    title: {
        default: "MGR Techno — Tecnología en Rosario",
        template: "MGR Techno | %s",
    },
    description:
        "Componentes de PC, periféricos, refrigeración y más. Envíos a todo el país desde Rosario.",
    openGraph: {
        siteName: "MGR Techno",
        locale: "es_AR",
        type: "website",
    },
    verification: {
        google: process.env.GOOGLE_VERIFICATION,
    },
};

export const dynamic = "force-dynamic";
