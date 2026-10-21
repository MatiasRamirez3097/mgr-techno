export function OrganizationSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "ComputerStore",
        name: "MGR Techno",
        alternateName: "MGR Techno Argentina",
        url: "https://mgrtechno.com.ar",
        logo: "https://mgrtechno.com.ar/icons/icon-512x512.png",
        description:
            "Tienda especializada en hardware gamer, componentes de PC, placas de video, procesadores y armado personalizado de computadoras con envíos a toda Argentina.",
        priceRange: "$$",
        address: {
            "@type": "PostalAddress",
            addressCountry: "AR",
        },
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: ["Spanish"],
            areaServed: "AR",
        },
        sameAs: [
            "https://www.instagram.com/mgrtechno",
            "https://www.facebook.com/mgrtechno",
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
