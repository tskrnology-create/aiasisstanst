const MAX_MODEL_BYTES = 50 * 1024 * 1024;
const MAX_JSON_CHUNK_BYTES = 2 * 1024 * 1024;
const GLB_JSON_CHUNK = 0x4e4f534a;

type GlbDocument = {
  asset?: { version?: unknown };
  buffers?: Array<{ uri?: unknown }>;
  images?: Array<{ uri?: unknown }>;
};

/** Untrusted GLB v2 container checks before data is sent to model-viewer. */
export function validateGlb(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 20 || bytes.byteLength > MAX_MODEL_BYTES) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "glTF") return false;
  if (view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) return false;

  let offset = 12;
  let firstChunk = true;
  let hasJson = false;
  let jsonDocument: GlbDocument | null = null;

  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return false;
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkLength % 4 !== 0 || chunkEnd > bytes.byteLength) return false;

    if (firstChunk) {
      if (chunkType !== GLB_JSON_CHUNK || chunkLength === 0 || chunkLength > MAX_JSON_CHUNK_BYTES) return false;
      try {
        const text = new TextDecoder().decode(bytes.subarray(chunkStart, chunkEnd)).replace(/\0+$/g, "").trim();
        jsonDocument = JSON.parse(text) as GlbDocument;
      } catch {
        return false;
      }
      if (!jsonDocument || typeof jsonDocument.asset?.version !== "string" || !jsonDocument.asset.version.startsWith("2.")) return false;
      hasJson = true;
      firstChunk = false;
    }
    offset = chunkEnd;
  }

  if (offset !== bytes.byteLength || !hasJson || !jsonDocument) return false;
  for (const resource of [...(jsonDocument.buffers ?? []), ...(jsonDocument.images ?? [])]) {
    if (resource.uri !== undefined && (typeof resource.uri !== "string" || !resource.uri.startsWith("data:"))) return false;
  }
  return true;
}
