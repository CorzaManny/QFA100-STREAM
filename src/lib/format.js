import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function timeUTC(ms) {
  if (ms == null || Number.isNaN(ms)) return "--:--";
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function dateUTC(ms) {
  if (ms == null) return "";
  return new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function hm(ms) {
  if (ms == null || Number.isNaN(ms)) return "--";
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// "3d 4h", "4h 12m", "12m 05s" - for countdowns that can be days away.
export function countdown(ms) {
  if (ms == null) return "--";
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

// Shrinks a "City → City" headline so long names stay on one line.
export const cityFont = (text, base) => (text.length > 30 ? base * 0.62 : text.length > 22 ? base * 0.78 : base);

export const num = (n) => (n == null ? "--" : Math.round(n).toLocaleString("en-US"));

export function altitude(ft) {
  if (ft == null) return "--";
  return `${num(Math.round(ft / 100) * 100)} ft`;
}

// Fuel and weights off the OFP and the simulator, to the nearest 10 kg.
export function kg(n) {
  if (n == null) return "--";
  return `${num(Math.round(n / 10) * 10)} kg`;
}

export const machText = (m) => (m == null || m < 0.1 ? "" : `M${m.toFixed(2).replace(/^0/, "")}`);

// Climb positive, as the vertical speed indicator reads it.
export function fpm(v) {
  if (v == null) return "--";
  const r = Math.round(v / 50) * 50;
  return `${r > 0 ? "+" : ""}${num(r)} fpm`;
}

// How firm the landing was, from the simulator's touchdown figure.
export function touchdownText(v) {
  if (v == null) return null;
  const rate = Math.abs(Math.round(v));
  const word = rate < 120 ? "Greaser" : rate < 250 ? "Smooth" : rate < 400 ? "Firm" : "Carrier landing";
  return `${word} · ${num(rate)} fpm`;
}
