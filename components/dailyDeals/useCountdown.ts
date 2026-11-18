"use client";

import { useSyncExternalStore } from "react";

// Un solo reloj compartido por todas las cuentas regresivas de la página
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let now = Date.now();

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
            now = Date.now();
            listeners.forEach((l) => l());
        }, 1000);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
            clearInterval(timer);
            timer = null;
        }
    };
}

const getSnapshot = () => now;
// En el servidor no hay hora "actual" estable: se muestra recién en el cliente
const getServerSnapshot = () => null;

export interface CountdownParts {
    hours: string;
    minutes: string;
    seconds: string;
    finished: boolean;
}

/** Tiempo que falta hasta `endsAt`. null durante el render del servidor y la hidratación. */
export function useCountdown(endsAt: string | null): CountdownParts | null {
    const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    if (!endsAt || current === null) return null;
    const left = Math.max(0, Math.floor((new Date(endsAt).getTime() - current) / 1000));
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
        hours: pad(Math.floor(left / 3600)),
        minutes: pad(Math.floor((left % 3600) / 60)),
        seconds: pad(left % 60),
        finished: left === 0,
    };
}
