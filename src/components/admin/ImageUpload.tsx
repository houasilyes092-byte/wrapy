"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Trash2, Check, Plus } from "lucide-react";
import Image from "next/image";
import { uploadFile as uploadToStorage } from "@/lib/upload-client";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string | null;
  url?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = "Collection Image",
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  className = "",
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    if (value && images.length === 0) {
      const existingImage: UploadedImage = {
        id: "existing",
        file: new File([], "existing"),
        preview: value,
        progress: 100,
        status: "complete",
        url: value,
      };
      setImages([existingImage]);
    }
  }, [value, images.length]);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return "Invalid file type. Use JPG, PNG, WEBP, GIF or SVG.";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  }, [acceptedTypes, maxSizeMB]);

  const uploadFile = useCallback(async (image: UploadedImage) => {
    const controller = new AbortController();
    abortControllersRef.current.push(controller);

    setImages((prev) =>
      prev.map((img) => (img.id === image.id ? { ...img, status: "uploading" as const, progress: 0 } : img))
    );

    try {
      const url = await uploadToStorage("/api/admin/upload", image.file, controller.signal);

      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, status: "complete" as const, progress: 100, url }
            : img
        )
      );

      onChange(url);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: "error" as const, error: error.message }
              : img
          )
        );
      }
    }
  }, [onChange]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const availableSlots = maxFiles - images.filter((img) => img.status !== "error").length;

      const validFiles = fileArray.slice(0, availableSlots).map((file) => {
        const error = validateFile(file);
        const preview = URL.createObjectURL(file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          progress: 0,
          status: error ? ("error" as const) : ("pending" as const),
          error,
        };
      });

      setImages((prev) => [...prev, ...validFiles]);

      validFiles.forEach((img) => {
        if (img.status === "pending") {
          uploadFile(img);
        }
      });
    },
    [images, maxFiles, validateFile, uploadFile]
  );

  const removeImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const img = prev.find((i) => i.id === id);
        if (img?.preview && img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
        const controller = abortControllersRef.current.find((c) => c.signal.reason === id);
        if (controller) controller.abort();
        return prev.filter((i) => i.id !== id);
      });

      if (images.filter((i) => i.id !== id).length === 0) {
        onChange("");
      }
    },
    [images, onChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div className={className}>
      <label className="text-xs text-dark-muted block mb-1.5">{label}</label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer ${
          dragActive
            ? "border-brand bg-brand/5"
            : images.length > 0 && images[0].status === "complete"
            ? "border-brand/30 bg-brand/5"
            : "border-dark-border hover:border-brand/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Upload images"
        />

        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Upload className="w-6 h-6 text-dark-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Click or drag to upload</p>
              <p className="text-xs text-dark-muted">
                {multiple ? "Multiple files" : "Single file"} • Max {maxSizeMB}MB • JPG, PNG, WEBP
              </p>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="space-y-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-4 p-3 bg-dark rounded-xl border border-dark-border"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-dark-border">
                  {img.status === "uploading" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-brand animate-spin" />
                    </div>
                  ) : img.status === "error" ? (
                    <div className="w-full h-full flex items-center justify-center text-red-400">
                      <X className="w-6 h-6" />
                    </div>
                  ) : (
                    <Image
                      src={img.preview}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                  {img.status === "complete" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {img.status === "complete" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{img.file.name || "Existing image"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {img.status === "uploading" && (
                      <>
                        <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all duration-300"
                            style={{ width: `${img.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-dark-muted">{img.progress}%</span>
                      </>
                    )}
                    {img.status === "error" && (
                      <span className="text-xs text-red-400">{img.error}</span>
                    )}
                    {img.status === "complete" && (
                      <span className="text-xs text-green-400">Uploaded</span>
                    )}
                    {img.status === "pending" && <span className="text-xs text-dark-muted">Waiting...</span>}
                  </div>
                </div>
              </div>
            ))}

            {images.filter((i) => i.status !== "error").length < maxFiles && (
              <button
                type="button"
                onClick={openFileDialog}
                className="w-full flex items-center justify-center gap-2 text-sm text-brand hover:text-brand-dark py-2 border border-brand/30 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Image
              </button>
            )}
          </div>
        )}
      </div>

      <input type="hidden" value={images.find((i) => i.status === "complete")?.url || ""} readOnly />
    </div>
  );
}
