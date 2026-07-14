import { z } from "zod";

export const roastLevelSchema = z.enum(["gentle", "familiar", "stage", "extreme"]);
export type RoastLevel = z.infer<typeof roastLevelSchema>;

export const roastModeSchema = z.enum([
  "photo",
  "outfit",
  "moments",
  "chat",
  "bio",
  "random",
]);
export type RoastMode = z.infer<typeof roastModeSchema>;

export const safetyModeSchema = z.enum(["standard", "gentle"]);

const nonemptyStringSchema = z.string().trim().min(1);

export const ROAST_TEXT_LIMITS = {
  request: 500,
  opening: 600,
  title: 60,
  observationBody: 800,
  tag: 60,
  bestJoke: 280,
  reverseCompliment: 600,
  awardCitation: 400,
  fictionalDisclaimer: 400,
} as const;

const boundedText = (maximum: number) => nonemptyStringSchema.max(maximum);

export const observationSchema = z.object({
  title: boundedText(ROAST_TEXT_LIMITS.title),
  body: boundedText(ROAST_TEXT_LIMITS.observationBody),
  tag: boundedText(ROAST_TEXT_LIMITS.tag),
});

const boundedIntegerSchema = z.number().int().min(0).max(100);

export const comedyMetricsSchema = z.object({
  atmosphere: boundedIntegerSchema,
  stubbornness: boundedIntegerSchema,
  casualCredibility: boundedIntegerSchema,
});

export const awardSchema = z.object({
  title: boundedText(ROAST_TEXT_LIMITS.title),
  citation: boundedText(ROAST_TEXT_LIMITS.awardCitation),
});

export const roastResultSchema = z.object({
  opening: boundedText(ROAST_TEXT_LIMITS.opening),
  observations: z.array(observationSchema).min(3).max(5),
  bestJoke: boundedText(ROAST_TEXT_LIMITS.bestJoke),
  reverseCompliment: boundedText(ROAST_TEXT_LIMITS.reverseCompliment),
  comedyTags: z.array(boundedText(ROAST_TEXT_LIMITS.tag)).length(3),
  metrics: comedyMetricsSchema,
  award: awardSchema,
  safetyMode: safetyModeSchema,
});
export type RoastResult = z.infer<typeof roastResultSchema>;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3);

function getBase64Value(character: string): number {
  const code = character.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 97 && code <= 122) return code - 71;
  if (code >= 48 && code <= 57) return code + 4;
  if (character === "+") return 62;
  if (character === "/") return 63;
  return -1;
}

function inspectBase64(dataUrl: string, offset: number): { size: number; prefix: number[] } | null {
  const payloadLength = dataUrl.length - offset;
  if (
    payloadLength === 0 ||
    payloadLength > MAX_BASE64_LENGTH ||
    payloadLength % 4 !== 0
  ) {
    return null;
  }

  const padding = dataUrl.endsWith("==") ? 2 : dataUrl.endsWith("=") ? 1 : 0;
  const dataLength = payloadLength - padding;
  const prefix: number[] = [];
  for (let index = 0; index < dataLength; index += 1) {
    if (getBase64Value(dataUrl[offset + index]) === -1) return null;
  }
  for (let index = 0; index < Math.min(payloadLength, 16); index += 4) {
    const a = getBase64Value(dataUrl[offset + index]);
    const b = getBase64Value(dataUrl[offset + index + 1]);
    const c = getBase64Value(dataUrl[offset + index + 2]);
    const d = getBase64Value(dataUrl[offset + index + 3]);
    if (a < 0 || b < 0) break;
    prefix.push((a << 2) | (b >> 4));
    if (c >= 0) prefix.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) prefix.push(((c & 3) << 6) | d);
  }

  if (padding === 2 && (getBase64Value(dataUrl.at(-3) ?? "") & 15) !== 0) {
    return null;
  }
  if (padding === 1 && (getBase64Value(dataUrl.at(-2) ?? "") & 3) !== 0) {
    return null;
  }

  const size = (payloadLength / 4) * 3 - padding;
  return size <= MAX_IMAGE_BYTES ? { size, prefix } : null;
}

function hasMagic(mimeType: string, bytes: number[]): boolean {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  return [0x52, 0x49, 0x46, 0x46].every((byte, index) => bytes[index] === byte) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte);
}

const roastImageSchema = z
  .object({
    dataUrl: z
      .string()
      .regex(/^data:image\/(?:jpeg|png|webp);base64,/),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().positive().max(MAX_IMAGE_BYTES),
  }).strict()
  .refine(({ dataUrl, mimeType }) => dataUrl.startsWith(`data:${mimeType};base64,`), {
    message: "Image MIME type must match its data URL",
    path: ["mimeType"],
  })
  .superRefine(({ dataUrl, mimeType, size }, context) => {
    const inspected = inspectBase64(dataUrl, dataUrl.indexOf(",") + 1);

    if (inspected === null) {
      context.addIssue({
        code: "custom",
        message: "Image payload must be canonical Base64 within 10 MiB",
        path: ["dataUrl"],
      });
    } else if (inspected.size !== size) {
      context.addIssue({
        code: "custom",
        message: "Image size must match the decoded payload",
        path: ["size"],
      });
    } else if (!hasMagic(mimeType, inspected.prefix)) context.addIssue({ code: "custom", message: "Image signature must match MIME type", path: ["dataUrl"] });
  });

export const roastRequestSchema = z
  .object({
    text: z.string().trim().max(ROAST_TEXT_LIMITS.request).optional(),
    image: roastImageSchema.optional(),
    level: roastLevelSchema,
    mode: roastModeSchema,
  }).strict()
  .refine(({ text, image }) => Boolean(text || image), {
    message: "Text or image is required",
  });
