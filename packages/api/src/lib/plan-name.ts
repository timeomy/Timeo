const NON_ASCII_REGEX = /[^ -~]/g;

const CANONICAL_PLAN_NAME_MAP = new Map<string, string>([
  ["1 MTH MEMBERSHIP", "1 Month Membership"],
  ["COACH TRAINING X48", "Coach Training x48"],
  ["COACH TRAINING X99", "Coach Training x99"],
  ["COACH TRAINING X16", "Coach Training x16"],
  ["COACH TRAINING X1", "Coach Training x1"],
  ["COACH TRAINING 1X", "Coach Training x1"],
  ["CT PRIVILEGE PASS - 90 DAY", "CT Privilege Pass - 90 Day"],
  ["ALL-IN 1 MONTH", "All-In 1 Month"],
  ["WALK-IN 1 DAY", "Walk-In 1 Day"],
  ["ZUMBA X10 DAY", "Zumba x10 Day"],
  ["ZUMBA X4 DAY", "Zumba x4 Day"],
  ["YOGA 1 DAY", "Yoga 1 Day"],
  ["YOGA X4", "Yoga x4"],
]);

export function sanitizePlanName(rawName: string): string {
  const normalized = rawName
    .normalize("NFKC")
    .replace(/[•·]/g, " ")
    .replace(/[⏳]/g, " ")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\b(\d+)\s*mth\b/gi, "$1 Month")
    .replace(/\bx\s*(\d+)\s*day\b/gi, "x$1 Day")
    .replace(/\b(\d+)\s*x\b/gi, "x$1")
    .replace(/\bx\s*(\d+)\b/gi, "x$1")
    .replace(/\b(\d+)\s*day\b/gi, "$1 Day")
    .replace(/\bIN\s+(\d+)\s*-\s*DAY\b/gi, "- $1 Day")
    .replace(/\s+/g, " ")
    .trim();

  const canonical =
    CANONICAL_PLAN_NAME_MAP.get(normalized.toUpperCase()) ?? normalized;

  return canonical.replace(NON_ASCII_REGEX, "").replace(/\s+/g, " ").trim();
}
