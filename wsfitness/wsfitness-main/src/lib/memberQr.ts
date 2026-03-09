import CryptoJS from 'crypto-js';

// AES-128 encryption key (must be exactly 16 chars)
const ENCRYPTION_KEY = 'wsfitness_secret';

/**
 * Generate encrypted QR payload:
 * - MemberID (8 chars, padded with '0' if needed) + Timestamp (8 hex chars) = 16 chars
 * - AES-128-ECB encrypted with NoPadding → exactly 32 hex chars output
 */
export function generateEncryptedQrPayload(memberId: string): string {
  if (!memberId || memberId.trim().length === 0) {
    return '';
  }
  
  // Strip WS- prefix if present, then ensure exactly 8 chars
  const strippedId = memberId.toUpperCase().replace(/^WS-/, '');
  const cleanId = strippedId.padEnd(8, '0').slice(0, 8);
  
  // Get current timestamp in seconds, convert to 8-char hex
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const timestampHex = timestampSeconds.toString(16).toUpperCase().padStart(8, '0').slice(-8);
  
  // Combine: 8 + 8 = 16 chars (exactly 128 bits / 16 bytes for AES-128 block)
  const plaintext = cleanId + timestampHex;
  
  // Parse key as UTF-8 (must be exactly 16 chars for AES-128)
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  
  // Parse plaintext as UTF-8 for encryption
  const plaintextBytes = CryptoJS.enc.Utf8.parse(plaintext);
  
  // Encrypt with AES-128-ECB, NoPadding (input is exactly 16 bytes)
  const encrypted = CryptoJS.AES.encrypt(plaintextBytes, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  });
  
  // Convert to hex string (exactly 32 chars for 16-byte input with no padding)
  const hexOutput = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
  
  return hexOutput;
}

// Legacy function - now redirects to encrypted version
// @deprecated Use generateEncryptedQrPayload instead
export function buildMemberQrPayload(memberId: string): string {
  return generateEncryptedQrPayload(memberId);
}
