import { CounterModel } from "@/models/Counter";

/**
 * Devuelve el siguiente valor de una secuencia atómica guardada en Counter.
 * `getInitialValue` se usa sólo la primera vez, para continuar una numeración
 * existente (p. ej. migrar desde otro esquema sin repetir números).
 */
export async function getNextSequence(
    key: string,
    getInitialValue?: () => Promise<number>,
): Promise<number> {
    if (getInitialValue && !(await CounterModel.exists({ _id: key }))) {
        const initial = await getInitialValue();
        try {
            await CounterModel.create({ _id: key, seq: initial });
        } catch (error: unknown) {
            // Otro proceso lo creó en paralelo: seguimos con $inc
            if ((error as { code?: number }).code !== 11000) throw error;
        }
    }

    const counter = await CounterModel.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true },
    );

    return counter.seq;
}

export function formatSequence(prefix: string, seq: number, digits = 8) {
    return `${prefix}-${String(seq).padStart(digits, "0")}`;
}

export async function getNextGenericNumber() {
    return formatSequence("CMP", await getNextSequence("purchase_generic"));
}
