export const GOVERNORATES = [
  "Muscat", "Dhofar", "Musandam", "Al Buraimi", "Ad Dakhiliyah", "North Al Batinah", "South Al Batinah",
  "South Ash Sharqiyah", "North Ash Sharqiyah", "Ad Dhahirah", "Al Wusta",
];

/** Omani mobile numbers: 8 digits starting with 7 or 9, optionally prefixed with +968 / 968 / 00968. */
export function normaliseMobile(raw: string) {
  const d = raw.replace(/[\s-]/g, "").replace(/^(\+|00)?968/, "");
  return /^[79]\d{7}$/.test(d) ? d : null;
}
