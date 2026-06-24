import { createHash } from "node:crypto";

export function normalizeWhitespace(value: string) {
  return value
    .normalize("NFC")
    .replaceAll("\u0000", "")
    .replace(/\s+/g, " ")
    .trim();
}

export function deterministicUuid(identity: string) {
  const bytes = createHash("sha256").update(identity).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isoDateFromOfficial(value: string) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export function ageOnDate(dateOfBirth: string, targetDate: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const target = new Date(`${targetDate}T00:00:00Z`);
  let age = target.getUTCFullYear() - birth.getUTCFullYear();
  if (
    target.getUTCMonth() < birth.getUTCMonth() ||
    (target.getUTCMonth() === birth.getUTCMonth() &&
      target.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function splitClub(value: string) {
  const match = normalizeWhitespace(value).match(/^(.*) \(([A-Z]{3})\)$/);
  if (!match)
    return { clubName: normalizeWhitespace(value), clubCountryCode: null };
  return { clubName: match[1], clubCountryCode: match[2] };
}
