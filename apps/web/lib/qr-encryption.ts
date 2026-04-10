import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = "wsfitness_secret";

function normalizeMemberId(memberId: string): string {
  const normalized = memberId.trim().toUpperCase().replace(/^WS-/, "");
  const hexOnly = normalized.replace(/[^0-9A-F]/g, "");
  return hexOnly.padEnd(8, "0").slice(0, 8);
}

export function generateEncryptedQrPayload(memberId: string): string {
  if (!memberId || memberId.trim().length === 0) {
    return "";
  }

  const cleanMemberId = normalizeMemberId(memberId);
  if (!cleanMemberId) {
    return "";
  }

  const timestampSeconds = Math.floor(Date.now() / 1000);
  const timestampHex = timestampSeconds
    .toString(16)
    .toUpperCase()
    .padStart(8, "0")
    .slice(-8);

  const plaintext = `${cleanMemberId}${timestampHex}`;
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  const plaintextBytes = CryptoJS.enc.Utf8.parse(plaintext);

  const encrypted = CryptoJS.AES.encrypt(plaintextBytes, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  });

  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
}

