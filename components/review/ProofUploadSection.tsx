"use client";

import { useEffect, useRef, useState } from "react";
import { FileImage, FileVideo, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { FileDropzone } from "./FileDropzone";
import { uploadFile } from "@/lib/uploadClient";
import { brand } from "@/lib/brand";
import { PROOF_TYPES, PROOF_TYPE_LABELS, type ProofType } from "@/lib/reviewValidation";

interface UploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
  status: "uploading" | "done" | "error";
  storageKey?: string;
  error?: string;
}

interface ProofUploadItem extends UploadItem {
  proofType: ProofType;
  consented: boolean;
}

interface ProofUploadSectionProps {
  // From the question set: housing keeps v1's mandatory proof of stay;
  // elsewhere both are optional and a proof only earns the verified badge.
  mediaRequired: boolean;
  proofRequired: boolean;
  defaultProofType: ProofType;
  onMediaChange: (storageKeys: string[]) => void;
  onProofChange: (proofs: { proofType: ProofType; storageKey: string; consented: true }[]) => void;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const PROOF_TYPE_OPTIONS = PROOF_TYPES.map((value) => ({ value, label: PROOF_TYPE_LABELS[value] }));

export function ProofUploadSection({ mediaRequired, proofRequired, defaultProofType, onMediaChange, onProofChange }: ProofUploadSectionProps) {
  const [mediaItems, setMediaItems] = useState<UploadItem[]>([]);
  const [proofItems, setProofItems] = useState<ProofUploadItem[]>([]);

  // Keep parent form state in sync whenever an upload completes/changes.
  useEffect(() => {
    onMediaChange(mediaItems.filter((i) => i.status === "done" && i.storageKey).map((i) => i.storageKey!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaItems]);

  useEffect(() => {
    onProofChange(
      proofItems
        .filter((i): i is ProofUploadItem & { storageKey: string } =>
          i.status === "done" && !!i.storageKey && i.consented
        )
        .map((i) => ({ proofType: i.proofType, storageKey: i.storageKey, consented: true as const }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofItems]);

  const uploadMedia = async (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: makeId(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: "uploading",
    }));
    setMediaItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const storageKey = await uploadFile(item.file, "REVIEW_MEDIA", (pct) =>
          setMediaItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)))
        );
        setMediaItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "done", storageKey, progress: 100 } : i))
        );
      } catch (err) {
        setMediaItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : i
          )
        );
      }
    }
  };

  const uploadProof = async (files: File[]) => {
    const newItems: ProofUploadItem[] = files.map((file) => ({
      id: makeId(),
      file,
      progress: 0,
      status: "uploading",
      proofType: defaultProofType,
      consented: false,
    }));
    setProofItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const storageKey = await uploadFile(item.file, "VERIFICATION_PROOF", (pct) =>
          setProofItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)))
        );
        setProofItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "done", storageKey, progress: 100 } : i))
        );
      } catch (err) {
        setProofItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : i
          )
        );
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Residency / condition proof — photos & video walkthroughs */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--ks-text)]">
          Photos or video{" "}
          {mediaRequired ? (
            <span style={{ color: brand.danger }}>*</span>
          ) : (
            <span className="font-normal text-[var(--ks-text-faint)]">(optional)</span>
          )}
        </h3>
        <FileDropzone
          label="Drag & drop photos or a video"
          helperText={`${mediaRequired ? "At least 1 file required · " : ""}JPG, PNG, or MP4 up to 200MB`}
          accept="image/jpeg,image/png,video/mp4"
          onFilesSelected={uploadMedia}
        />
        {mediaItems.length > 0 && (
          <ul className="flex flex-col gap-2">
            {mediaItems.map((item) => (
              <UploadRow key={item.id} item={item} onRemove={() => setMediaItems((prev) => prev.filter((i) => i.id !== item.id))} />
            ))}
          </ul>
        )}
      </div>

      {/* Proof of the experience: payment, invoice, receipt (FR-REV-4) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--ks-text)]">
          Proof{" "}
          {proofRequired ? (
            <span style={{ color: brand.danger }}>*</span>
          ) : (
            <span className="font-normal text-[var(--ks-text-faint)]">(optional, earns a "Proof verified" badge)</span>
          )}
        </h3>
        <p className="text-xs text-[var(--ks-text-muted)]">
          A UPI transaction, receipt, invoice or bank statement that shows you dealt with this business.
          Sensitive details (account numbers, third-party names) are blurred before your review is published.
        </p>
        <FileDropzone
          label="Drag & drop a proof"
          helperText={`${proofRequired ? "At least 1 file required · " : ""}JPG, PNG, or PDF up to 20MB`}
          accept="image/jpeg,image/png,application/pdf"
          onFilesSelected={uploadProof}
        />
        {proofItems.length > 0 && (
          <ul className="flex flex-col gap-3">
            {proofItems.map((item) => (
              <ProofRow
                key={item.id}
                item={item}
                onChange={(patch) =>
                  setProofItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
                }
                onRemove={() => setProofItems((prev) => prev.filter((i) => i.id !== item.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: () => void }) {
  const Icon = item.file.type.startsWith("video/") ? FileVideo : FileImage;
  return (
    <li
      className="flex items-center gap-3 rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated-2)" }}
    >
      {item.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
      ) : (
        <Icon size={20} className="text-[var(--ks-text-muted)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--ks-text)]">{item.file.name}</p>
        {item.status === "uploading" && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--ks-border)" }}>
            <div
              className="h-1 rounded-full"
              style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})` }}
            />
          </div>
        )}
        {item.status === "error" && <p className="text-[11px] text-red-400">{item.error}</p>}
      </div>
      <StatusIcon status={item.status} />
      <button type="button" onClick={onRemove} aria-label="Remove file" className="text-[var(--ks-text-faint)] hover:text-red-400">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function ProofRow({
  item,
  onChange,
  onRemove,
}: {
  item: ProofUploadItem;
  onChange: (patch: Partial<ProofUploadItem>) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className="flex flex-col gap-2 rounded-lg border px-3 py-2.5"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated-2)" }}
    >
      <div className="flex items-center gap-3">
        <FileImage size={20} className="text-[var(--ks-text-muted)] shrink-0" />
        <p className="min-w-0 flex-1 truncate text-xs text-[var(--ks-text)]">{item.file.name}</p>
        <StatusIcon status={item.status} />
        <button type="button" onClick={onRemove} aria-label="Remove file" className="text-[var(--ks-text-faint)] hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      {item.status === "uploading" && (
        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--ks-border)" }}>
          <div
            className="h-1 rounded-full"
            style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})` }}
          />
        </div>
      )}
      {item.status === "error" && <p className="text-[11px] text-red-400">{item.error}</p>}

      {item.status === "done" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={item.proofType}
            onChange={(e) => onChange({ proofType: e.target.value as ProofType })}
            className="rounded-md border bg-transparent px-2 py-1 text-xs text-[var(--ks-text)]"
            style={{ borderColor: "var(--ks-border)" }}
          >
            {PROOF_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--ks-bg-elevated)]">
                {opt.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-[11px] text-[var(--ks-text-muted)]">
            <input
              type="checkbox"
              checked={item.consented}
              onChange={(e) => onChange({ consented: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-500"
            />
            I consent to this proof being used solely to verify this review
          </label>
        </div>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: UploadItem["status"] }) {
  if (status === "uploading") return <Loader2 size={16} className="shrink-0 animate-spin text-[var(--ks-text-muted)]" />;
  if (status === "done") return <CheckCircle2 size={16} className="shrink-0" style={{ color: brand.success }} />;
  return <XCircle size={16} className="shrink-0 text-red-400" />;
}
