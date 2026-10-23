export async function verifyMpWebhookSignature(
  signature: string | null,
  requestId: string | null,
  orderId: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !requestId || !orderId || !secret) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  if (!/^\d{10,16}$/.test(parts.ts ?? "") || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? "")) return false;
  const manifest = `id:${orderId};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  const supplied = Uint8Array.from(parts.v1.match(/.{2}/g) ?? [], (hex) => Number.parseInt(hex, 16));
  if (signed.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < signed.length; index++) difference |= signed[index] ^ supplied[index];
  return difference === 0;
}
