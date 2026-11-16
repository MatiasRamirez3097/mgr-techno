/**
 * Coincidencia aproximada por nombre entre un producto propio y los ítems de un distribuidor,
 * para sugerir vínculos cuando no coincide el part number ni el EAN. Sólo sugiere: el vínculo
 * lo confirma siempre el admin.
 */

// Palabras que no ayudan a distinguir un producto de otro
const STOPWORDS = new Set([
    "de", "del", "la", "el", "los", "las", "y", "e", "o", "con", "sin", "para", "por", "en", "a",
    "the", "and", "with", "for", "of",
    "nuevo", "new", "original", "oem", "box", "bulk", "x",
]);

// Unidades que se pegan al número anterior: "8 GB" → "8gb"
const UNITS = new Set(["gb", "tb", "mb", "w", "hz", "mhz", "ghz", "mm", "cm", "v", "mah", "rpm", "ms", "pulgadas"]);

// Capacidades, potencias, frecuencias, etc.: tienen dígitos pero los comparten muchos productos
// (también multiplicadores como "2x")
const SPEC_TOKEN = /^\d+(gb|tb|mb|w|hz|mhz|ghz|mm|cm|v|mah|rpm|ms|p|k|x|pulgadas)?$/;
const SPEC_WITH_UNIT = /^\d+(gb|tb|mb|w|hz|mhz|ghz|mm|cm|v|mah|rpm|ms|pulgadas)$/;

// Abreviaturas de capacidad: "8g" → "8gb", "1t" → "1tb"
const normalizeCapacity = (token: string) => (/^\d+[gt]$/.test(token) ? `${token}b` : token);

/**
 * Marcas de hardware: si los dos nombres nombran marcas y no comparten ninguna, son productos
 * distintos (memoria Corsair contra Kingston, mother MSI contra Gigabyte). No incluye marcas de
 * chips (AMD, Intel, NVIDIA), que aparecen en productos de muchos fabricantes.
 */
export const KNOWN_BRANDS = new Set([
    "msi", "gigabyte", "aorus", "asus", "rog", "asrock", "biostar", "evga", "zotac", "pny", "palit", "galax",
    "inno3d", "sapphire", "powercolor", "xfx", "corsair", "kingston", "hyperx", "adata", "xpg", "crucial",
    "patriot", "gskill", "teamgroup", "lexar", "hiksemi", "netac", "macrovip", "memox", "sstc", "mushkin",
    "samsung", "wd", "seagate", "toshiba", "sandisk", "kioxia", "logitech", "genius", "redragon", "razer",
    "steelseries", "thermaltake", "deepcool", "nzxt", "antec", "aerocool", "sentey", "gamemax", "seasonic",
    "cougar", "noga", "lenovo", "acer", "aoc", "viewsonic", "philips", "benq", "lg", "hp", "dell", "epson",
    "brother", "lian", "fractal", "arctic", "noctua", "coolermaster", "glowy", "hikvision", "dahua",
]);

/** Palabras normalizadas de un nombre: minúsculas, sin acentos ni símbolos, sin relleno. */
export function nameTokens(name: string): string[] {
    const normalized = name
        // Invid agrega su ID al final: "… (7222)"
        .replace(/\(\d+\)\s*$/, "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
    const raw = normalized.split(/[^a-z0-9]+/).filter(Boolean);

    const tokens: string[] = [];
    for (const rawToken of raw) {
        const token = normalizeCapacity(rawToken);
        const prev = tokens[tokens.length - 1];
        if (UNITS.has(token) && prev && /^\d+$/.test(prev)) {
            tokens[tokens.length - 1] = prev + token;
            continue;
        }
        if (STOPWORDS.has(token) || (token.length < 2 && !/\d/.test(token))) continue;
        tokens.push(token);
    }

    // Modelos con guiones con una letra suelta también enteros: "B650M-P" → "b650mp" (si no, la
    // "P" se pierde y queda igual a "B650M-B")
    for (const chunk of normalized.split(/\s+/)) {
        const parts = chunk.split(/[^a-z0-9]+/).filter(Boolean);
        if (parts.length < 2 || !parts.some((part) => /^[a-z]$/.test(part))) continue;
        const joined = parts.join("");
        if (/\d/.test(joined) && /[a-z]/.test(joined) && !tokens.includes(joined)) tokens.push(joined);
    }
    return [...new Set(tokens)];
}

/**
 * Palabras que identifican el modelo: tienen letras y dígitos o son números de 3+ cifras
 * ("b550m", "4060", "i5", "12400f"), descartando capacidades y similares ("8gb", "650w").
 */
export function isModelToken(token: string): boolean {
    if (!/\d/.test(token) || SPEC_TOKEN.test(token)) {
        return /^\d{3,}$/.test(token);
    }
    return token.length >= 2;
}

// Especificaciones por unidad: ["8gb", "650w"] → { gb: {"8gb"}, w: {"650w"} }
function specsByUnit(tokens: string[]): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const token of tokens) {
        const match = SPEC_WITH_UNIT.exec(token);
        if (!match) continue;
        // Capacidades en GB para comparar 960GB con 1TB (1TB = 1000GB)
        const [unit, value] =
            match[1] === "tb" ? ["gb", `${parseInt(token, 10) * 1000}gb`] : [match[1], token];
        result.set(unit, (result.get(unit) ?? new Set()).add(value));
    }
    return result;
}

// Tipo de producto por palabra (con sinónimos): un mouse y un teclado del mismo modelo no son lo mismo
const PRODUCT_TYPES: Record<string, string> = {
    mouse: "mouse", teclado: "teclado", auricular: "auriculares", auriculares: "auriculares", headset: "auriculares",
    parlante: "parlantes", parlantes: "parlantes", monitor: "monitor", gabinete: "gabinete", gab: "gabinete",
    fuente: "fuente", psu: "fuente", mother: "mother", motherboard: "mother", mb: "mother", micro: "cpu",
    procesador: "cpu", proces: "cpu", cpu: "cpu", memoria: "memoria", webcam: "webcam", joystick: "joystick",
    gamepad: "joystick", notebook: "notebook", silla: "silla", impresora: "impresora", cooler: "cooler",
    mousepad: "mousepad", pendrive: "pendrive",
    // PC armada (los distribuidores las nombran "PC …" con sus componentes)
    pc: "pc",
};

// Forma de un código de modelo: "b550m" → "b#m", "lga1700" → "lga#"
const modelShape = (token: string) => token.replace(/\d+/g, "#");

const SOCKET = /^(am\d|fm\d|lga\d{3,4}|s?trx?\d)$/;
// Chipset de mother: "b650m" / "b650" → "b650"
const CHIPSET = /^([abhxzq]\d{3})[mei]?$/;

/**
 * true si los nombres no pueden ser el mismo producto porque, para algún atributo que informan
 * los dos, no coinciden en ningún valor: la misma unidad con otro valor (8 GB contra 16 GB, 960 GB
 * contra 1 TB), otro número o código de modelo de la misma forma (4060 contra 4070, B550M contra
 * B560M, DDR4 contra DDR5), otro socket o chipset, otra marca u otro tipo de producto.
 */
export function hasConflictingSpecs(a: string[], b: string[]): boolean {
    const attributes = (tokens: string[]) => {
        const result = specsByUnit(tokens);
        const add = (key: string, value: string) => result.set(key, (result.get(key) ?? new Set()).add(value));
        for (const t of tokens) {
            if (/^\d{3,}$/.test(t)) add("#number", t);
            else if (isModelToken(t) && /[a-z]/.test(t)) add(`#shape:${modelShape(t)}`, t);
            if (SOCKET.test(t)) add("#socket", t);
            const chipset = CHIPSET.exec(t)?.[1];
            if (chipset) add("#chipset", chipset);
            if (KNOWN_BRANDS.has(t)) add("#brand", t);
            if (PRODUCT_TYPES[t]) add("#type", PRODUCT_TYPES[t]);
        }
        return result;
    };
    const attrsB = attributes(b);
    for (const [key, valuesA] of attributes(a)) {
        const valuesB = attrsB.get(key);
        if (valuesB && ![...valuesA].some((v) => valuesB.has(v))) return true;
    }
    return false;
}

/** Cómo pesa cada palabra y cuáles identifican al producto (ver buildNameIndex). */
export interface TokenStats {
    weight: (token: string) => number;
    isDistinctive: (token: string) => boolean;
}

// Sin estadísticas del catálogo: las palabras de modelo pesan más y son las distintivas
export const DEFAULT_TOKEN_STATS: TokenStats = {
    weight: (token) => (isModelToken(token) ? 3 : /\d/.test(token) ? 2 : 1),
    isDistinctive: isModelToken,
};

/**
 * Similitud entre dos nombres ya tokenizados (0 a 1): coeficiente de Dice ponderado. Es 0 si no
 * comparten ninguna palabra distintiva o si hay un conflicto (ver hasConflictingSpecs).
 */
export function nameSimilarity(a: string[], b: string[], stats: TokenStats = DEFAULT_TOKEN_STATS): number {
    if (a.length === 0 || b.length === 0) return 0;
    if (hasConflictingSpecs(a, b)) return 0;
    const setB = new Set(b);
    let shared = 0;
    let sharedDistinctive = false;
    for (const token of a) {
        if (!setB.has(token)) continue;
        shared += stats.weight(token);
        if (stats.isDistinctive(token)) sharedDistinctive = true;
    }
    if (!sharedDistinctive) return 0;
    const total = a.reduce((s, t) => s + stats.weight(t), 0) + b.reduce((s, t) => s + stats.weight(t), 0);
    return (2 * shared) / total;
}

// Por debajo de esta similitud no se sugiere
export const MIN_NAME_SIMILARITY = 0.55;

export interface NameIndex<I> {
    items: { item: I; tokens: string[] }[];
    // Palabra distintiva → posiciones en `items`
    byToken: Map<string, number[]>;
    stats: TokenStats;
}

/**
 * Índice de un catálogo para buscar por nombre. Cada palabra pesa según lo rara que es en el
 * catálogo (IDF): "ddr4", "am4" o "memoria" aparecen en cientos de ítems y casi no cuentan;
 * "vengeance" o "5800x", mucho. Distintivas = palabras raras que no son marcas.
 */
export function buildNameIndex<I extends { name: string }>(items: I[]): NameIndex<I> {
    const entries = items.map((item) => ({ item, tokens: nameTokens(item.name) }));

    const df = new Map<string, number>();
    for (const { tokens } of entries) for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1);

    const n = Math.max(entries.length, 1);
    // Distintiva = aparece en pocos ítems: con dígitos (modelos) hasta el 1% del catálogo; sin
    // dígitos, más exigente (0,25%), para que no cuenten palabras de categoría como "parlantes"
    const maxModelDf = Math.min(100, Math.max(10, Math.round(n * 0.01)));
    const maxWordDf = Math.min(25, Math.max(5, Math.round(n * 0.0025)));
    const stats: TokenStats = {
        // Las que no están en el catálogo pesan como las más raras
        weight: (t) => Math.log((n + 1) / ((df.get(t) ?? 0) + 1)) + 0.1,
        isDistinctive: (t) =>
            t.length >= 3 &&
            !KNOWN_BRANDS.has(t) &&
            !PRODUCT_TYPES[t] &&
            !SPEC_TOKEN.test(t) &&
            (df.get(t) ?? 0) <= (/\d/.test(t) ? maxModelDf : maxWordDf),
    };

    const byToken = new Map<string, number[]>();
    entries.forEach(({ tokens }, position) => {
        for (const token of tokens) {
            if (!stats.isDistinctive(token)) continue;
            const list = byToken.get(token) ?? [];
            list.push(position);
            byToken.set(token, list);
        }
    });
    return { items: entries, byToken, stats };
}

/** Los ítems más parecidos a un nombre, de mayor a menor similitud. */
export function findNameMatches<I>(
    name: string,
    index: NameIndex<I>,
    { limit = 3, minScore = MIN_NAME_SIMILARITY, filter }: { limit?: number; minScore?: number; filter?: (item: I) => boolean } = {},
): { item: I; score: number }[] {
    const tokens = nameTokens(name);
    const positions = new Set(tokens.flatMap((t) => index.byToken.get(t) ?? []));

    const matches: { item: I; score: number }[] = [];
    for (const position of positions) {
        const entry = index.items[position];
        if (filter && !filter(entry.item)) continue;
        const score = nameSimilarity(tokens, entry.tokens, index.stats);
        if (score >= minScore) matches.push({ item: entry.item, score });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
