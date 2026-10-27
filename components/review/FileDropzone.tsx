"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { brand } from "@/lib/brand";

interface FileDropzoneProps {
  label: string;
  helperText: string;
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function FileDropzone({
  label,
  helperText,
  accept,
  multiple = true,
  onFilesSelected,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors"
      style={{
        borderColor: isDragActive ? brand.coral : "var(--ks-border-strong)",
        background: isDragActive ? "oklch(28% 0.04 25 / 0.15)" : "var(--ks-bg-elevated-2)",
      }}
    >
      <UploadCloud size={22} style={{ color: isDragActive ? brand.coral : "var(--ks-text-faint)" }} />
      <p className="text-sm font-medium text-[var(--ks-text)]">{label}</p>
      <p className="text-xs text-[var(--ks-text-muted)]">{helperText}</p>
      <span className="text-xs font-semibold underline underline-offset-2" style={{ color: brand.coral }}>
        or click to browse
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // allow re-selecting the same file later
        }}
      />
    </div>
  );
}
