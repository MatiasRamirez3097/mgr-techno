import { v2 as cloudinary } from "cloudinary";

interface Props {
    buffer: Buffer;
    folder: string;
    fileName: string;
}

export async function uploadBufferToCloudinary({
    buffer,
    folder,
    fileName,
}: Props) {
    return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                folder,
                public_id: fileName,
                format: "pdf",
            },

            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            },
        );

        stream.end(buffer);
    });
}
