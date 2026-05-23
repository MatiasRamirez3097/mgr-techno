import { AfipTokenModel } from "@/models/AfipToken";

export async function getCachedTA(ws: string) {
    const cached = await AfipTokenModel.findOne({
        ws,
    }).lean();

    if (!cached) {
        return null;
    }

    const expiration = new Date(cached.expirationTime);

    const renewBefore = 5 * 60 * 1000;

    if (new Date() < new Date(expiration.getTime() - renewBefore)) {
        return cached;
    }

    return null;
}

export async function saveTA(ws: string, ta: TicketAcceso) {
    await AfipTokenModel.findOneAndUpdate(
        {
            ws,
        },
        {
            token: ta.token,

            sign: ta.sign,

            expirationTime: ta.expirationTime,
        },
        {
            upsert: true,
        },
    );
}
