"use client";

declare global {
    interface Window {
        cloudinary?: any;
    }
}

let uploadWidgetPromise: Promise<any> | null = null;
let mediaLibraryPromise: Promise<any> | null = null;

export function loadCloudinaryUploadWidget(): Promise<any> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Cannot load Cloudinary in SSR"));
    }

    if (window.cloudinary?.createUploadWidget) {
        return Promise.resolve(window.cloudinary);
    }

    if (uploadWidgetPromise) {
        return uploadWidgetPromise;
    }

    uploadWidgetPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById("cloudinary-upload-widget-script");
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(window.cloudinary));
            existingScript.addEventListener("error", (e) => reject(e));
            return;
        }

        const script = document.createElement("script");
        script.id = "cloudinary-upload-widget-script";
        script.src = "https://upload-widget.cloudinary.com/global/all.js";
        script.async = true;
        script.onload = () => {
            if (window.cloudinary) {
                resolve(window.cloudinary);
            } else {
                reject(new Error("Cloudinary object not found after script load"));
            }
        };
        script.onerror = (err) => {
            uploadWidgetPromise = null;
            reject(err);
        };
        document.body.appendChild(script);
    });

    return uploadWidgetPromise;
}

export function loadCloudinaryMediaLibrary(): Promise<any> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Cannot load Cloudinary in SSR"));
    }

    if (window.cloudinary?.openMediaLibrary || window.cloudinary?.createMediaLibrary) {
        return Promise.resolve(window.cloudinary);
    }

    if (mediaLibraryPromise) {
        return mediaLibraryPromise;
    }

    mediaLibraryPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById("cloudinary-media-library-script");
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(window.cloudinary));
            existingScript.addEventListener("error", (e) => reject(e));
            return;
        }

        const script = document.createElement("script");
        script.id = "cloudinary-media-library-script";
        script.src = "https://media-library.cloudinary.com/global/all.js";
        script.async = true;
        script.onload = () => {
            if (window.cloudinary) {
                resolve(window.cloudinary);
            } else {
                reject(new Error("Cloudinary object not found after media library load"));
            }
        };
        script.onerror = (err) => {
            mediaLibraryPromise = null;
            reject(err);
        };
        document.body.appendChild(script);
    });

    return mediaLibraryPromise;
}
