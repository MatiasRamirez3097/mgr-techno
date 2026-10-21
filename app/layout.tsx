import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/layout/SessionProviderWrapper";
import { HydrationProvider } from "@/components/layout/HydrationProvider";
import { CartDrawerProvider } from "@/components/layout/CartDrawerProvider";
import { WhatsAppFloatingButton } from "@/components/ui/WhatsAppFloatingButton";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://mgrtechno.com.ar"),
    title: {
        default: "MGR Techno | Hardware Gamer y Computación en Argentina",
        template: "%s | MGR Techno",
    },
    description:
        "Tienda de hardware, componentes de PC y armado de computadoras gamer. Comprá procesadores, placas de video, memorias RAM y periféricos con cuotas y envíos a todo el país.",
    keywords: [
        "MGR Techno",
        "PC Gamer",
        "Hardware Argentina",
        "Placas de Video",
        "Procesadores",
        "Armado de PC",
        "Componentes de Computación",
        "RTX 4060",
        "Ryzen",
        "Intel Core",
    ],
    authors: [{ name: "MGR Techno" }],
    creator: "MGR Techno",
    publisher: "MGR Techno",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "es_AR",
        url: "https://mgrtechno.com.ar",
        siteName: "MGR Techno",
        title: "MGR Techno | Hardware Gamer y Computación en Argentina",
        description:
            "Tienda especializada en componentes de PC, placas de video, procesadores y armados gamer. Envíos seguros a todo el país.",
    },
    twitter: {
        card: "summary_large_image",
        title: "MGR Techno | Hardware Gamer y Computación en Argentina",
        description:
            "Tienda especializada en componentes de PC, placas de video, procesadores y armados gamer. Envíos seguros a todo el país.",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <OrganizationSchema />
                <SessionProviderWrapper>
                    <HydrationProvider>
                        <CartDrawerProvider>
                            {children}
                            <WhatsAppFloatingButton />
                        </CartDrawerProvider>
                    </HydrationProvider>
                </SessionProviderWrapper>
            </body>
        </html>
    );
}
