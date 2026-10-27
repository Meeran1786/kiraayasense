"use client";

/**
 * Uploads a file to our own /api/uploads/local route (see that route's
 * docblock for why local disk storage rather than S3/R2 pre-signed URLs —
 * short version: no object-storage credentials are configured yet, and this
 * keeps the interface identical to the eventual real thing so swapping it
 * in later is a one-file change). `uploadFile`'s signature (file, purpose,
 * onProgress) → storageKey is unchanged from the presign-based version, so
 * ProofUploadSection/FileDropzone needed no changes.
 */

export type UploadPurpose = "REVIEW_MEDIA" | "VERIFICATION_PROOF";

export interface UploadResult {
  storageKey: string;
  url: string | null;
}

export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (pct: number) => void
): Promise<string> {
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("file", file);

  const result = await new Promise<UploadResult>((resolve, reject) => {
    // XHR (not fetch) purely for upload-progress events, which fetch's
    // Request/Response streaming does not expose cross-browser yet.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/local");
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore parse failure, handled by status check below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.storageKey) {
        resolve(body);
      } else {
        reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
    xhr.send(formData);
  });

  return result.storageKey;
}
