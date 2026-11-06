import type { Id } from "../_generated/dataModel";

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** URL-safe random ID. Works in both the Convex and Node runtimes. */
export function randomId(length = 21): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte & 63];
  return id;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
}

/**
 * R2 object keys. Every key lives under a prefix owned by one track, so a
 * mutation can check that a client-supplied key really belongs to the track
 * it is being attached to.
 */
export function versionKeys(
  trackId: Id<"tracks">,
  fileName: string,
  needsConversion: boolean,
): { streamingKey: string; originalKey?: string } {
  const id = randomId();
  const ext = extensionOf(fileName);
  const base = `tracks/${trackId}/${id}`;
  return needsConversion
    ? { streamingKey: `${base}-stream.mp3`, originalKey: `${base}-original.${ext}` }
    : { streamingKey: `${base}-stream.${ext}` };
}

export function attachmentKey(trackId: Id<"tracks">, fileName: string): string {
  return `attachments/${trackId}/${randomId()}.${extensionOf(fileName)}`;
}

export function isVersionKeyFor(trackId: Id<"tracks">, key: string): boolean {
  return key.startsWith(`tracks/${trackId}/`) && !key.includes("..");
}

export function isAttachmentKeyFor(trackId: Id<"tracks">, key: string): boolean {
  return key.startsWith(`attachments/${trackId}/`) && !key.includes("..");
}
