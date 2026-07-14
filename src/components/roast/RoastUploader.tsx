"use client";

import { useEffect, useRef, useState } from "react";
import { EASTER_EGG_MESSAGES } from "@/lib/domain/easter-eggs";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
};

export default function RoastUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const renderedValue = useRef<File | null>(null);
  const validationId = useRef(0);

  const updatePreview = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const next = file ? URL.createObjectURL(file) : null;
    previewRef.current = next;
    setPreview(next);
  };

  useEffect(() => {
    if (value !== renderedValue.current) {
      renderedValue.current = value;
      updatePreview(value);
    }
  }, [value]);

  useEffect(() => () => {
    validationId.current += 1;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const acceptFile = async (file?: File) => {
    const currentValidation = ++validationId.current;
    setError("");
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("仅支持 JPG、PNG 或 WEBP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("照片不能超过 10MB");
      return;
    }
    const header = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(new Uint8Array(reader.result)) : reject(new Error("invalid header"));
      reader.onerror = () => reject(reader.error ?? new Error("header read failed"));
      reader.readAsArrayBuffer(file.slice(0, 12));
    }).catch(() => null);
    if (currentValidation !== validationId.current) return;
    const hasMagic = header !== null && (
      (file.type === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) ||
      (file.type === "image/png" && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte)) ||
      (file.type === "image/webp" && [0x52, 0x49, 0x46, 0x46].every((byte, index) => header[index] === byte) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => header[index + 8] === byte))
    );
    if (!hasMagic) {
      setError("照片内容和文件类型不一致");
      return;
    }
    const replacing = Boolean(previewRef.current || value);
    renderedValue.current = file;
    updatePreview(file);
    if (replacing) setAnnouncement(EASTER_EGG_MESSAGES.reupload);
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = () => {
    validationId.current += 1;
    renderedValue.current = null;
    updatePreview(null);
    setError("");
    setAnnouncement(EASTER_EGG_MESSAGES.deleteEvidence);
    onChange(null);
  };

  return (
    <section className="roast-uploader" aria-labelledby="upload-title">
      <div
        className={`upload-dropzone${preview ? " has-preview" : ""}`}
        role="button"
        tabIndex={0}
        aria-labelledby="upload-title upload-help"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void acceptFile(event.dataTransfer.files[0]);
        }}
      >
        {/* Blob previews are local-only and cannot use the Next image optimizer. */}
        {preview ? <img src={preview} alt="已上传照片预览" /> : <span className="upload-mark" aria-hidden="true">＋</span>}{/* eslint-disable-line @next/next/no-img-element */}
        <strong id="upload-title">把喜剧素材交出来</strong>
        <span id="upload-help">拖到这里，或按回车选择 JPG、PNG、WEBP（最大 10MB）</span>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="上传照片"
        onChange={(event) => void acceptFile(event.target.files?.[0])}
      />
      {preview ? (
        <div className="upload-actions">
          <button className="button-secondary" type="button" onClick={() => inputRef.current?.click()}>替换照片</button>
          <button className="button-quiet-danger" type="button" onClick={remove}>删除照片</button>
        </div>
      ) : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <p className="field-announcement" aria-live="polite">{announcement}</p>
    </section>
  );
}
