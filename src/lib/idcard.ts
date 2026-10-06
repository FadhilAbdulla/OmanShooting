"use client";
/**
 * ID-card reading for onboarding (MEM-02/03/04). Runs entirely in the browser with tesseract.js:
 * card images never leave the shooter's device in this MVP — only the confirmed fields are submitted.
 */
import { GOVERNORATES } from "./oman";

export type CardFields = {
  civilId: string | null;
  name: string | null;
  dob: string | null; // YYYY-MM-DD
  expiry: string | null; // YYYY-MM-DD
  governorate: string | null;
  wilayat: string | null;
};

export type CardResult = CardFields & {
  looksLikeCard: boolean;
  civilMatches: boolean;
  expired: boolean;
  rawText: string;
};

const LABELS = /SULTANATE|OMAN|IDENTITY|CARD|CIVIL|SAMPLE|DEMO|ONLY|NAME|DATE|BIRTH|EXPIRY|EXPIRES|GOVERNORATE|WILAYAT|NUMBER|SEX|NATIONALITY|ISSUE|RESIDENT/;

export async function readCard(images: (File | Blob)[], onProgress?: (p: number, label: string) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  onProgress?.(0.05, "Loading text recognition…");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(0.3 + m.progress * 0.65, "Reading your card…");
      else if (m.progress) onProgress?.(0.05 + m.progress * 0.25, "Loading text recognition…");
    },
  });
  try {
    let text = "";
    for (const img of images) {
      const { data } = await worker.recognize(img);
      text += "\n" + data.text;
    }
    onProgress?.(1, "Done");
    return text;
  } finally {
    await worker.terminate();
  }
}

function toIso(d: string, m: string, y: string) {
  const dd = Number(d), mm = Number(m), yy = Number(y);
  if (!dd || !mm || mm > 12 || dd > 31 || yy < 1900 || yy > 2100) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bAl ([a-z])/gi, (_, c) => `Al-${c.toUpperCase()}`);

export function parseCard(rawText: string, expectedCivilId: string): CardResult {
  const text = rawText.replace(/[|]/g, " ");
  const upper = text.toUpperCase();

  // Civil number: prefer the one that matches the verified civil ID; tolerate OCR spacing
  const digits = [...text.replace(/(\d)\s(?=\d)/g, "$1").matchAll(/\b\d{6,12}\b/g)].map((m) => m[0]);
  const civilId = digits.find((d) => d === expectedCivilId) ?? digits.find((d) => d.length >= 7 && d.length <= 9) ?? null;

  // Dates: earliest = date of birth, latest = expiry
  const dates = [...text.matchAll(/(\d{2})\s?[\/\-.]\s?(\d{2})\s?[\/\-.]\s?(\d{4})/g)]
    .map((m) => toIso(m[1], m[2], m[3]))
    .filter((d): d is string => !!d)
    .sort();
  const dob = dates.length ? dates[0] : null;
  const expiry = dates.length > 1 ? dates[dates.length - 1] : null;

  // Name: an explicit "Name:" label, otherwise the longest all-caps line that isn't a label
  let name: string | null = null;
  const labelled = text.match(/NAME\s*[:\-]?\s*([A-Za-z][A-Za-z '\-]{4,})/i);
  if (labelled && !LABELS.test(labelled[1].toUpperCase().trim())) name = labelled[1].trim();
  if (!name) {
    const lines = upper.split("\n").map((l) => l.replace(/[^A-Z '\-]/g, "").trim()).filter((l) => l.split(" ").length >= 2 && l.length >= 8 && !LABELS.test(l));
    name = lines.sort((a, b) => b.length - a.length)[0] ?? null;
  }
  if (name) name = titleCase(name.replace(/\s+/g, " ").trim());

  const governorate = GOVERNORATES.find((g) => upper.includes(g.toUpperCase())) ?? null;
  const wilayatMatch = text.match(/WILAYAT\s*[:\-]?\s*([A-Za-z][A-Za-z '\-]{2,})/i);
  const wilayat = wilayatMatch ? titleCase(wilayatMatch[1].trim()) : null;

  // MEM-03: reject photos that don't look like an ID card (no number and no dates readable)
  const looksLikeCard = text.replace(/\s/g, "").length > 25 && (!!civilId || dates.length >= 1);
  const today = new Date().toISOString().slice(0, 10);

  return {
    civilId, name, dob, expiry, governorate, wilayat,
    looksLikeCard,
    civilMatches: civilId === expectedCivilId,
    expired: !!expiry && expiry < today,
    rawText,
  };
}

/**
 * Demo helper: draws a clearly-watermarked SAMPLE card (front + back) for the verified civil ID so the
 * scanning step can be shown without a real identity document. It is deliberately generic — not a
 * replica of any official card design.
 */
export async function sampleCard(civilId: string): Promise<[Blob, Blob]> {
  const draw = (side: "front" | "back") => {
    const c = document.createElement("canvas");
    c.width = 1012; c.height = 638;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f7f4ee"; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "#9a8a6a"; x.lineWidth = 6; x.strokeRect(12, 12, c.width - 24, c.height - 24);
    x.fillStyle = "#111";
    x.font = "bold 34px Arial"; x.fillText(side === "front" ? "SAMPLE IDENTITY CARD" : "SAMPLE IDENTITY CARD - BACK", 48, 80);
    x.font = "22px Arial"; x.fillStyle = "#b91c1c"; x.fillText("FOR DEMO ONLY - NOT A REAL DOCUMENT", 48, 116);
    x.fillStyle = "#111"; x.font = "30px Arial";
    const rows = side === "front"
      ? [["Civil No.", civilId], ["Name", "SALIM HAMAD AL HARTHY"], ["Date of Birth", "14/03/1991"], ["Expiry Date", "20/11/2029"]]
      : [["Governorate", "Ad Dakhiliyah"], ["Wilayat", "Nizwa"], ["Card No.", civilId]];
    rows.forEach(([k, v], i) => { x.fillText(`${k}: ${v}`, side === "front" ? 300 : 48, 200 + i * 70); });
    if (side === "front") { x.fillStyle = "#d6cbb5"; x.fillRect(48, 170, 210, 260); x.fillStyle = "#7a6a4a"; x.font = "20px Arial"; x.fillText("PHOTO", 118, 305); }
    else { for (let i = 0; i < 60; i++) { x.fillStyle = i % 3 ? "#222" : "#f7f4ee"; x.fillRect(48 + i * 14, 470, (i % 4) + 4, 90); } }
    // Light diagonal watermark (kept faint so it doesn't disturb recognition)
    x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(-0.35); x.globalAlpha = 0.07; x.fillStyle = "#b91c1c"; x.font = "bold 120px Arial"; x.textAlign = "center"; x.fillText("SAMPLE", 0, 40); x.restore();
    return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
  };
  return Promise.all([draw("front"), draw("back")]);
}
