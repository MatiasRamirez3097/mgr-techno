// /lib/afip/auth/cache.ts

import { existsSync, readFileSync, writeFileSync } from "fs";

export interface TicketAcceso {
    token: string;

    sign: string;

    expirationTime: string;
}

export function getCachedTA(ws: string): TicketAcceso | null {
    const path = `./tmp/afip_${ws}.json`;

    if (!existsSync(path)) {
        return null;
    }

    const cached = JSON.parse(readFileSync(path, "utf8"));

    const expiration = new Date(cached.expirationTime);

    const renewBefore = 5 * 60 * 1000;

    if (new Date() < new Date(expiration.getTime() - renewBefore)) {
        return cached;
    }

    return null;
}

export function saveTA(ws: string, ta: TicketAcceso) {
    writeFileSync(`./tmp/afip_${ws}.json`, JSON.stringify(ta), "utf8");
}
