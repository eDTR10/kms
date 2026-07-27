import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_STORAGE_KEY;

if (!SECRET_KEY) {
  console.warn(
    "VITE_STORAGE_KEY is not set. Falling back to storing localStorage values in plaintext."
  );
}

function encrypt(value: string): string {
  if (!SECRET_KEY) return value;
  return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
}

function decrypt(value: string): string | null {
  if (!SECRET_KEY) return value;
  try {
    const bytes = CryptoJS.AES.decrypt(value, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted === "" && value !== "") return null;
    return decrypted;
  } catch {
    return null;
  }
}

// ── one-time migration from earlier storage formats ──────────────────────────
const LEGACY_PREFIX = "enc.v1:";

function migrateLegacy(key: string, raw: string): string | null {
  const plain = raw.startsWith(LEGACY_PREFIX)
    ? decrypt(raw.slice(LEGACY_PREFIX.length))
    : decrypt(raw);
  if (plain !== null) {
    try {
      localStorage.setItem(key, encrypt(plain));
    } catch {
      // Quota errors shouldn't break reads
    }
  }
  return plain;
}

/**
 * Drop-in replacement for the localStorage API that transparently
 * encrypts values at rest using AES, keyed by VITE_STORAGE_KEY.
 */
export const secureStorage = {
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const decrypted = decrypt(raw);
    if (decrypted !== null) return decrypted;
    return migrateLegacy(key, raw);
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, encrypt(value));
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
  clear(): void {
    localStorage.clear();
  },
};

export default secureStorage;
