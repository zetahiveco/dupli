import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import http from "node:http";
import https from "node:https";
import { getUniqueFileName } from "./filename";
import { logger } from "./logger";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/** Prefer IPv4 — LinkedIn/CDN Cloudflare often blocks datacenter IPv6. */
const ipv4HttpAgent = new http.Agent({ family: 4, keepAlive: true });
const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: true });

const BROWSER_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function headersForAssetDownload(url: string): Record<string, string> {
    const headers: Record<string, string> = {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    };

    try {
        const { hostname, origin } = new URL(url);
        if (
            hostname === "licdn.com" ||
            hostname.endsWith(".licdn.com") ||
            hostname === "linkedin.com" ||
            hostname.endsWith(".linkedin.com")
        ) {
            headers.Referer = "https://www.linkedin.com/";
        } else {
            headers.Referer = `${origin}/`;
        }
    } catch {
        // Invalid URL — axios will surface the failure
    }

    return headers;
}

export async function getPresignedUrlForUpload(filename: string) {
    const s3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || ''
        },
        region: "us-east-1",
        endpoint: process.env.AWS_S3_ENDPOINT_URL || '',
        apiVersion: "v4"
    });

    filename = getUniqueFileName(filename);

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: filename,
        ContentType: 'application/octet-stream'
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return { filename: filename, url: url };
}

export async function getPresignedUrlForGet(filename: string) {
    if (!filename || !filename.trim()) {
        throw new Error("Filename cannot be empty when generating presigned URL");
    }

    const s3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || ''
        },
        region: "us-east-1",
        endpoint: process.env.AWS_S3_ENDPOINT_URL || '',
        apiVersion: "v4"
    });

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: filename,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
        filename: filename,
        url: url
    };
}

// Upload file directly to S3 using presigned URL
export async function uploadFileToS3(file: Buffer<ArrayBuffer>, filename: string): Promise<string> {
    const { url: uploadUrl, filename: storedFilename } = await getPresignedUrlForUpload(filename);

    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': 'application/octet-stream'
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
    }

    return storedFilename;
}

export async function downloadFileFromS3(key: string): Promise<Buffer> {
    const { url } = await getPresignedUrlForGet(key)
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
    }
    return Buffer.from(await response.arrayBuffer())
}


// Helper function to download and upload URL to S3
export async function downloadAndUploadUrl(url: string): Promise<string | null> {
    try {
        logger.log(`[file] Downloading asset`);
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 30000, // 30 second timeout
            maxRedirects: 5,
            // Avoid axios defaults (UA axios/*, Accept application/json) that CDNs flag as bots
            headers: headersForAssetDownload(url),
            httpAgent: ipv4HttpAgent,
            httpsAgent: ipv4HttpsAgent,
        });

        const contentType = String(response.headers["content-type"] ?? "");
        if (contentType.includes("text/html")) {
            logger.error(`[file] Download returned HTML instead of asset (${contentType})`);
            return null;
        }

        // Convert to Buffer
        const buffer = Buffer.from(response.data);

        // Generate UUID filename
        const filename = `${uuidv4()}`;

        const storedFilename = await uploadFileToS3(buffer, filename);

        logger.log(`[file] Successfully uploaded file`);
        return storedFilename;
    } catch (error) {
        logger.error(`[file] Failed to download/upload URL`, error);
        return null;
    }
}