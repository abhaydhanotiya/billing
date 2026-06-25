import { config } from "../config.js";

/**
 * Minimal Supabase Storage client over the REST API (uses the service-role key,
 * so it runs server-side only). Auto-creates a public bucket on first use and
 * uploads an object, returning its public URL.
 */

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: config.supabaseServiceKey,
    Authorization: `Bearer ${config.supabaseServiceKey}`,
    ...extra,
  };
}

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  // Create the bucket; a 400/409 "already exists" is fine to ignore.
  const res = await fetch(`${config.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: config.supabaseBucket,
      name: config.supabaseBucket,
      public: true,
      fileSizeLimit: 5_000_000,
    }),
  });
  if (res.ok || res.status === 400 || res.status === 409) {
    bucketReady = true;
    return;
  }
  throw new Error(`Could not ensure storage bucket: ${res.status} ${await res.text()}`);
}

/** Upload bytes to the public bucket at `objectPath`; returns the public URL. */
export async function uploadPublic(
  objectPath: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  const url = `${config.supabaseUrl}/storage/v1/object/${config.supabaseBucket}/${objectPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ "Content-Type": contentType, "x-upsert": "true" }),
    body,
  });
  if (!res.ok) {
    throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
  }
  return `${config.supabaseUrl}/storage/v1/object/public/${config.supabaseBucket}/${objectPath}`;
}

/** Decode a data URI ("data:image/png;base64,...") into bytes + content type. */
export function decodeDataUri(dataUri: string): { buffer: Buffer; contentType: string; ext: string } {
  const m = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid data URI");
  const contentType = m[1];
  const ext = contentType.split("/")[1]?.replace("+xml", "").replace("jpeg", "jpg") || "png";
  return { buffer: Buffer.from(m[2], "base64"), contentType, ext };
}
