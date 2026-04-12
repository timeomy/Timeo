const HEX_8_REGEX = /^[0-9A-F]{8}$/i;

function getDecimalToHexCandidates(value: string): string[] {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return [];
  }

  try {
    const asHex = BigInt(trimmed).toString(16).toUpperCase();
    const paddedHex = asHex.padStart(8, "0");

    return Array.from(new Set([asHex, paddedHex]));
  } catch {
    return [];
  }
}

function getHexToDecimalCandidate(value: string): string | null {
  const trimmed = value.trim().toUpperCase();

  if (!HEX_8_REGEX.test(trimmed)) {
    return null;
  }

  try {
    return BigInt(`0x${trimmed}`).toString(10);
  } catch {
    return null;
  }
}

export function getZahLookupCandidates(cardNo: string): string[] {
  const raw = cardNo.trim();

  if (!raw) {
    return [];
  }

  const candidates = new Set<string>();

  const addCandidateVariants = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    candidates.add(trimmed);

    const withoutSuffix = trimmed.replace(/_0$/i, "");

    if (withoutSuffix) {
      candidates.add(withoutSuffix);
      candidates.add(`${withoutSuffix}_0`);
    }
  };

  addCandidateVariants(raw);
  addCandidateVariants(raw.toUpperCase());
  addCandidateVariants(raw.toLowerCase());

  const rawWithoutSuffix = raw.replace(/_0$/i, "");

  const decimalFromHex = getHexToDecimalCandidate(rawWithoutSuffix);
  if (decimalFromHex) {
    addCandidateVariants(decimalFromHex);
  }

  for (const hexCandidate of getDecimalToHexCandidates(rawWithoutSuffix)) {
    addCandidateVariants(hexCandidate);
  }

  return Array.from(candidates);
}
