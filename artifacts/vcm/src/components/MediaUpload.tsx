import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon, Video, X } from "lucide-react";

async function uploadFile(file: File, maxMB: number): Promise<string> {
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`File too large — max ${maxMB} MB.`);
  }
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Could not get upload URL.");
  const { uploadURL, objectPath } = await res.json();
  const put = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("Upload failed.");
  return objectPath;
}

// ── Single-file upload ────────────────────────────────────────────────────────
export function MediaUpload({ accept, maxMB, label, value, onChange }: {
  accept: string;
  maxMB: number;
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file, maxMB);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const isImage = value && /\.(jpg|jpeg|png|gif|webp)/i.test(value);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {uploading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <ImageIcon className="w-3.5 h-3.5" />}
        {uploading ? "Uploading…" : label}
      </Button>

      {value && (
        <div className="flex items-center gap-1.5">
          {isImage
            ? <img src={value} className="h-10 w-14 object-cover rounded border" alt="preview" />
            : <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />Uploaded ✓
              </span>}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-muted-foreground"
            onClick={() => onChange("")}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Multi-image upload ────────────────────────────────────────────────────────
export function MediaUploadMulti({ maxMB, maxFiles = 5, values, onChange }: {
  maxMB: number;
  maxFiles?: number;
  values: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file, maxMB);
      onChange([...values, url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} className="h-16 w-20 object-cover rounded border" alt={`photo ${i + 1}`} />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || values.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        {uploading ? "Uploading…" : `Add Photo${values.length > 0 ? ` (${values.length}/${maxFiles})` : ""}`}
      </Button>
    </div>
  );
}
