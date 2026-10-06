"use client";
import { toast } from "@/components/toast";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T = Record<string, unknown>>(url: string, init?: { method?: string; body?: unknown; quiet?: boolean }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (!init?.quiet) toast(json.error ?? "Something went wrong", "err");
    throw new ApiError(json.error ?? "Error", res.status, json.code);
  }
  return json as T;
}

export function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
