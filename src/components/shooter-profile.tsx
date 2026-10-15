import Link from "next/link";
import { MemberCard } from "./member-card";
import { Badge, Card } from "./ui";
import { ageOn, cn, fmtDate } from "@/lib/utils";
import type { shooterProfile } from "@/lib/profile";

type P = NonNullable<Awaited<ReturnType<typeof shooterProfile>>>;

const TIER = { gold: "bg-amber-50 ring-amber-300", silver: "bg-stone-50 ring-stone-300", bronze: "bg-orange-50 ring-orange-300", badge: "bg-white ring-sand-200" };

/** MEM-08 digital profile: personal data, photo, history, achievements, certificates. */
export function ShooterProfile({ p, staffView = false }: { p: P; staffView?: boolean }) {
  const { user: u, stats } = p;
  const age = ageOn(u.dob, new Date());
  const seasons = [...new Set(p.history.map((h) => h.season))].sort((a, b) => b - a);
  const personal: [string, string][] = [
    ["Full name", u.fullName],
    ["Member no.", `M${u.memberNo}`],
    ["Civil ID", staffView ? u.civilId : `••••${u.civilId.slice(-4)}`],
    ["Date of birth", u.dob ? `${fmtDate(u.dob)}${age != null ? ` (${age})` : ""}` : "—"],
    ["Gender", u.gender === "MALE" ? "Male" : "Female"],
    ["Dominant hand", u.hand === "LEFT" ? "Left" : "Right"],
    ["Governorate", [u.governorate, u.wilayat].filter(Boolean).join(" · ") || "—"],
    ["Tribe", u.tribe || "—"],
    ["Mobile", staffView ? u.mobile : `••••${u.mobile.slice(-4)}`],
    ["ID card", u.idScanned ? "Verified ✓" : "Not verified"],
    ["Member since", fmtDate(u.createdAt)],
  ];

  return (
    <div className="space-y-6">
      {/* Identity header */}
      <div className="heritage-bg flex flex-col gap-5 rounded-2xl p-5 text-white sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/30 bg-white/10 text-3xl font-bold">
          {u.photo ? <img src={u.photo} alt={u.fullName} className="h-full w-full object-cover" /> : u.fullName.split(" ").map((x) => x[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-sand-300">Shooter profile · M{u.memberNo}</div>
          <h1 className="text-2xl font-bold">{u.fullName}</h1>
          <div className="text-sm text-sand-200">{u.governorate}{u.hand === "LEFT" ? " · Left-handed" : ""} · Member since {u.createdAt.getFullYear()}</div>
          {p.achievements.filter((a) => a.tier !== "badge").length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">{p.achievements.filter((a) => a.tier !== "badge").map((a) => <span key={a.key} title={a.title} className="text-xl">{a.icon}</span>)}</div>
          )}
        </div>
      </div>

      {/* Career stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Championships", stats.championships],
          ["Competitions", stats.competitions],
          ["Best score", stats.best != null ? `${stats.best}/${stats.bestOf}` : "—"],
          ["Average", stats.avg != null ? stats.avg.toFixed(1) : "—"],
          ["Finals", stats.finals],
          ["Podiums", stats.podiums],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4"><div className="text-xs uppercase tracking-wide text-stone-500">{l}</div><div className="mt-1 text-2xl font-bold tabular">{v}</div></Card>
        ))}
      </div>

      {/* min-w-0 on both columns: grid items otherwise grow to fit truncated text and overflow on phones */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Achievements */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Achievements</h2>
            {!p.achievements.length ? <p className="text-sm text-stone-500">Achievements appear here after your first scored competition.</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {p.achievements.map((a) => (
                  <div key={a.key} className={cn("flex items-start gap-3 rounded-xl p-3 ring-1", TIER[a.tier])}>
                    <span className="text-2xl leading-none">{a.icon}</span>
                    <div className="min-w-0"><div className="font-medium leading-snug">{a.title}</div><div className="text-xs text-stone-500">{a.detail}{a.date ? ` · ${fmtDate(a.date)}` : ""}</div></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Participation history */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Participation history</h2>
            {!p.history.length ? <p className="text-sm text-stone-500">No participation yet.</p> : seasons.map((season) => (
              <div key={season} className="mb-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-500">Season {season}</div>
                <Card className="divide-y divide-sand-100">
                  {p.history.filter((h) => h.season === season).map((h) => (
                    <div key={h.bookingId} className="flex flex-wrap items-center gap-3 p-3">
                      <div className={cn("flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white", h.rank === 1 ? "bg-amber-500" : h.rank === 2 ? "bg-stone-400" : h.rank === 3 ? "bg-orange-400" : "bg-stone-700")}>
                        <span className="text-[9px] uppercase leading-none">{h.rank ? "rank" : "T"}</span>
                        <span className="text-base font-bold leading-tight">{h.rank ?? h.targetNo}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{h.competition} {h.isFinal && <Badge className="ms-1 bg-brand-500 text-white">FINAL</Badge>}</div>
                        <div className="text-xs text-stone-500">{h.eventName} · {fmtDate(h.date)} · {h.group}{h.rank && h.field ? ` · ${h.rank} of ${h.field}` : ""}{h.total != null && !h.official ? " · provisional" : ""}</div>
                      </div>
                      <div className="text-end">
                        {h.total != null ? (
                          <><div className="text-lg font-bold tabular">{h.total}<span className="text-xs font-normal text-stone-400">/{h.maxScore}</span></div>{h.series.length > 1 && <div className="text-[11px] text-stone-500 tabular">{h.series.join(" · ")}</div>}</>
                        ) : h.date.getTime() > Date.now() ? <Badge className="bg-sky-100 text-sky-800">Upcoming</Badge>
                          : <span className="text-xs text-stone-400">{h.attendance === "ABSENT" ? "Absent" : "No score"}</span>}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <MemberCard user={u} />
          {/* Personal data */}
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Personal data</h2>
            <dl className="divide-y divide-sand-100 text-sm">
              {personal.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="text-stone-500">{k}</dt><dd className="text-end font-medium">{v}</dd></div>)}
            </dl>
            {!staffView && <Link href="/me" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">Edit profile & photo →</Link>}
          </Card>
          {/* Certificates */}
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Certificates</h2>
            {!p.certificates.length ? <p className="text-sm text-stone-500">A certificate is issued for every scored competition.</p> : (
              <ul className="space-y-2">
                {p.certificates.map((c) => (
                  <li key={c.id}>
                    <a href={`/certificates/${c.id}`} target="_blank" className="flex items-center gap-3 rounded-lg border border-sand-200 p-2.5 hover:border-brand-300">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg", c.kind === "achievement" ? "bg-amber-100" : "bg-sand-100")}>{c.kind === "achievement" ? "🏆" : "📜"}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.title}</span><span className="block truncate text-xs text-stone-500">{c.competition} · {fmtDate(c.date)}</span></span>
                      <span className="text-xs text-brand-600">View ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
