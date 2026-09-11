import mongoose from "mongoose";

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI no está definida");
    }

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            // --- ESTOS PARÁMETROS SON VITALES EN VERCEL ---
            maxPoolSize: 10, // Limita las conexiones simultáneas
            serverSelectionTimeoutMS: 5000, // Falla rápido si no conecta (5 seg)
            socketTimeoutMS: 45000, // Cierra sockets inactivos
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        // CLAVE: Si falla, reseteamos la promesa para que el próximo intento empiece limpio
        cached.promise = null;
        throw e;
    }

    (global as any).mongoose = cached;
    return cached.conn;
}
