// Caché en memoria para no llamar al login de NewBytes en cada búsqueda
let cachedNbToken: string | null = null;
let nbTokenExpiration: number = 0;

export async function getNewBytesToken(): Promise<string> {
    if (cachedNbToken && Date.now() < nbTokenExpiration) {
        return cachedNbToken;
    }

    const response = await fetch("https://api.nb.com.ar/v1/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user: process.env.NEWBYTES_USER,
            password: process.env.NEWBYTES_PASSWORD,
            mode: "api",
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`NewBytes Auth failed: ${response.status}`);
    }

    const data = await response.json();
    const token: string | undefined = data.token;

    if (!token) {
        throw new Error(
            "NewBytes Auth successful but no token found in response.",
        );
    }

    // El token dura 1 hora: lo renovamos a los 55 minutos
    cachedNbToken = token;
    nbTokenExpiration = Date.now() + 55 * 60 * 1000;

    return cachedNbToken;
}
