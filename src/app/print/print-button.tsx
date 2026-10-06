"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="no-print mb-4 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">🖨 Print</button>;
}
