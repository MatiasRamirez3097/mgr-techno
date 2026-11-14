import { revalidatePath } from "next/cache";

// La home se genera con ISR: se regenera al cambiar los banners
export function revalidateHeroSlides() {
    try {
        revalidatePath("/");
    } catch {
        // Ignorar si se ejecuta fuera del contexto de una petición Next.js
    }
}
