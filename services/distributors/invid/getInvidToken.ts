import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";

export const INVID_STATE_ID = "invid";
const AUTH_URL = "https://invidcomputers.com/api/v1/auth.php";
// Renovamos el token un rato antes de que venza (dura 24 horas)
const RENEW_MARGIN_MS = 30 * 60 * 1000;

/**
 * Token JWT de Invid, guardado en DB para compartirlo entre instancias serverless.
 */
export async function getInvidToken(forceRefresh = false): Promise<string> {
    await connectDB();

    if (!forceRefresh) {
        const state = await DistributorSyncStateModel.findById(INVID_STATE_ID)
            .select("accessToken tokenExpiresAt")
            .lean<{ accessToken?: string; tokenExpiresAt?: Date }>();

        if (
            state?.accessToken &&
            state.tokenExpiresAt &&
            new Date(state.tokenExpiresAt).getTime() - RENEW_MARGIN_MS >
                Date.now()
        ) {
            return state.accessToken;
        }
    }

    if (!process.env.INVID_USER || !process.env.INVID_PASSWORD) {
        throw new Error("Faltan las credenciales de Invid (INVID_USER / INVID_PASSWORD)");
    }

    const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: process.env.INVID_USER,
            password: process.env.INVID_PASSWORD,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error(`Falló la autenticación con Invid: HTTP ${response.status}`);
    }

    const data = await response.json();
    const token: string | undefined = data.access_token;
    if (!token) {
        throw new Error("Invid autenticó pero no devolvió access_token");
    }

    const expiresInSeconds = Number(data.expiration_time) || 86400;

    await DistributorSyncStateModel.updateOne(
        { _id: INVID_STATE_ID },
        {
            $set: {
                accessToken: token,
                tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
            },
        },
        { upsert: true },
    );

    return token;
}
