import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.STORAGE_REGION,
    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    },
});

/**
 * Generates a pre-signed URL for uploading a file to S3.
 * @param {string} fileName - The name of the file to be uploaded.
 * @param {string} contentType - The MIME type of the file.
 * @returns {Promise<{uploadUrl: string, fileUrl: string}>}
 */
export async function getPresignedUploadUrl(fileName, contentType) {
    const bucketName = process.env.STORAGE_BUCKET_NAME;
    const key = `uploads/oral-responses/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct the public file URL
    const publicBaseUrl = process.env.STORAGE_PUBLIC_URL || `https://${bucketName}.s3.${process.env.STORAGE_REGION}.amazonaws.com`;
    const fileUrl = `${publicBaseUrl}/${key}`;

    return {
        uploadUrl,
        fileUrl,
    };
}
