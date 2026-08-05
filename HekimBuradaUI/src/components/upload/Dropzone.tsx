"use client";

import { useRef, useState, type DragEvent } from "react";
import { FiFile, FiUploadCloud, FiX } from "react-icons/fi";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — backend ile aynı sınır

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Dropzone({
  file,
  onFileChange,
  disabled,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSet = (candidate: File) => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Sadece JPEG, PNG veya PDF yükleyebilirsiniz.");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("Dosya en fazla 10 MB olabilir.");
      return;
    }
    setError(null);
    onFileChange(candidate);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FiFile className="shrink-0 text-brand" size={20} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{file.name}</div>
            <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dosyayı kaldır"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-1.5 border-dashed px-4 py-10 text-center transition-colors ${
          isDragging ? "border-brand bg-brand-soft" : "border-[#C9CFD2] bg-[#FAFBFB]"
        } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-brand/60"}`}
      >
        <FiUploadCloud className="text-muted-foreground" size={28} />
        <div className="text-sm font-semibold text-foreground">
          Dosyayı buraya sürükleyin veya <span className="text-brand">seçmek için tıklayın</span>
        </div>
        <div className="text-xs text-muted-foreground">JPEG, PNG veya PDF · en fazla 10 MB</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) validateAndSet(selected);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
