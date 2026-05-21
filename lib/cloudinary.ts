import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadImage(
    file: string,
    folder = "mgrtechno/products",
): Promise<string> {
    const result = await cloudinary.uploader.upload(file, {
        folder,
        transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
        ],
    });
    return result.secure_url;
}

export async function uploadImageFromUrl(
    url: string,
    folder = "mgrtechno/products",
): Promise<string> {
    const result = await cloudinary.uploader.upload(url, {
        folder,
        transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
        ],
    });
    return result.secure_url;
}

export async function deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}

interface UploadBufferOptions {
    buffer: Buffer;
    folder?: string;
    fileName: string;
}

export async function uploadBuffer({
    buffer,
    folder,
    fileName,
}: {
    buffer: Buffer;

    folder: string;

    fileName: string;
}) {
    return new Promise<{
        secure_url: string;
        public_id: string;
    }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,

                public_id: fileName,

                resource_type: "raw",

                type: "authenticated",

                format: "pdf",
            },

            (error, result) => {
                if (error || !result) {
                    return reject(error);
                }

                resolve({
                    secure_url: result.secure_url,

                    public_id: result.public_id,
                });
            },
        );

        stream.end(buffer);
    });
}

export function getAuthenticatedPdfUrl(publicId: string) {
    return cloudinary.utils.private_download_url(
        publicId,

        "pdf",

        {
            resource_type: "raw",

            type: "authenticated",

            attachment: true,

            expires_at: Math.floor(Date.now() / 1000) + 60 * 10,
        },
    );
}
