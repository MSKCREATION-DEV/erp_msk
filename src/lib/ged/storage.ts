import { createAdminClient } from "@/lib/supabase/admin";
import { GED_BUCKET } from "@/lib/ged/constants";

export async function ensureGedBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === GED_BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(GED_BUCKET, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (error && !error.message.toLowerCase().includes("already")) {
      throw new Error(`Création bucket GED: ${error.message}`);
    }
  }
}

export async function uploadGedObject(
  storagePath: string,
  body: Buffer | Uint8Array,
  mime: string,
  opts?: { upsert?: boolean },
) {
  await ensureGedBucket();
  const admin = createAdminClient();
  const { error } = await admin.storage.from(GED_BUCKET).upload(storagePath, body, {
    contentType: mime,
    upsert: opts?.upsert ?? false,
  });
  if (error) throw new Error(error.message);
}

export async function signedGedUrl(storagePath: string, expiresIn = 3600) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(GED_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Signed URL impossible");
  }
  return data.signedUrl;
}

export async function removeGedObject(storagePath: string) {
  const admin = createAdminClient();
  await admin.storage.from(GED_BUCKET).remove([storagePath]);
}

export async function downloadGedObject(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(GED_BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Téléchargement Storage impossible");
  }
  return Buffer.from(await data.arrayBuffer());
}
