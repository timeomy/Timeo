import * as React from "react";
import { X, Loader2, ImagePlus } from "lucide-react";
import { cn } from "../lib/cn";

export interface WebImageUploaderProps {
  onUpload: (storageId: string, url: string) => void;
  generateUploadUrl: () => Promise<string>;
  currentImageUrl?: string | null;
  accept?: string;
  maxSizeMB?: number;
  onRemove?: () => void;
  label?: string;
  circular?: boolean;
  className?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  onUpload,
  generateUploadUrl,
  currentImageUrl,
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 10,
  onRemove,
  label = "Upload Image",
  circular = false,
  className,
}: WebImageUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentImageUrl;

  const processFile = React.useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Please upload a JPEG, PNG, or WebP image.");
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);

      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();
        onUpload(storageId, localPreview);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Please retry."
        );
        setPreviewUrl(null);
        URL.revokeObjectURL(localPreview);
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, maxSizeMB, onUpload]
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFile]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleRemove = React.useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    onRemove?.();
  }, [previewUrl, onRemove]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      {displayUrl ? (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="Uploaded"
            className={cn(
              "object-cover border",
              circular ? "rounded-full" : "rounded-lg",
              "h-40 w-40"
            )}
          />
          {uploading ? (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/50",
                circular ? "rounded-full" : "rounded-lg"
              )}
            >
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : (
            <button
              onClick={handleRemove}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex h-40 w-40 cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-colors",
            circular ? "rounded-full" : "rounded-lg",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-7 w-7 text-muted-foreground" />
              <span className="mt-2 text-xs text-muted-foreground">
                Click or drop
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
