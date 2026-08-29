import "server-only";

const SENSITIVE_PATTERNS: Array<[string, RegExp]> = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["phone", /\b(?:\+?\d[\d\s().-]{7,}\d)\b/],
  ["credit_card", /\b(?:\d[ -]*?){13,19}\b/],
  ["ip_address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
];

export function detectSensitiveData(text: string) {
  return SENSITIVE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([type]) => type);
}

export function redactSensitiveData(text: string) {
  let output = text;
  for (const [type, pattern] of SENSITIVE_PATTERNS) output = output.replace(pattern, `[REDACTED:${type}]`);
  return output;
}

export function retentionDueAt(days: number, from = new Date()) {
  const safeDays = Math.max(30, Math.min(3650, Math.floor(days)));
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + safeDays);
  return date;
}
