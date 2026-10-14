"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { useStream } from "@/components/use-stream";
import { Countdown } from "@/components/countdown";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/toast";
import { cn, fmtDate, fmtTime } from "@/lib/utils";

type G = { id: string; label: string; date: string; startsAt: string; endsAt: string };
type S = { id: string; targetNo: number; isLeftHand: boolean; state: string; mine: boolean; holdExpiresAt: string | null };
type CartItem = { slotId: string; targetNo: number; groupLabel: string; startsAt: string; holdExpiresAt: string; price: string; competition: string };

export function BookingBoard(props: {
  competitionId: string; groups: G[]; enforceHand: boolean; userHand: "LEFT" | "RIGHT"; venue: string; locale: string;
  labels: { free: string; held: string; booked: string; left: string; mine: string; remaining: string };
  moving?: { id: string; targetNo: number; groupId: string; label: string; startsAt: string } | null;
}) {
  const { groups, labels, locale, moving } = props;
  const router = useRouter();
  const dates = useMemo(() => [...new Set(groups.map((g) => g.date))], [groups]);
  const [free, setFree] = useState<Record<string, number>>({});
  const [date, setDate] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [slots, setSlots] = useState<S[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cart, setCart] = useState<{ items: CartItem[]; total: string }>({ items: [], total: "0" });
  const [jitter] = useState(() => 150 + Math.floor(Math.random() * 250)); // spreads refetches from many viewers
  // While the sticky cart bar is showing, reserve space under the page so it never covers the footer
  const cartBarVisible = !moving && cart.items.length > 0;
  useEffect(() => {
    document.body.style.paddingBottom = cartBarVisible ? "84px" : "";
    return () => { document.body.style.paddingBottom = ""; };
  }, [cartBarVisible]);

  const loadFree = useCallback(async () => {
    const r = await api<{ free: Record<string, number> }>(`/api/competitions/${props.competitionId}/availability`, { quiet: true });
    setFree(r.free);
    return r.free;
  }, [props.competitionId]);
  const loadBoard = useCallback(async (id: string) => setSlots((await api<{ slots: S[] }>(`/api/groups/${id}/board`, { quiet: true })).slots), []);
  const loadCart = useCallback(async () => {
    setCart(await api(`/api/cart`, { quiet: true }));
    router.refresh(); // keeps the header cart badge in sync
  }, [router]);

  // Automation: jump straight to the first date & group that still has places
  useEffect(() => {
    loadCart();
    loadFree().then((f) => {
      const g = (moving && groups.find((x) => x.id === moving.groupId)) || groups.find((x) => (f[x.id] ?? 0) > 0) || groups[0];
      if (g) { setDate(g.date); setGroupId(g.id); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (groupId) loadBoard(groupId); }, [groupId, loadBoard]);

  const dayGroups = groups.filter((g) => g.date === date);
  // Debouncing coalesces messages from different groups, so refresh both views on any change
  useStream(dayGroups.map((g) => `group:${g.id}`), () => {
    loadFree();
    if (groupId) loadBoard(groupId);
  }, jitter);

  async function moveTo(s: S) {
    if (!moving || busy) return;
    const g = groups.find((x) => x.id === groupId);
    if (!confirm(`Move your booking from target ${moving.targetNo} (${moving.label}, ${fmtTime(moving.startsAt, locale)}) to target ${s.targetNo} (${g?.label}, ${g ? fmtTime(g.startsAt, locale) : ""})?`)) return;
    setBusy(s.id);
    try {
      await api(`/api/bookings/${moving.id}/move`, { body: { slotId: s.id } });
      window.location.href = "/me?moved=1";
    } catch {
      setBusy(null);
      if (groupId) loadBoard(groupId);
    }
  }

  async function toggle(s: S) {
    if (busy) return;
    if (moving) { if (s.state === "FREE") moveTo(s); return; }
    if (s.mine && s.state === "HELD") {
      setBusy(s.id);
      setSlots((x) => x.map((y) => (y.id === s.id ? { ...y, state: "FREE", mine: false } : y)));
      await api(`/api/slots/${s.id}/hold`, { method: "DELETE" }).catch(() => {});
      setBusy(null);
      loadCart();
      return;
    }
    if (s.state !== "FREE") return;
    setBusy(s.id);
    // Optimistic: show it as yours (and release any other hold in this group) immediately
    setSlots((x) => x.map((y) => (y.id === s.id ? { ...y, state: "HELD", mine: true } : y.mine && y.state === "HELD" ? { ...y, state: "FREE", mine: false } : y)));
    try {
      await api(`/api/slots/${s.id}/hold`, { method: "POST", quiet: true });
      toast(`Target ${s.targetNo} held for you — complete payment within the timer`, "ok");
    } catch (e) {
      const err = e as ApiError;
      toast(err.message, "err");
      if (groupId) loadBoard(groupId);
    } finally {
      setBusy(null);
      loadCart();
    }
  }

  const handBlocked = (s: S) => props.enforceHand && s.isLeftHand !== (props.userHand === "LEFT");
  const earliest = cart.items.reduce<string | null>((a, i) => (!a || i.holdExpiresAt < a ? i.holdExpiresAt : a), null);
  const cur = groups.find((g) => g.id === groupId);

  if (!groups.length) return <Card className="p-6 text-center text-stone-600">No upcoming groups are scheduled for this competition yet.</Card>;

  return (
    <div className="space-y-4 pb-28">
      {moving && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <div className="flex-1"><b>Changing your booking</b> — currently target <b>{moving.targetNo}</b>, group {moving.label} at {fmtTime(moving.startsAt, locale)} on {fmtDate(moving.startsAt, locale)}. Tap a free target to move there; your payment carries over.</div>
          <Link href="/me" className="font-medium underline">Keep current booking</Link>
        </div>
      )}
      {/* Dates */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((d) => {
          const left = groups.filter((g) => g.date === d).reduce((a, g) => a + (free[g.id] ?? 0), 0);
          return (
            <button key={d} onClick={() => { setDate(d); const g = groups.find((x) => x.date === d && (free[x.id] ?? 0) > 0) ?? groups.find((x) => x.date === d); setGroupId(g?.id ?? null); }}
              className={cn("shrink-0 rounded-lg border px-4 py-2 text-start", d === date ? "border-brand-500 bg-brand-50" : "border-sand-200 bg-white hover:bg-sand-100")}>
              <div className="text-sm font-medium">{fmtDate(d + "T08:00:00Z", locale)}</div>
              <div className={cn("text-xs tabular", left ? "text-oasis-600" : "text-rose-600")}>{left} {labels.remaining}</div>
            </button>
          );
        })}
      </div>

      {/* Groups */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {dayGroups.map((g) => {
          const left = free[g.id] ?? 0;
          return (
            <button key={g.id} onClick={() => setGroupId(g.id)} disabled={!left && g.id !== groupId}
              className={cn("rounded-lg border p-3 text-start transition disabled:opacity-40", g.id === groupId ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-sand-200 bg-white hover:bg-sand-100")}>
              <div className="flex items-center justify-between"><span className="font-semibold">{g.label}</span><span className="text-xs text-stone-500">{props.venue}</span></div>
              <div className="text-sm tabular">{fmtTime(g.startsAt, locale)}–{fmtTime(g.endsAt, locale)}</div>
              <div className={cn("text-xs tabular", left ? "text-oasis-600" : "text-rose-600")}>{left ? `${left} ${labels.remaining}` : "Full"}</div>
            </button>
          );
        })}
      </div>

      {/* Board */}
      {cur && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-sm me-2">{cur.label} · {fmtTime(cur.startsAt, locale)}</span>
            <Legend cls="bg-white border-oasis-500" label={labels.free} />
            <Legend cls="bg-brand-500 border-brand-500" label={labels.mine} />
            <Legend cls="bg-oasis-500 border-oasis-600" label="Your booking" />
            <Legend cls="bg-amber-200 border-amber-300" label={labels.held} />
            <Legend cls="bg-stone-300 border-stone-300" label={labels.booked} />
            <Legend cls="bg-sky-100 border-sky-400" label={`${labels.left} (L)`} />
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
            {slots.map((s) => {
              const blockedHand = handBlocked(s);
              const isMine = s.mine;
              const taken = !isMine && s.state !== "FREE";
              return (
                <button key={s.id} onClick={() => toggle(s)} disabled={busy === s.id || taken || (blockedHand && !isMine)}
                  title={blockedHand ? (s.isLeftHand ? "Reserved for left-handed shooters" : "Left-handed shooters use L targets") : undefined}
                  className={cn(
                    "relative aspect-square rounded-lg border-2 text-lg font-bold tabular transition",
                    isMine ? (s.state === "HELD" ? "border-brand-500 bg-brand-500 text-white" : "border-oasis-600 bg-oasis-500 text-white")
                      : s.state === "HELD" || s.state === "PENDING" ? "border-amber-300 bg-amber-200 text-amber-900"
                      : s.state === "BOOKED" ? "border-stone-300 bg-stone-300 text-stone-500"
                      : s.state === "BLOCKED" ? "border-stone-200 bg-stone-100 text-stone-300 line-through"
                      : blockedHand ? "border-dashed border-stone-200 bg-stone-50 text-stone-300"
                      : s.isLeftHand ? "border-sky-400 bg-sky-50 text-sky-900 hover:bg-sky-100" : "border-oasis-500 bg-white text-oasis-600 hover:bg-emerald-50",
                    busy === s.id && "animate-pulse",
                  )}>
                  {s.targetNo}
                  {s.isLeftHand && <span className="absolute end-1 top-0.5 text-[10px] font-semibold">L</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-stone-500">{moving ? "Tap a free target to move your booking there." : "Tap a target to hold it. Tap another target in the same group to switch. Holds are released automatically if not paid in time."}</p>
        </Card>
      )}

      {/* Sticky cart */}
      {cartBarVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 backdrop-blur no-print">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">{cart.items.length} target(s) · {Number(cart.total).toFixed(3)} OMR</div>
              <div className="truncate text-xs text-stone-500">{cart.items.map((i) => `${i.groupLabel} #${i.targetNo}`).join(", ")}</div>
            </div>
            {earliest && <div className="text-sm">⏱ <Countdown to={earliest} onExpire={() => { loadCart(); if (groupId) loadBoard(groupId); }} /></div>}
            <Link href="/cart"><Button size="lg">Checkout</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded border-2", cls)} />{label}</span>;
}
