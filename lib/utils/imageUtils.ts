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
