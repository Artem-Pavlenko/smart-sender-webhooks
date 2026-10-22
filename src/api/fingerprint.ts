const STORAGE_KEY = "device_fingerprint";
const FINGERPRINT_RE = /^[0-9a-f]{32}$/;

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

let cached: string | null = null;

export function getFingerprint(): string {
  if (cached) return cached;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && FINGERPRINT_RE.test(stored)) {
    cached = stored;
  } else {
    cached = generate();
    localStorage.setItem(STORAGE_KEY, cached);
  }
  return cached;
}
