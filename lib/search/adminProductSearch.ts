function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toAccentInsensitivePattern(raw: string): string {
    const normalized = raw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const escaped = escapeRegex(normalized);

    return escaped
        .replace(/a/g, "[aáàäâã]")
        .replace(/e/g, "[eéèëê]")
        .replace(/i/g, "[iíìïî]")
        .replace(/o/g, "[oóòöôõ]")
        .replace(/u/g, "[uúùüû]")
        .replace(/n/g, "[nñ]");
}

export function buildAdminProductSearchMatch(rawSearch: string): Record<string, any> | null {
    const trimmed = (rawSearch || "").trim();
    if (!trimmed) return null;

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;

    const tokenConditions = tokens.map((token) => {
        const pattern = toAccentInsensitivePattern(token);
        const regex = { $regex: pattern, $options: "i" };
        return {
            $or: [
                { name: regex },
                { sku: regex },
                { mpn: regex },
                { gtin: regex },
            ],
        };
    });

    return tokenConditions.length === 1
        ? tokenConditions[0]
        : { $and: tokenConditions };
}

export function buildAdminProductSearchScoreStage(rawSearch: string): Record<string, any> {
    const trimmed = (rawSearch || "").trim();
    const fullPattern = toAccentInsensitivePattern(trimmed);
    const firstToken = trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
    const firstTokenPattern = toAccentInsensitivePattern(firstToken);

    const exactCodePattern = `^${escapeRegex(trimmed)}$`;
    const prefixCodePattern = `^${escapeRegex(trimmed)}`;

    return {
        $addFields: {
            _adminSearchScore: {
                $add: [
                    // 1. Coincidencia exacta en SKU, MPN o GTIN (+1000)
                    {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$sku", ""] },
                                            regex: exactCodePattern,
                                            options: "i",
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$mpn", ""] },
                                            regex: exactCodePattern,
                                            options: "i",
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$gtin", ""] },
                                            regex: exactCodePattern,
                                            options: "i",
                                        },
                                    },
                                ],
                            },
                            1000,
                            0,
                        ],
                    },
                    // 2. Coincidencia de prefijo en SKU, MPN o GTIN (+500)
                    {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$sku", ""] },
                                            regex: prefixCodePattern,
                                            options: "i",
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$mpn", ""] },
                                            regex: prefixCodePattern,
                                            options: "i",
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: { $ifNull: ["$gtin", ""] },
                                            regex: prefixCodePattern,
                                            options: "i",
                                        },
                                    },
                                ],
                            },
                            500,
                            0,
                        ],
                    },
                    // 3. Frase exacta dentro del nombre (+300)
                    {
                        $cond: [
                            {
                                $regexMatch: {
                                    input: { $ifNull: ["$name", ""] },
                                    regex: fullPattern,
                                    options: "i",
                                },
                            },
                            300,
                            0,
                        ],
                    },
                    // 4. El nombre comienza con la primera palabra buscada (+150)
                    {
                        $cond: [
                            {
                                $regexMatch: {
                                    input: { $ifNull: ["$name", ""] },
                                    regex: `^${firstTokenPattern}`,
                                    options: "i",
                                },
                            },
                            150,
                            0,
                        ],
                    },
                    // 5. Priorizar productos con stock disponible (+25)
                    {
                        $cond: [
                            { $gt: [{ $ifNull: ["$availableStock", 0] }, 0] },
                            25,
                            0,
                        ],
                    },
                ],
            },
        },
    };
}
