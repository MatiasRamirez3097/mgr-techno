// lib/metaPixel.ts

// Declaramos fbq para que TypeScript no se queje si lo usamos en window
declare global {
    interface Window {
        fbq: any;
    }
}

/**
 * 1. EVENTO VER CONTENIDO (ViewContent)
 * Se debe disparar cuando el usuario entra a la página de detalle de un producto.
 */
export const trackViewContent = (product: any) => {
    if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "ViewContent", {
            // EL SECRETO ESTÁ ACÁ: content_ids debe ser un array con el MISMO ID que pusimos en el XML (<g:id>)
            content_ids: [product._id || product.id],
            content_type: "product",
            content_name: product.name,
            value: product.salePrice || product.regularPrice,
            currency: "ARS",
        });
    }
};

/**
 * 2. EVENTO AGREGAR AL CARRITO (AddToCart)
 * Se debe disparar cuando el usuario hace clic en el botón de "Agregar al carrito".
 */
export const trackAddToCart = (product: any, quantity: number = 1) => {
    if (typeof window !== "undefined" && window.fbq) {
        const price = product.salePrice || product.regularPrice;
        window.fbq("track", "AddToCart", {
            content_ids: [product._id || product.id],
            content_type: "product",
            content_name: product.name,
            value: price * quantity,
            currency: "ARS",
        });
    }
};

/**
 * 3. EVENTO COMPRA (Purchase)
 * Se debe disparar en la página de "¡Gracias por tu compra!" (Checkout Success).
 */
export const trackPurchase = (order: any) => {
    if (typeof window !== "undefined" && window.fbq) {
        // Extraemos todos los IDs de los productos comprados
        const productIds = order.items.map((item: any) => item.productId);

        window.fbq("track", "Purchase", {
            content_ids: productIds,
            content_type: "product",
            value: order.total, // El total real que pagó
            currency: "ARS",
            // num_items: order.items.length,
        });
    }
};
