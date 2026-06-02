// lib/buildBackUrl.ts

export function buildBackUrl(
    pathname: string,
    searchParams: Record<string, string | undefined>,
) {
    const query = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
            query.set(key, value);
        }
    });

    return `${pathname}?${query.toString()}`;
}
