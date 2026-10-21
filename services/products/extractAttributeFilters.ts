export function extractAttributeFiltersFromSearchParams(
    params: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    if (!params) return result;

    for (const [rawKey, rawVal] of Object.entries(params)) {
        if (!rawKey.startsWith("attr_") || !rawVal) continue;
        const attrKey = rawKey.slice("attr_".length).trim();
        if (!attrKey) continue;

        const valStr = Array.isArray(rawVal) ? rawVal.join(",") : String(rawVal);
        const values = valStr
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

        if (values.length > 0) {
            result[attrKey] = values;
        }
    }

    return result;
}
