// Member ID validation utilities
// Format: WS-[8 alphanumeric chars, excluding 0, O, 1, I]

const MEMBER_ID_REGEX = /^WS-[A-HJ-NP-Z2-9]{8}$/;

export function isValidMemberId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return MEMBER_ID_REGEX.test(id.toUpperCase().trim());
}

export function validateMemberIdFormat(id: string): { valid: boolean; message: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, message: 'No code detected' };
  }
  
  const trimmed = id.toUpperCase().trim();
  
  if (!trimmed.startsWith('WS-')) {
    return { valid: false, message: 'Invalid QR Format. Code must start with "WS-"' };
  }
  
  if (!MEMBER_ID_REGEX.test(trimmed)) {
    return { valid: false, message: 'Invalid QR Format. Please scan a valid Member ID.' };
  }
  
  return { valid: true, message: 'Valid format' };
}
