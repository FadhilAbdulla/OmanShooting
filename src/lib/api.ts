import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./utils";

export function ok(data: unknown = { ok: true }, status = 200) {
  return NextResponse.json(data, { status });
}

export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), code: "VALIDATION" }, { status: 422 });
      console.error(e);
      return NextResponse.json({ error: "Unexpected error", code: "INTERNAL" }, { status: 500 });
    }
  };
}
