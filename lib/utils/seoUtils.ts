/**
 * Utilidades SEO para optimización de títulos, descripciones y microdatos en Google.
 */

// Siglas, acrónimos y marcas de hardware que deben mantenerse en MAYÚSCULAS
const UPPERCASE_TOKENS = new Set([
    // GPU / Placas de video
    "RTX", "GTX", "RX", "XT", "XTX", "TI", "OC", "LHR", "DUAL",
    // Almacenamiento y memoria
    "RAM", "SSD", "NVME", "HDD", "DDR", "DDR3", "DDR4", "DDR5", "GDDR", "GDDR5", "GDDR6", "GDDR6X", "PCIE", "PCI-E", "SATA", "M.2", "U.2", "CL14", "CL16", "CL18", "CL30", "CL32", "CL36", "CL40",
    // Componentes y formatos
    "CPU", "GPU", "APU", "PSU", "AIO", "TDP", "VRM", "BIOS", "UEFI", "LAN", "WIFI", "WI-FI", "BT",
    "ATX", "E-ATX", "MICRO-ATX", "M-ATX", "MATX", "MINI-ITX", "ITX", "SFX",
    "AM4", "AM5", "LGA1700", "LGA1200", "LGA1151", "PRO", "PLUS", "MAX",
    // Pantallas y conectores
    "LED", "OLED", "QLED", "IPS", "VA", "TN", "FHD", "QHD", "UHD", "2K", "4K", "8K", "HDR",
    "HDMI", "DP", "VGA", "DVI", "USB", "USB-C", "TYPE-C", "RGB", "ARGB",
    // Unidades de medida
    "GB", "TB", "MB", "KB", "GHZ", "MHZ", "HZ", "W", "KW", "V", "MAH", "MM", "CM", "RPM",
    // Marcas de tecnología
    "ASUS", "MSI", "AMD", "EVGA", "PNY", "XPG", "WD", "AORUS", "NZXT", "ASROCK", "ZOTAC",
    "KFA2", "T-FORCE", "XFX", "SAPPHIRE", "LG", "HP", "DELL", "JBL", "LOGITECH", "RAZER",
    "HYPERX", "REDRAGON", "CORSAIR", "KINGSTON", "INTEL", "TUF", "ROG", "STRIX",
]);

// Conectores que deben ir en minúsculas en español salvo que inicien la oración
const LOWERCASE_WORDS = new Set([
    "de", "del", "con", "para", "en", "y", "o", "a", "al", "por", "sin", "la", "el", "los", "las", "un", "una",
]);

// Casos mixtos específicos
const SPECIAL_CASES: Record<string, string> = {
    "asrock": "ASRock",
    "id-cooling": "ID-Cooling",
    "g.skill": "G.Skill",
    "wi-fi": "Wi-Fi",
    "wifi": "Wi-Fi",
    "pci-e": "PCI-E",
    "usb-c": "USB-C",
    "m.2": "M.2",
    "i3": "i3",
    "i5": "i5",
    "i7": "i7",
    "i9": "i9",
};

/**
 * Formatea un texto a formato Smart Title Case para resultados de búsqueda de Google.
 * Ej: "MEMORIA RAM CORSAIR VENGEANCE 16GB DDR4 3200MHZ"
 * -> "Memoria RAM Corsair Vengeance 16GB DDR4 3200MHz"
 */
export function smartTitleCase(text?: string | null): string {
    if (!text || typeof text !== "string") return "";

    const trimmed = text.trim();
    if (!trimmed) return "";

    // Dividir en palabras preservando espacios simples
    const words = trimmed.split(/\s+/);

    const formattedWords = words.map((word, index) => {
        // Limpiar puntuación periférica pero preservarla en el resultado
        const match = word.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
        if (!match) return word;

        const [, prefix, core, suffix] = match;
        if (!core) return word;

        const lowerCore = core.toLowerCase();
        const upperCore = core.toUpperCase();

        // 1. Casos especiales exactos (e.g. ASRock, G.Skill, Core i5)
        if (SPECIAL_CASES[lowerCore]) {
            return prefix + SPECIAL_CASES[lowerCore] + suffix;
        }

        // 2. Acrónimos y siglas técnicas (siempre en mayúsculas)
        if (UPPERCASE_TOKENS.has(upperCore)) {
            return prefix + upperCore + suffix;
        }

        // 3. Patrones de unidades tipo "3200mhz" -> "3200MHz", "16gb" -> "16GB", "750w" -> "750W", "144hz" -> "144Hz"
        const unitMatch = core.match(/^(\d+(?:\.\d+)?)(ghz|mhz|hz|gb|tb|mb|kb|w|mm|cm|v)$/i);
        if (unitMatch) {
            const num = unitMatch[1];
            const rawUnit = unitMatch[2].toLowerCase();
            let unitFormatted = rawUnit.toUpperCase();
            if (rawUnit === "mhz") unitFormatted = "MHz";
            if (rawUnit === "ghz") unitFormatted = "GHz";
            if (rawUnit === "hz") unitFormatted = "Hz";
            return prefix + num + unitFormatted + suffix;
        }

        // 3.1. Modelos de CPU/GPU con sufijo alfabético (ej: 5700x -> 5700X, 14700k -> 14700K, 7800x3d -> 7800X3D)
        const cpuModelMatch = core.match(/^(\d+)([a-zA-Z]{1,3}(?:\d+)?)$/);
        if (cpuModelMatch) {
            return prefix + cpuModelMatch[1] + cpuModelMatch[2].toUpperCase() + suffix;
        }

        // 3.2. Chipsets de placa madre (ej: b550 -> B550, b550m -> B550M, z790 -> Z790, a520 -> A520)
        const chipsetMatch = core.match(/^([abzhx])(\d{3})([a-z]?)$/i);
        if (chipsetMatch) {
            return prefix + chipsetMatch[1].toUpperCase() + chipsetMatch[2] + chipsetMatch[3].toUpperCase() + suffix;
        }

        // 4. Conectores en minúscula (salvo que sea la primera palabra)
        if (index > 0 && LOWERCASE_WORDS.has(lowerCore)) {
            return prefix + lowerCore + suffix;
        }

        // 5. Palabras con guion interno (ej: Micro-ATX, Dual-Channel, Plug-and-Play)
        if (core.includes("-")) {
            const hyphenated = core
                .split("-")
                .map((part) => {
                    const upperPart = part.toUpperCase();
                    if (UPPERCASE_TOKENS.has(upperPart)) return upperPart;
                    if (SPECIAL_CASES[part.toLowerCase()]) return SPECIAL_CASES[part.toLowerCase()];
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                })
                .join("-");
            return prefix + hyphenated + suffix;
        }

        // 6. Palabra normal: primera mayúscula, resto minúscula
        return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
    });

    return formattedWords.join(" ");
}

/**
 * Trunca una descripción limpiando HTML para meta tags (máximo 155 caracteres)
 */
export function cleanMetaDescription(text?: string | null, fallback = ""): string {
    if (!text || typeof text !== "string") return fallback;
    const clean = text
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean) return fallback;
    if (clean.length <= 155) return clean;
    return clean.slice(0, 152).trim() + "...";
}
