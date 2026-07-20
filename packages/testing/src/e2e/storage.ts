import type { ApiTestClient } from "./api-client.js";

/** Minimal valid PDF bytes for upload tests. */
export const MINIMAL_PDF_BYTES = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n9\n%%EOF\n",
);

/** Standard EICAR antivirus test string (safe — not real malware). */
export const EICAR_TEST_BYTES = Buffer.from(
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
);

export interface UploadFileInput {
  purpose: string;
  originalFilename: string;
  declaredMimeType: string;
  bytes: Buffer;
  pitchId?: string;
  organizationId?: string;
}

export interface UploadedFileResult {
  id: string;
  uploadStatus: string;
  scanStatus: string;
}

export async function uploadFileViaIntent(
  client: ApiTestClient,
  input: UploadFileInput,
): Promise<UploadedFileResult> {
  const intent = await client.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: input.purpose,
      originalFilename: input.originalFilename,
      declaredMimeType: input.declaredMimeType,
      sizeBytes: input.bytes.length,
      ...(input.pitchId ? { pitchId: input.pitchId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    },
  });

  const intentData = intent.data as { fileId: string; uploadUrl: string };
  const uploadResponse = await fetch(intentData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": input.declaredMimeType },
    body: new Uint8Array(input.bytes),
  });
  if (!uploadResponse.ok) {
    throw new Error(`Storage upload failed with status ${String(uploadResponse.status)}`);
  }

  const completed = await client.request(`/files/${intentData.fileId}/complete`, {
    method: "POST",
  });
  const file = completed.data as { id: string; uploadStatus: string; scanStatus: string };
  return {
    id: file.id,
    uploadStatus: file.uploadStatus,
    scanStatus: file.scanStatus,
  };
}

export async function expectUploadRejected(
  client: ApiTestClient,
  input: UploadFileInput,
): Promise<void> {
  const intent = await client.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: input.purpose,
      originalFilename: input.originalFilename,
      declaredMimeType: input.declaredMimeType,
      sizeBytes: input.bytes.length,
      ...(input.pitchId ? { pitchId: input.pitchId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    },
  });

  const intentData = intent.data as { fileId: string; uploadUrl: string };
  const uploadResponse = await fetch(intentData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": input.declaredMimeType },
    body: new Uint8Array(input.bytes),
  });
  if (!uploadResponse.ok) {
    return;
  }

  try {
    await client.request(`/files/${intentData.fileId}/complete`, { method: "POST" });
    throw new Error("Expected upload finalization to be rejected");
  } catch (error) {
    if (error instanceof Error && error.message === "Expected upload finalization to be rejected") {
      throw error;
    }
  }
}
