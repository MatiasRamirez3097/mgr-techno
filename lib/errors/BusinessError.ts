/**
 * Error de regla de negocio (sin stock, producto no disponible, etc.).
 * Su mensaje es apto para mostrarse al cliente; los handlers HTTP lo
 * devuelven con `status` en lugar de un 500 genérico.
 */
export class BusinessError extends Error {
    readonly status: number;

    constructor(message: string, status = 409) {
        super(message);
        this.name = "BusinessError";
        this.status = status;
    }
}

export function isBusinessError(error: unknown): error is BusinessError {
    return error instanceof BusinessError;
}
