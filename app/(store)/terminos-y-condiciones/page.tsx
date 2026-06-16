export const revalidate = 86400;

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Términos y condiciones",
    description:
        "Conocé nuestras políticas de garantía, devoluciones y condiciones de servicio.",
};

const sections = [
    {
        title: "Validez de la garantía",
        content: `
Toda garantía de producto queda sujeta a la revisión y validación por parte del personal técnico de MGR Techno, quien determinará si el producto cumple con las condiciones de garantía de acuerdo con las políticas de cada marca.

La comunicación telefónica, web, mail, coordinación o envío del producto no constituyen aceptación automática de la garantía.
        `,
    },

    {
        title: "Tiempo de garantía",
        content: `
El tiempo de garantía del producto se encuentra indicado en la factura de compra. Dependiendo del producto, la garantía podrá ser de 6 o 12 meses.

Es requisito conservar caja, empaque, manuales, etiquetas y accesorios para realizar cualquier trámite de garantía.

Si el fabricante ofrece una garantía superior a la brindada por MGR Techno, una vez vencido nuestro período de cobertura el cliente deberá gestionar directamente con la marca.
        `,
    },

    {
        title: "Cobertura de garantía",
        content: `
La garantía cubre defectos derivados del uso normal del producto dentro de las condiciones especificadas por el fabricante.

Quedarán excluidos productos con:
• daños físicos
• golpes o rayones
• humedad o líquidos
• virus o software malicioso
• negligencia o mal uso
• etiquetas de serialización faltantes o alteradas
• intervención técnica ajena a MGR Techno

MGR Techno no está obligado a reemplazar un producto sin revisión técnica previa.
        `,
    },

    {
        title: "Devoluciones",
        content: `
El cliente podrá solicitar devolución dentro de los 30 días corridos desde la recepción de la compra.

El producto debe encontrarse:
• sin uso
• en idénticas condiciones
• con packaging completo
• con fajas de seguridad intactas

La devolución será validada por el equipo técnico de MGR Techno. En caso de aprobarse, se emitirá una Nota de Crédito por el mismo valor abonado originalmente.
        `,
    },

    {
        title: "Salvaguarda de información",
        content: `
La protección y respaldo de información personal, archivos y programas es responsabilidad exclusiva del cliente.

MGR Techno no se responsabiliza por pérdida de información o lucro cesante ocasionado por fallas de productos.
        `,
    },

    {
        title: "Garantía solicitada por terceros",
        content: `
Para realizar un trámite de garantía mediante terceros será necesario presentar:
• autorización firmada
• nombre y DNI del titular
• nombre y DNI de la persona autorizada
• copia del DNI del titular
        `,
    },

    {
        title: "Reparación o reemplazo",
        content: `
La reparación o reemplazo podrá realizarse con productos nuevos o reacondicionados de funcionamiento equivalente según criterio exclusivo de MGR Techno.
        `,
    },

    {
        title: "Envío y retiro de service",
        content: `
Una vez informado que el service fue solucionado, el cliente deberá coordinar envío o retiro.

MGR Techno conservará productos reparados por un máximo de 90 días. Pasado ese plazo podrá disponer de ellos sin posibilidad de reclamo posterior.
        `,
    },

    {
        title: "Fuera de garantía",
        content: `
Si el producto es declarado fuera de garantía, se coordinará su devolución.

En algunos casos y bajo exclusivo criterio de MGR Techno podrá ofrecerse intento de reparación fuera de garantía, sin asegurar resultado exitoso ni cobertura posterior.
        `,
    },

    {
        title: "Causales de anulación de garantía",
        content: `
La garantía podrá quedar anulada por:
• uso indebido
• instalación incorrecta
• daños físicos
• humedad o líquidos
• exceso o caída de tensión
• falta de mantenimiento
• fajas de seguridad alteradas
• seriales removidos o adulterados
• documentación modificada

En monitores, los píxeles quemados quedarán sujetos a la política oficial de cada fabricante.
        `,
    },

    {
        title: "Recepción de paquetes",
        content: `
Recomendamos no aceptar paquetes abiertos, dañados o con signos de maltrato.

En caso de recibirlos, el cliente deberá dejar constancia ante el correo e informar a MGR Techno dentro de las primeras 24 horas.

Pasado ese plazo se entenderá que el producto fue recibido en correctas condiciones.
        `,
    },
];

export default function TermsPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 py-16">
            {/* Hero */}
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Términos y <span className="text-brand">condiciones</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-3xl mx-auto">
                    Al utilizar los servicios de postventa y garantía de MGR
                    Techno, aceptás las siguientes condiciones relacionadas con
                    compras, garantías, devoluciones y soporte técnico.
                </p>
            </div>

            {/* Intro */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-10">
                <p className="text-gray-300 leading-relaxed">
                    Al utilizar el servicio de Post Venta de MGR Techno (CUIT
                    20-40704574-3, Razón Social RAMIREZ MATIAS GABRIEL), aceptás
                    los presentes términos y condiciones.
                </p>

                <p className="text-gray-300 leading-relaxed mt-4">
                    MGR Techno ofrece garantía sobre los productos vendidos,
                    pudiendo variar entre 6 y 12 meses según el producto.
                </p>
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-5 mb-16">
                {sections.map((section) => (
                    <section
                        key={section.title}
                        className="
                            bg-gray-900
                            border border-gray-800
                            rounded-2xl
                            p-6
                        "
                    >
                        <h2 className="text-xl font-bold text-white mb-4">
                            {section.title}
                        </h2>

                        <div className="text-gray-400 leading-relaxed whitespace-pre-line">
                            {section.content.trim()}
                        </div>
                    </section>
                ))}
            </div>

            {/* Contact */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">
                    ¿Necesitás ayuda?
                </h2>

                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    Podés contactarnos por cualquiera de nuestros medios
                    habilitados y te ayudaremos con consultas sobre garantías,
                    devoluciones o soporte técnico.
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
                    Contactar por WhatsApp
                </a>
            </div>
        </main>
    );
}
