/** Browser-safe base64 decode (no Node Buffer). */
export function decodeBase64(bytes: string): Uint8Array {
  const binary = atob(bytes);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
