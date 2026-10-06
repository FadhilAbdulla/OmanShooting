"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { useStream } from "@/components/use-stream";
import { GroupPicker, locate } from "@/components/group-picker";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/toast";
import { cn, fmtTime } from "@/lib/utils";
import type { PickerData } from "@/lib/picker";

type Booking = {
  id: string; status: string; attendance: "UNKNOWN" | "PRESENT" | "ABSENT"; participantNo: number | null; checkedInAt: string | null; hasScore: boolean;
  user: { name: string; civilId: string; memberNo: number; hand: string; photo: string | null; mobile: string };
  order: { id: string; status: string; method: string; total: string; receipt: boolean } | null;
};
type Slot = { id: string; targetNo: number; isLeftHand: boolean; state: string; booking: Booking | null };
type Roster = { group: { id: string; label: string; startsAt: string; competition: string; isFinal: boolean }; slots: Slot[] };
type Scan = { ok: boolean; name?: string; photo?: string | null; targetNo?: number; participantNo?: number | null; group?: string; startsAt?: string; competition?: string; already?: boolean; otherGroup?: boolean; hand?: string; error?: string };

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime); o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
  } catch {}
}

export function CheckIn({ data }: { data: PickerData }) {
  const [groupId, setGroupId] = useState<string | null>(data.defaultGroupId);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [code, setCode] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [assign, setAssign] = useState<{ slot: Slot; replace?: Booking } | null>(null);
  const [camera, setCamera] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const eventId = locate(data, groupId)?.e.id;

  const load = useCallback(async () => {
    if (!groupId) return;
    setRoster(await api<Roster>(`/api/admin/roster?groupId=${groupId}`, { quiet: true }));
  }, [groupId]);
  useEffect(() => {
    load();
    if (groupId) window.history.replaceState(null, "", `?group=${groupId}`);
  }, [groupId, load]);
  useStream(groupId ? [`group:${groupId}`] : [], load, 200);

  // Keep the scan box focused so a handheld scanner "just works"
  useEffect(() => {
    const i = setInterval(() => { if (!assign && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") input.current?.focus(); }, 1500);
    return () => clearInterval(i);
  }, [assign]);

  async function submit(value: string) {
    if (!value.trim()) return;
    setCode("");
    try {
      const r = await api<Scan>("/api/admin/checkin", { body: { code: value, groupId, eventId }, quiet: true });
      setScan({ ...r, ok: true });
      beep(true);
      if (r.otherGroup) toast(`Booked in a different group: ${r.group} at ${fmtTime(r.startsAt!)}`, "info");
      load();
    } catch (e) {
      setScan({ ok: false, error: (e as ApiError).message });
      beep(false);
    }
  }

  async function setAttendance(b: Booking, attendance: Booking["attendance"]) {
    await api(`/api/admin/bookings/${b.id}/attendance`, { body: { attendance } });
    load();
  }

  async function collectCash(b: Booking, slot: Slot) {
    if (!b.order) return;
    await api(`/api/admin/orders/${b.order.id}`, { body: { action: "approve", note: "Collected at check-in" } });
    await api(`/api/admin/bookings/${b.id}/attendance`, { body: { attendance: "PRESENT" } });
    toast(`Cash ${Number(b.order.total).toFixed(3)} OMR collected · ${b.user.name} checked in`);
    // Show the same confirmation as a scan, so the desk can direct the shooter to their target
    setScan({ ok: true, name: b.user.name, photo: b.user.photo, targetNo: slot.targetNo, participantNo: b.participantNo, group: roster?.group.label, startsAt: roster?.group.startsAt, competition: roster?.group.competition });
    beep(true);
    load();
  }

  const booked = roster?.slots.filter((s) => s.booking) ?? [];
  const present = booked.filter((s) => s.booking!.attendance === "PRESENT").length;
  const absent = booked.filter((s) => s.booking!.attendance === "ABSENT").length;
  const unpaid = booked.filter((s) => s.booking!.status === "PENDING_PAYMENT").length;
  const waiting = booked.length - present - absent;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance & check-in</h1>
          <p className="text-sm text-stone-600">Scan the member QR, type a civil ID, or enter <b>#participant</b> number. Tap a target to change its status.</p>
        </div>
      </div>
      <GroupPicker data={data} groupId={groupId} onChange={setGroupId} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Scan box */}
          <Card className="p-4">
            <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="flex gap-2">
              <input ref={input} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan QR or type civil ID / M123 / #12 and press Enter"
                className="h-14 flex-1 rounded-xl border-2 border-sand-300 px-4 text-lg focus:border-brand-500 focus:outline-none" />
              <Button size="lg" className="h-14">Check in</Button>
              <Button type="button" size="lg" variant="secondary" className="h-14" onClick={() => setCamera((x) => !x)} title="Use device camera">📷</Button>
            </form>
            {camera && <CameraScanner onCode={(c) => { setCamera(false); submit(c); }} />}
          </Card>

          {/* Counters + bulk */}
          {roster && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">✓ Present {present}</span>
              <span className="rounded-full bg-sand-200 px-3 py-1 font-medium">Waiting {waiting}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-800">Absent {absent}</span>
              {unpaid > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Unpaid {unpaid}</span>}
              <span className="text-stone-500">of {booked.length} booked · {roster.slots.length} targets</span>
              <div className="ms-auto flex gap-2">
                <a className="text-sm text-brand-600 hover:underline" href={`/admin/scoring?group=${groupId}`}>Go to scoring →</a>
                {waiting > 0 && (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    if (!confirm(`Mark ${waiting} shooter(s) who have not checked in as absent? Their targets can then be given to replacements.`)) return;
                    const r = await api<{ count: number }>("/api/admin/bulk-absent", { body: { groupId } });
                    toast(`${r.count} marked absent`); load();
                  }}>Mark remaining absent</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => window.open(`/print/group/${groupId}`, "_blank")}>🖨 Target cards</Button>
              </div>
            </div>
          )}

          {/* Target grid */}
          {roster && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {roster.slots.map((s) => {
                const b = s.booking;
                return (
                  <Card key={s.id} className={cn("p-3", b?.attendance === "PRESENT" && "border-emerald-400 bg-emerald-50", b?.attendance === "ABSENT" && "border-rose-300 bg-rose-50", b?.status === "PENDING_PAYMENT" && "border-amber-300 bg-amber-50")}>
                    <div className="flex items-start gap-2">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold tabular", s.isLeftHand ? "bg-sky-500 text-white" : "bg-stone-800 text-white")}>{s.targetNo}</div>
                      <div className="min-w-0 flex-1">
                        {b ? (
                          <>
                            <div className="line-clamp-2 break-words font-medium leading-tight" title={b.user.name}>{b.user.name}</div>
                            <div className="text-xs text-stone-500">{b.participantNo ? `#${b.participantNo} · ` : ""}{b.user.civilId}{b.user.hand === "LEFT" ? " · L" : ""}</div>
                          </>
                        ) : s.state === "BLOCKED" ? <div className="text-sm text-stone-400">Blocked</div> : s.state === "HELD" || s.state === "PENDING" ? <div className="text-sm text-amber-700">Being booked…</div> : <div className="text-sm text-stone-400">Empty</div>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b && b.status === "PENDING_PAYMENT" && (
                        <Button size="sm" variant="primary" className="w-full" onClick={() => collectCash(b, s)}>Collect {Number(b.order?.total ?? 0).toFixed(3)} & check in</Button>
                      )}
                      {b && b.status === "CONFIRMED" && (
                        <>
                          <Button size="sm" variant={b.attendance === "PRESENT" ? "success" : "secondary"} className="flex-1" onClick={() => setAttendance(b, b.attendance === "PRESENT" ? "UNKNOWN" : "PRESENT")}>{b.attendance === "PRESENT" ? "✓ Present" : "Present"}</Button>
                          {!b.hasScore && <Button size="sm" variant={b.attendance === "ABSENT" ? "danger" : "ghost"} onClick={() => setAttendance(b, b.attendance === "ABSENT" ? "UNKNOWN" : "ABSENT")}>Absent</Button>}
                          {b.attendance === "ABSENT" && !b.hasScore && <Button size="sm" variant="ghost" className="text-brand-600" onClick={() => setAssign({ slot: s, replace: b })}>Replace</Button>}
                        </>
                      )}
                      {!b && (s.state === "FREE") && <Button size="sm" variant="ghost" className="w-full text-brand-600" onClick={() => setAssign({ slot: s })}>+ Walk-in</Button>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Last scan result */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className={cn("p-5 text-center", scan?.ok === true && (scan.otherGroup ? "border-amber-400" : "border-emerald-400"), scan?.ok === false && "border-rose-400")}>
            {!scan && <p className="py-10 text-sm text-stone-500">Last check-in appears here</p>}
            {scan?.ok === false && (<><div className="text-5xl">✕</div><p className="mt-2 font-medium text-rose-700">{scan.error}</p></>)}
            {scan?.ok && (
              <>
                {scan.photo ? <img src={scan.photo} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" /> : <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>}
                <div className="mt-2 text-xl font-bold">{scan.name}</div>
                <div className="text-sm text-stone-600">{scan.competition}</div>
                <div className="mt-3 text-xs uppercase tracking-wide text-stone-500">Target</div>
                <div className="text-7xl font-black tabular text-brand-600">{scan.targetNo}</div>
                <div className="text-sm">{scan.group} · {scan.startsAt && fmtTime(scan.startsAt)}{scan.participantNo ? ` · #${scan.participantNo}` : ""}</div>
                {scan.already && <div className="mt-2 text-xs text-amber-700">Already checked in</div>}
                {scan.otherGroup && <div className="mt-2 rounded bg-amber-100 p-2 text-sm font-medium text-amber-900">Not this group — send to {scan.group}</div>}
              </>
            )}
          </Card>
        </div>
      </div>

      {assign && <AssignDialog slot={assign.slot} replace={assign.replace} onClose={() => { setAssign(null); load(); }} />}
    </div>
  );
}

function AssignDialog({ slot, replace, onClose }: { slot: Slot; replace?: Booking; onClose: () => void }) {
  const [civilId, setCivilId] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{replace ? `Replace ${replace.user.name}` : "Walk-in registration"} · target {slot.targetNo}</h3>
        <p className="text-sm text-stone-600">Enter the member&apos;s civil ID. Eligibility is checked; the entry fee is recorded as cash collected and the shooter is checked in.</p>
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await api(`/api/admin/slots/${slot.id}/assign`, { body: { civilId, replaceBookingId: replace?.id } }); toast("Assigned and checked in"); onClose(); } catch { setBusy(false); }
        }} className="space-y-3">
          <input autoFocus className="h-12 w-full rounded-lg border border-sand-300 px-3 text-lg" inputMode="numeric" value={civilId} onChange={(e) => setCivilId(e.target.value)} placeholder="Civil ID" />
          <div className="flex gap-2"><Button className="flex-1" disabled={busy || civilId.length < 4}>Assign</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
        </form>
      </Card>
    </div>
  );
}

/** Uses the browser BarcodeDetector API (Chrome / Android / Edge). Handheld USB scanners work through the text box everywhere. */
function CameraScanner({ onCode }: { onCode: (c: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let stopped = false;
    const BD = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) { setErr("Camera scanning isn't supported in this browser — use a handheld scanner or type the code."); return; }
    const detector = new BD({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      stream = s; if (!video.current) return;
      video.current.srcObject = s; video.current.play();
      const tick = async () => {
        if (stopped || !video.current) return;
        try { const r = await detector.detect(video.current); if (r[0]) { onCode(r[0].rawValue); return; } } catch {}
        raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => setErr("Camera permission denied"));
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return <div className="mt-3">{err ? <p className="text-sm text-rose-600">{err}</p> : <video ref={video} className="mx-auto max-h-64 rounded-lg" muted playsInline />}</div>;
}
