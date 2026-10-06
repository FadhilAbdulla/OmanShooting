import { ageOn } from "./utils";

type U = { gender: "MALE" | "FEMALE"; dob: Date | null; hand: "LEFT" | "RIGHT" };
type C = { genderRule: "MALE" | "FEMALE" | "ANY"; minAge: number | null; maxAge: number | null };

/** BOOK-07: eligibility by gender and age (on the event start date). */
export function checkEligibility(u: U, c: C, on: Date): { ok: boolean; reason?: string } {
  if (c.genderRule !== "ANY" && c.genderRule !== u.gender) {
    return { ok: false, reason: c.genderRule === "MALE" ? "This competition is for men" : "This competition is for women" };
  }
  if (c.minAge != null || c.maxAge != null) {
    const age = ageOn(u.dob, on);
    if (age == null) return { ok: false, reason: "Add your date of birth to your profile to join age-restricted competitions" };
    if (c.minAge != null && age < c.minAge) return { ok: false, reason: `Minimum age is ${c.minAge}` };
    if (c.maxAge != null && age > c.maxAge) return { ok: false, reason: `Maximum age is ${c.maxAge}` };
  }
  return { ok: true };
}

export function ageLabel(c: C) {
  if (c.minAge != null && c.maxAge != null) return `${c.minAge}–${c.maxAge} yrs`;
  if (c.minAge != null) return `${c.minAge}+ yrs`;
  if (c.maxAge != null) return `Under ${c.maxAge + 1}`;
  return "All ages";
}
