import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Deliberately generic — S3-COMPATIBLE, not AWS-specific. Setting
 * BACKUP_S3_ENDPOINT lets this point at Cloudflare R2, Backblaze B2,
 * or any other S3-compatible provider, not just AWS. The point of this
 * whole phase is "independent of the Supabase account" — it shouldn't
 * also lock the backup destination to one specific vendor's SDK quirks
 * beyond what's necessary.
 */
function getBackupS3Client(): S3Client | null {
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
  const region = process.env.BACKUP_S3_REGION ?? "auto";
  const endpoint = process.env.BACKUP_S3_ENDPOINT; // omit for real AWS S3

  if (!accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadBackup(objectKey: string, jsonContent: string): Promise<void> {
  const client = getBackupS3Client();
  const bucket = process.env.BACKUP_S3_BUCKET;

  if (!client || !bucket) {
    throw new Error(
      "Backup storage not configured — set BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, " +
        "and BACKUP_S3_SECRET_ACCESS_KEY (plus BACKUP_S3_ENDPOINT for a non-AWS provider)."
    );
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: jsonContent,
      ContentType: "application/json",
    })
  );
}
