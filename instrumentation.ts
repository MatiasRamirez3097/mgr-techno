// instrumentation.ts
import { ProxyAgent, setGlobalDispatcher } from "undici";

export async function register() {
    // Solo configura el proxy si la variable está definida
    if (!process.env.PROXY_URL) return;

    const proxyAgent = new ProxyAgent({
        uri: process.env.PROXY_URL,
        token: `Basic ${Buffer.from(
            `${process.env.PROXY_USER}:${process.env.PROXY_PASS}`,
        ).toString("base64")}`,
    });

    setGlobalDispatcher(proxyAgent);
}
