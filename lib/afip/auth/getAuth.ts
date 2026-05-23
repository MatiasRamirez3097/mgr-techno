// /lib/afip/auth/getAuth.ts

import { getCachedTA, saveTA } from "./cache";

import { createTRA } from "./tra";

import { callWSAA, parseWSAAResponse, signTRA } from "./wsaa";

export async function getAuth(ws = "wsfe") {
    const cached = await getCachedTA(ws);

    if (cached) {
        return cached;
    }

    const tra = createTRA(ws);

    const cms = signTRA(tra);

    const raw = await callWSAA(cms);

    const ta = await parseWSAAResponse(raw);

    await saveTA(ws, ta);

    return ta;
}
