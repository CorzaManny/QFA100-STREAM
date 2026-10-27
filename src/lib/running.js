// How the relay is actually running, worked out the same way the EFB does it
// (its js/running.js), so a delay on air matches the one on the flight deck.
//
// The published schedule is never changed: std stays what WorldFlight
// published and everything here is an estimate laid over the top.

const MINUTE = 60_000;
const ms = (t) => (t ? new Date(t).getTime() : null);
const byStd = (a, b) => ms(a.std) - ms(b.std);

// Estimates are shown to the nearest five minutes; stamped times are exact.
export const round5 = (t) => Math.round(t / (5 * MINUTE)) * 5 * MINUTE;

// Is the live aeroplane talking about this sector, recently enough to believe?
function liveArrival(sector, track, now, taxiInMinutes) {
  if (!track?.online || !track.eta) return null;
  if (track.dep && track.arr && (track.dep !== sector.dep || track.arr !== sector.arr)) return null;
  if (track.at && now - track.at > 5 * MINUTE) return null;
  // The feed estimates the airport; the schedule counts on-blocks.
  return track.eta + taxiInMinutes * MINUTE;
}

// Every sector with what we know and what we think, in schedule order:
//
//   off, on       what the flight deck stamped, or null
//   estOff, estOn when it really gets away and lands, as far as anyone knows
//   delay         estOff - std, so negative means early
//   basis         'actual' | 'live' | 'plan'
//   state         'done' | 'airborne' | 'next' | 'later' | 'skipped'
//
// A sector is not expected away before its planned time and cannot leave
// until the aeroplane is back and turned round, so slack in the schedule
// absorbs a delay instead of passing the whole of it on.
export function runningTimes({ sectors, actuals, track, turnaroundMinutes = 45, taxiInMinutes = 5, now = Date.now() }) {
  const out = new Map();
  let prevOn = null;
  let seenAirborne = false;

  for (const s of [...sectors].sort(byStd)) {
    const a = actuals?.[s.id] ?? {};
    const std = ms(s.std);
    const block = ms(s.sta) - std;
    const off = ms(a.off_blocks);
    const on = ms(a.on_blocks);

    if (a.skipped) {
      out.set(s.id, { sector: s, off, on, estOff: std, estOn: ms(s.sta), delay: 0, basis: "actual", state: "skipped" });
      continue;
    }

    const ready = prevOn == null ? std : prevOn + turnaroundMinutes * MINUTE;
    const estOff = off ?? Math.max(std, ready);
    const live = on ? null : liveArrival(s, track, now, taxiInMinutes);
    const estOn = on ?? live ?? estOff + block;

    const state = on
      ? "done"
      : off || (live && !seenAirborne)
        ? "airborne"
        : seenAirborne || estOff > now
          ? "next"
          : "later";
    if (state === "airborne") seenAirborne = true;

    out.set(s.id, {
      sector: s,
      off,
      on,
      estOff,
      estOn,
      delay: estOff - std,
      basis: off || on ? "actual" : live ? "live" : "plan",
      state,
    });
    prevOn = estOn;
  }
  return out;
}

// Under this, a delay is not worth putting on screen.
const WORTH_SAYING = 10 * MINUTE;

export function running({ sectors, actuals, track, turnaroundMinutes, taxiInMinutes, now = Date.now() }) {
  const times = runningTimes({ sectors, actuals, track, turnaroundMinutes, taxiInMinutes, now });
  const rows = [...times.values()];

  // The delay that matters is the next sector still to leave.
  const ahead = rows.filter((r) => r.state !== "skipped" && r.estOff >= now - 60 * MINUTE && !r.on);
  const next = ahead.find((r) => r.state === "airborne") || ahead[0] || null;

  // Say nothing unless a time was stamped recently or the aeroplane is being
  // tracked; otherwise the published schedule is all we have and an estimate
  // would only be the plan wearing a different colour.
  const fresh = rows.some((r) => (r.off || r.on) && now - (r.on || r.off) < 12 * 60 * MINUTE);
  const trusted = fresh || Boolean(track?.online && track?.eta);

  return {
    times,
    next,
    airborne: rows.find((r) => r.state === "airborne") ?? null,
    trusted,
    delay: next ? next.delay : 0,
    late: trusted && next && Math.abs(next.delay) >= WORTH_SAYING ? next : null,
  };
}

// "ON SCHEDULE" / "25 MIN BEHIND" / "10 MIN AHEAD", or null when there is
// nothing trustworthy to say.
export function scheduleLabel(run) {
  if (!run?.trusted) return null;
  if (!run.late) return { text: "ON SCHEDULE", tone: "good" };
  const mins = Math.round(Math.abs(run.late.delay) / MINUTE);
  const h = Math.floor(mins / 60);
  const span = h ? `${h}H ${String(mins % 60).padStart(2, "0")}M` : `${mins} MIN`;
  return run.late.delay > 0 ? { text: `${span} BEHIND`, tone: "bad" } : { text: `${span} AHEAD`, tone: "good" };
}
