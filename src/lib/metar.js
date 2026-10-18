import { useEffect, useState } from "react";

// VATSIM's METAR service - the same source the dashboard uses, and unlike
// aviationweather.gov it allows browser (CORS) requests.
export function useMetar(icao) {
  const [metar, setMetar] = useState(null);

  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setMetar(null);
    const poll = async () => {
      try {
        const res = await fetch(`https://metar.vatsim.net/${encodeURIComponent(icao)}`);
        const text = (await res.text()).trim();
        if (!cancelled) setMetar(text ? parseMetar(text) : null);
      } catch {
        // keep the last good report on a failed refresh
      }
    };
    poll();
    const id = setInterval(poll, 10 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [icao]);

  return metar;
}

const WX_WORDS = {
  TS: "Thunderstorms",
  SH: "Showers",
  RA: "Rain",
  DZ: "Drizzle",
  SN: "Snow",
  FG: "Fog",
  BR: "Mist",
  HZ: "Haze",
  FU: "Smoke",
  DU: "Dust",
  SA: "Sand",
  GR: "Hail",
};

export function parseMetar(raw) {
  const tokens = raw.toUpperCase().split(/\s+/);
  const out = { raw, wind: null, visibility: null, tempC: null, dewC: null, qnh: null, clouds: [], wx: [], cavok: false };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let m;
    if ((m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/.exec(t))) {
      const k = m[4] === "MPS" ? 1.944 : 1;
      out.wind = {
        dir: m[1] === "VRB" ? null : Number(m[1]),
        speed: Math.round(Number(m[2]) * k),
        gust: m[3] ? Math.round(Number(m[3]) * k) : null,
      };
    } else if (t === "CAVOK") {
      out.cavok = true;
      out.visibility = "10+ km";
    } else if (/^\d{4}$/.test(t) && out.visibility == null && out.wind) {
      out.visibility = t === "9999" ? "10+ km" : `${(Number(t) / 1000).toFixed(Number(t) < 5000 ? 1 : 0)} km`;
    } else if ((m = /^P?(\d+)SM$/.exec(t))) {
      const km = Number(m[1]) * 1.609;
      out.visibility = km >= 10 ? "10+ km" : `${km.toFixed(1)} km`;
    } else if ((m = /^(FEW|SCT|BKN|OVC|VV)(\d{3})/.exec(t))) {
      out.clouds.push({ cover: m[1], baseFt: Number(m[2]) * 100 });
    } else if ((m = /^(M?\d{2})\/(M?\d{2})?$/.exec(t))) {
      out.tempC = Number(m[1].replace("M", "-"));
      if (m[2]) out.dewC = Number(m[2].replace("M", "-"));
    } else if ((m = /^Q(\d{4})$/.exec(t))) {
      out.qnh = Number(m[1]);
    } else if ((m = /^A(\d{4})$/.exec(t))) {
      out.qnh = Math.round(Number(m[1]) * 0.338639);
    } else if (/^[-+]?(VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|GR|GS|BR|FG|FU|HZ|DU|SA|SQ|TS)+$/.test(t) && i > 2) {
      out.wx.push(t);
    }
  }
  return out;
}

export function describeWeather(m) {
  if (!m) return "";
  if (m.wx.length) {
    const words = new Set();
    for (const w of m.wx) for (const [code, word] of Object.entries(WX_WORDS)) if (w.includes(code)) words.add(word);
    const intensity = m.wx[0].startsWith("-") ? "Light " : m.wx[0].startsWith("+") ? "Heavy " : "";
    return intensity + [...words].join(", ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }
  return "No significant weather";
}

// clear | partly | cloudy | rain | storm | fog - drives the weather icon.
export function skyCondition(m) {
  if (!m) return "partly";
  const wx = m.wx.join(" ");
  if (wx.includes("TS")) return "storm";
  if (/RA|DZ|SN|SH/.test(wx)) return "rain";
  if (/FG|BR|HZ/.test(wx)) return "fog";
  if (m.clouds.some((c) => c.cover === "OVC" || c.cover === "BKN")) return "cloudy";
  if (m.clouds.some((c) => c.cover === "SCT" || c.cover === "FEW")) return "partly";
  return "clear";
}
