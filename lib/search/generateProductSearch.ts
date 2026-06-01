import { normalizeSearch } from "./normalize";

export const generateProductSearch = (text: string) => {
    const normalized = normalizeSearch(text);

    const searchTerms = normalized.split(/\s+/).filter(Boolean);

    return {
        searchTerms: [...new Set(searchTerms)],
    };
};
