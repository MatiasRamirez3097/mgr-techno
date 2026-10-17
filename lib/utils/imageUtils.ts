export const NO_IMAGE_PLACEHOLDER_URL =
    "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780913722/noimage_gamsgz.png";

export const hasOwnProductImage = (dbUrl?: string | null): boolean => {
    if (!dbUrl || typeof dbUrl !== "string") return false;
    const trimmed = dbUrl.trim();
    return trimmed.length > 0 && !trimmed.includes("noimage_gamsgz");
};

export const getOptimizedImageUrl = (dbUrl: string, width = 800) => {
    // Verificamos que sea un string válido y que venga de Cloudinary
    if (!dbUrl || !dbUrl.includes("/image/upload/")) {
        return dbUrl;
    }

    // Reemplazamos el segmento base por el que incluye f_auto, q_auto y el ancho
    return dbUrl.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto,w_${width}/`,
    );
};
