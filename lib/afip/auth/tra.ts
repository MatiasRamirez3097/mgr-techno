// /lib/afip/auth/tra.ts

function formatAfipDate(d: Date): string {
    const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);

    return ar.toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

export function createTRA(ws: string) {
    const now = new Date();

    const uniqueId = Math.floor(Date.now() / 1000);

    const generationTime = formatAfipDate(new Date(now.getTime() - 60000));

    const expirationTime = formatAfipDate(new Date(now.getTime() + 600000));

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>${uniqueId}</uniqueId>

        <generationTime>
            ${generationTime}
        </generationTime>

        <expirationTime>
            ${expirationTime}
        </expirationTime>
    </header>

    <service>${ws}</service>
</loginTicketRequest>`;
}
