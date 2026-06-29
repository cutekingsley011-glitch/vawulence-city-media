import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  const resourceType = mimetype.startsWith("video/") ? "video" : "image";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "vcm-uploads", resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
        } else {
          resolve(result.secure_url);
        }
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}
