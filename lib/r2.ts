import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-compatible) storage for generated .glb files.
 * Optional: when not configured, generated models are streamed through /api/model instead.
 */
interface R2Config {
  client: AwsClient;
  endpoint: string;
  publicUrl: string;
}

function config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    client: new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
    publicUrl: R2_PUBLIC_URL.replace(/\/$/, ""),
  };
}

export const r2Enabled = () => config() !== null;

/**
 * Copy a remote .glb into R2 once (idempotent: a HEAD check avoids re-uploading on every poll)
 * and return its public CDN URL.
 */
export async function persistModel(key: string, sourceUrl: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const objectUrl = `${cfg.endpoint}/${key}`;
  const head = await cfg.client.fetch(objectUrl, { method: "HEAD" });
  if (head.ok) return `${cfg.publicUrl}/${key}`;

  const src = await fetch(sourceUrl, { cache: "no-store" });
  if (!src.ok || !src.body) throw new Error(`Could not download generated model (${src.status})`);
  const put = await cfg.client.fetch(objectUrl, {
    method: "PUT",
    body: await src.arrayBuffer(),
    headers: { "Content-Type": "model/gltf-binary", "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!put.ok) throw new Error(`R2 upload failed (${put.status})`);
  return `${cfg.publicUrl}/${key}`;
}
