"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RoastLevelSelector from "@/components/roast/RoastLevelSelector";
import RoastModeSelector from "@/components/roast/RoastModeSelector";
import RoastUploader from "@/components/roast/RoastUploader";
import TextMaterialInput from "@/components/roast/TextMaterialInput";
import LoadingComedyStage from "@/components/stage/LoadingComedyStage";
import RoastPreviewStage from "@/components/stage/RoastPreviewStage";
import { postJson } from "@/lib/api/client";
import { roastRequestSchema, roastResultSchema, type RoastLevel, type RoastMode, type RoastResult } from "@/lib/domain/roast";
import { clearLatestRoast, saveLatestRoast } from "@/lib/domain/storage";
import { useExitAttemptToast } from "@/components/layout/useExitAttemptToast";

type RequestState = "idle" | "loading" | "error";
type RoastImageMimeType = "image/jpeg" | "image/png" | "image/webp";
type RoastImagePayload = {
  dataUrl: string;
  mimeType: RoastImageMimeType;
  size: number;
};

const MAX_AI_IMAGE_EDGE = 1280;
const AI_IMAGE_QUALITY = 0.82;

function fileToDataUrl(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abortError = () => new DOMException("Aborted", "AbortError");
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      reader.abort();
      cleanup();
      reject(abortError());
    };
    if (signal.aborted) return reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    reader.onload = () => {
      cleanup();
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("invalid image"));
    };
    reader.onerror = () => { cleanup(); reject(new Error("image read failed")); };
    reader.onabort = () => { cleanup(); reject(abortError()); };
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abortError = () => new DOMException("Aborted", "AbortError");
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      reader.abort();
      cleanup();
      reject(abortError());
    };
    if (signal.aborted) return reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    reader.onload = () => {
      cleanup();
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("invalid image"));
    };
    reader.onerror = () => { cleanup(); reject(new Error("image read failed")); };
    reader.onabort = () => { cleanup(); reject(abortError()); };
    reader.readAsDataURL(blob);
  });
}

function dataUrlByteSize(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length / 4) * 3) - padding;
}

function canvasToJpeg(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    canvas.toBlob((blob) => {
      if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
      else if (blob) resolve(blob);
      else reject(new Error("image compression failed"));
    }, "image/jpeg", AI_IMAGE_QUALITY);
  });
}

async function imageToAiPayload(file: File, signal: AbortSignal): Promise<RoastImagePayload> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_AI_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image canvas unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToJpeg(canvas, signal);
    const dataUrl = await blobToDataUrl(blob, signal);
    return { dataUrl, mimeType: "image/jpeg", size: dataUrlByteSize(dataUrl) };
  } finally {
    bitmap.close();
  }
}

async function fileToAiPayload(file: File, signal: AbortSignal): Promise<RoastImagePayload> {
  try {
    return await imageToAiPayload(file, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const dataUrl = await fileToDataUrl(file, signal);
    return {
      dataUrl,
      mimeType: file.type as RoastImageMimeType,
      size: file.size,
    };
  }
}

export default function RoastPage() {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<RoastLevel>("familiar");
  const [mode, setMode] = useState<RoastMode>("photo");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [preview, setPreview] = useState<RoastResult | null>(null);
  const [clearStatus, setClearStatus] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const requestGeneration = useRef(0);
  const { exitMessage, exitClarification, dismissExitMessage } = useExitAttemptToast(Boolean(text.trim() || image || requestState === "loading"));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestGeneration.current += 1;
      submittingRef.current = false;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const submit = async () => {
    if (submittingRef.current) return;
    setSubmitted(true);
    setFormError("");
    if (!text.trim() && !image) {
      setFormError("请先交出一张照片或一段文字素材。");
      return;
    }
    submittingRef.current = true;
    const generation = ++requestGeneration.current;
    setPreview(null);
    setDegraded(false);
    setRequestState("loading");
    const controller = new AbortController();
    controllerRef.current = controller;
    const isCurrent = () => mountedRef.current && requestGeneration.current === generation && !controller.signal.aborted;
    try {
      const imagePayload = image ? await fileToAiPayload(image, controller.signal) : undefined;
      if (!isCurrent()) return;
      const payload = roastRequestSchema.parse({ text: text.trim() || undefined, image: imagePayload, level, mode });
      const envelope = await postJson<RoastResult>("/api/roast", payload, { signal: controller.signal });
      if (!isCurrent()) return;
      const result = roastResultSchema.parse(envelope.data);
      if (!isCurrent()) return;
      saveLatestRoast(result);
      if (!isCurrent()) return;
      setDegraded(envelope.meta.degraded);
      setPreview(result);
      setRequestState("idle");
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof DOMException && error.name === "AbortError") {
        setRequestState("idle");
      } else {
        setFormError("现场信号不稳，请稍后重试。");
        setRequestState("error");
      }
    } finally {
      if (requestGeneration.current === generation) {
        controllerRef.current = null;
        submittingRef.current = false;
      }
    }
  };

  const cancel = () => {
    requestGeneration.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    submittingRef.current = false;
    setRequestState("idle");
  };

  const clearRecent = () => {
    if (!window.confirm("清除这台设备上保存的最近结果？")) return;
    clearLatestRoast();
    setClearStatus("最近结果已从这台设备清除。");
  };

  return (
    <main id="main-content" tabIndex={-1} className="roast-page">
      <header className="roast-page-heading">
        <p className="eyebrow">CH 02 · 素材审讯室</p>
        <h1>把素材放下，喜剧价值留下</h1>
        <p>照片、朋友圈、聊天风格都可以。我们只吐槽你主动交出的细节。</p>
      </header>

      <div className="roast-workbench">
        <section className="material-panel" aria-labelledby="material-title">
          <div className="panel-heading">
            <span className="channel-number numeric">01</span>
            <div><h2 id="material-title">交出今晚的素材</h2><p>至少提供照片或文字其中一项。</p></div>
          </div>
          <RoastUploader value={image} onChange={setImage} />
          <TextMaterialInput value={text} onChange={setText} submitted={submitted} />
          <RoastModeSelector value={mode} onChange={setMode} />
          <section className="level-section" aria-labelledby="level-title">
            <h2 id="level-title">选择吐槽浓度</h2>
            <RoastLevelSelector value={level} onChange={setLevel} />
          </section>
          <aside className="privacy-card" aria-label="照片隐私说明">
            <strong>照片怎么处理？</strong>
            <p>照片会通过安全的服务器路由临时发送给 Kimi，用于生成本次回复。本网站和服务器不会存储照片，也不会写入 localStorage 或公开画廊；服务提供方会依据其条款处理本次请求。</p>
            <p>生成的文字结果和报告会在这台设备上保存最多 24 小时，方便你继续查看；照片不会随结果保存。</p>
            <button className="privacy-clear" type="button" onClick={clearRecent}>清除最近结果</button>
            <span className="sr-only" role="status" aria-live="polite">{clearStatus}</span>
          </aside>
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}
          <button className="button-primary roast-submit" type="button" disabled={requestState === "loading"} onClick={submit}>
            {requestState === "error" ? "重新开麦" : "开始吐槽"}
          </button>
        </section>

        <section className={`ai-stage-panel${preview ? " has-result" : ""}`} aria-label="AI 喜剧舞台">
          {requestState === "loading" ? <LoadingComedyStage onCancel={cancel} /> : preview ? (
            <RoastPreviewStage result={preview} onViewFull={() => router.push("/result")} />
          ) : requestState === "error" ? (
            <section className="stage-error" aria-labelledby="stage-error-title">
              <span className="live-badge">SIGNAL LOST</span>
              <div className="stage-error-icon" aria-hidden="true">⚡</div>
              <h2 id="stage-error-title">这次没有接上麦</h2>
              <p>图片理解可能需要更久，请保留素材后重新生成。</p>
              <button className="button-secondary" type="button" onClick={submit}>重新生成</button>
            </section>
          ) : (
            <div className="host-idle-stage">
              <span className="live-badge">HOST · READY</span>
              <div className="host-mic" aria-hidden="true">🎙</div>
              <blockquote>下一位观众，请不要紧张。我们只是研究一下，你为什么这么有喜剧价值。</blockquote>
              <p>素材一到，主持人马上开麦。</p>
            </div>
          )}
          {degraded ? <p className="degraded-notice" role="status">现场信号不稳，已切换安全演示内容。</p> : null}
        </section>
      </div>
      {exitMessage ? <aside className="easter-toast" role="status" aria-label="离场提示"><span><strong>{exitMessage}</strong><small>{exitClarification}</small></span><button type="button" aria-label="关闭离场提示" onClick={dismissExitMessage}>×</button></aside> : null}
    </main>
  );
}
