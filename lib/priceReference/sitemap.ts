export interface SitemapEntry {
    loc: string;
    lastmod: Date | null;
}

const decodeXml = (text: string) =>
    text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();

function parseDate(value: string | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value.trim());
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Lee las entradas de un sitemap: sirve tanto para un índice (`<sitemap>`) como para una
 * lista de URLs (`<url>`). Ignora entradas sin `<loc>`.
 */
export function parseSitemap(xml: string): SitemapEntry[] {
    const entries: SitemapEntry[] = [];
    const blockRegex = /<(url|sitemap)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(xml))) {
        const body = match[2];
        const loc = /<loc>([\s\S]*?)<\/loc>/i.exec(body)?.[1];
        if (!loc) continue;
        const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(body)?.[1];
        entries.push({ loc: decodeXml(loc), lastmod: parseDate(lastmod && decodeXml(lastmod)) });
    }
    return entries;
}
