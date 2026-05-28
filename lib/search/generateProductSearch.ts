import { normalizeSearch } from "./normalize";

export const generateProductSearch = (text: string) => {
    const normalized = normalizeSearch(text);

    const searchTerms = normalized.split(/\s+/).filter(Boolean);

    return {
        searchKey: normalized,

        searchTerms: [...new Set(searchTerms)],
    };
};
