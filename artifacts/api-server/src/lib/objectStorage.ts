import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET ?? "vcm-media";

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Ensure the vcm-media bucket exists and is public. Call once at server startup. */
export async function initializeStorage(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — storage uploads disabled");
    return;
  }
  const supabase = getAdminClient();
  const { data: bucket } = await supabase.storage.getBucket(BUCKET_NAME);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    if (error) {
      logger.error({ err: error }, `Failed to create storage bucket "${BUCKET_NAME}"`);
    } else {
      logger.info({ bucket: BUCKET_NAME }, "Storage bucket created");
    }
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Generate a presigned upload URL for direct browser-to-Supabase upload.
   * Returns:
   *   uploadURL  — the signed URL the client PUTs the file to
   *   publicURL  — the permanent public URL to store in the database
   */
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; publicURL: string }> {
    const supabase = getAdminClient();
    const path = `uploads/${randomUUID()}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(path);
    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message ?? "unknown error"}`);
    }
    const publicURL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
    return { uploadURL: data.signedUrl, publicURL };
  }
}
