/**
 * Sanitize text for jsPDF which only supports basic Latin characters.
 * Converts Unicode bold/italic math chars and superscripts to ASCII equivalents.
 */
export function sanitizeForPdf(text: string): string {
  let result = '';
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    // Mathematical Bold Sans-Serif Uppercase A-Z: U+1D5D4–U+1D5ED
    if (cp >= 0x1D5D4 && cp <= 0x1D5ED) {
      result += String.fromCharCode(65 + (cp - 0x1D5D4));
    // Mathematical Bold Sans-Serif Lowercase a-z: U+1D5EE–U+1D607
    } else if (cp >= 0x1D5EE && cp <= 0x1D607) {
      result += String.fromCharCode(97 + (cp - 0x1D5EE));
    // Mathematical Bold Uppercase A-Z: U+1D400–U+1D419
    } else if (cp >= 0x1D400 && cp <= 0x1D419) {
      result += String.fromCharCode(65 + (cp - 0x1D400));
    // Mathematical Bold Lowercase a-z: U+1D41A–U+1D433
    } else if (cp >= 0x1D41A && cp <= 0x1D433) {
      result += String.fromCharCode(97 + (cp - 0x1D41A));
    // Mathematical Italic Uppercase: U+1D434–U+1D44D
    } else if (cp >= 0x1D434 && cp <= 0x1D44D) {
      result += String.fromCharCode(65 + (cp - 0x1D434));
    // Mathematical Italic Lowercase: U+1D44E–U+1D467
    } else if (cp >= 0x1D44E && cp <= 0x1D467) {
      result += String.fromCharCode(97 + (cp - 0x1D44E));
    // Superscript digits and x
    } else {
      const superMap: Record<string, string> = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
        'ˣ': 'x',
      };
      if (superMap[char]) {
        result += superMap[char];
      } else if (cp >= 0x20 && cp <= 0x7E) {
        // Standard ASCII printable range
        result += char;
      } else if (char === '·' || char === '•') {
        result += '-';
      }
      // else: strip the character
    }
  }
  return result;
}
