import { useMetar, describeWeather, skyCondition } from "../lib/metar";
import { aircraftName, dutyShort } from "../lib/aircraft";
import { altitude, countdown, hm, num, timeUTC } from "../lib/format";
import { CardHead, Stat } from "./ui";
import {
  ArrivalIcon,
  ClockIcon,
  CrewIcon,
  PinIcon,
  RouteIcon,
  SkyIcon,
  WeatherHeadIcon,
} from "./Icons";

const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (code) => (code ? names.of(code) ?? code : "");
  } catch {
    return (code) => code ?? "";
  }
})();

// A real aerial photo of the airport, straight from Esri's imagery export.
export function aerialUrl(apt, w, h, spanDeg = 0.045) {
  const aspect = w / h;
  const dLat = spanDeg / 2;
  const dLon = (spanDeg * aspect) / 2 / Math.cos((apt.lat * Math.PI) / 180);
  const bbox = [apt.lon - dLon, apt.lat - dLat, apt.lon + dLon, apt.lat + dLat].join(",");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${w * 2},${h * 2}&format=jpg&f=image`;
}

const windText = (w) =>
  !w ? "--" : `${w.dir == null ? "VRB" : `${String(w.dir).padStart(3, "0")}°`} ${w.speed} kt${w.gust ? ` G${w.gust}` : ""}`;

export function WeatherCard({ icao, style }) {
  const m = useMetar(icao);
  return (
    <div className="panel" style={{ padding: "22px 26px", ...style }}>
      <CardHead icon={<WeatherHeadIcon />}>Weather · {icao}</CardHead>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
        <SkyIcon condition={skyCondition(m)} size={66} />
        <div style={{ flex: "none" }}>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>{m?.tempC != null ? `${m.tempC}°` : "--"}</div>
          <div className="subvalue" style={{ fontSize: 15, marginTop: 6 }}>
            {m?.dewC != null ? `Dew ${m.dewC}°` : ""}
          </div>
        </div>
        <div className="divider-v" style={{ margin: "4px 2px" }} />
        <div style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--soft)", minWidth: 0 }}>
          <div style={{ whiteSpace: "nowrap" }}>Wind {windText(m?.wind)}</div>
          <div style={{ whiteSpace: "nowrap" }}>Visibility {m?.visibility ?? "--"}</div>
          <div>{describeWeather(m) || "--"}</div>
        </div>
      </div>
    </div>
  );
}

export function SectorFactCard({ view, style }) {
  const apt = view.arr;
  if (!apt) return null;
  const country = regionName(apt.country);
  const fact =
    view.notes ||
    `${apt.name} serves ${apt.city}${country ? `, ${country}` : ""}, ${num(apt.elev)} ft above sea level. ` +
      `Today's ${num(view.distanceNm)} nm sector from ${view.dep?.city ?? view.sector.dep} takes around ${hm(view.block)}.`;

  return (
    <div className="panel" style={{ padding: "22px 26px", ...style }}>
      <CardHead icon={<PinIcon />}>Sector fact</CardHead>
      <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
        <img
          src={aerialUrl(apt, 140, 140)}
          alt=""
          style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, flex: "none", border: "1px solid var(--line)" }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {apt.name}
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--soft)",
              marginTop: 8,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {fact}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteCard({ view, style }) {
  const route = view.sector.route || "Route to be filed";
  const ofp = view.ofp;
  return (
    <div className="panel" style={{ padding: "22px 26px", ...style }}>
      <CardHead icon={<RouteIcon />}>Planned route</CardHead>
      <div
        style={{
          marginTop: 16,
          fontSize: 16,
          lineHeight: 1.55,
          color: "var(--soft)",
          fontFamily: "'Cascadia Mono', Consolas, monospace",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {route}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 16 }}>
        <Stat label="Distance" value={`${num(view.distanceNm)} nm`} size={22} />
        <Stat label="Cruise" value={ofp?.cruise ? `FL${Math.round(ofp.cruise / 100)}` : "--"} size={22} />
        <Stat label="Runways" value={ofp ? `${ofp.depRwy || "--"} → ${ofp.arrRwy || "--"}` : "--"} size={22} />
      </div>
    </div>
  );
}

export function AircraftCard({ view, style }) {
  return (
    <div className="panel" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, overflow: "hidden", ...style }}>
      {/* Crop the 737 out of the team logo artwork. */}
      <div style={{ width: 230, height: 100, position: "relative", overflow: "hidden", flex: "none" }}>
        <img
          src={`${import.meta.env.BASE_URL}qfa100-logo.png`}
          alt=""
          style={{ position: "absolute", width: 270, height: 270, left: -26, top: -52, mixBlendMode: "screen" }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontStyle: "italic", letterSpacing: "0.02em" }}>
          {aircraftName(view.aircraft).toUpperCase()}
        </div>
        <div className="subvalue" style={{ fontSize: 19, marginTop: 6 }}>
          {view.reg ?? "Registration TBA"}
        </div>
        {view.ofp?.pax != null && (
          <div className="subvalue" style={{ fontSize: 15, marginTop: 6 }}>
            {num(view.ofp.pax)} passengers
          </div>
        )}
      </div>
    </div>
  );
}

export function CrewCard({ crew, style }) {
  return (
    <div className="panel" style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 26, ...style }}>
      <div className="label" style={{ color: "var(--soft)" }}>
        Crew
      </div>
      <div style={{ display: "grid", gap: 8, flex: 1 }}>
        {crew.length ? (
          crew.map((c) => (
            <div key={`${c.duty}-${c.display_name}`} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 18 }}>
              <span style={{ color: "var(--muted)" }}>
                <CrewIcon size={18} />
              </span>
              <span style={{ color: "var(--blue-bright)", fontWeight: 700, width: 40 }}>{dutyShort(c.duty)}</span>
              <span style={{ fontWeight: 600 }}>{c.display_name}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 17, color: "var(--muted)" }}>Crew to be announced</div>
        )}
      </div>
    </div>
  );
}

export function LivePanel({ view, style }) {
  const enroute = view.status === "ENROUTE" || view.status === "TAXIING";
  if (enroute || view.live) {
    return (
      <div className="panel" style={{ padding: "20px 26px", ...style }}>
        <CardHead icon={<PinIcon />}>Live position ({view.preview ? "preview" : "VATSIM"})</CardHead>
        <div style={{ display: "flex", gap: 30, marginTop: 16 }}>
          <Stat label="Altitude" value={altitude(view.alt)} size={27} />
          <Stat label="Groundspeed" value={view.gs != null ? `${num(view.gs)} kt` : "--"} size={27} />
          <Stat label="Heading" value={view.hdg != null ? `${String(Math.round(view.hdg)).padStart(3, "0")}°` : "--"} size={27} />
          <Stat label="Time to go" value={hm(view.remaining)} size={27} />
        </div>
      </div>
    );
  }
  return (
    <div className="panel" style={{ padding: "20px 26px", ...style }}>
      <CardHead icon={<ClockIcon />}>{view.status === "ARRIVED" ? "Sector complete" : "Departure countdown"}</CardHead>
      <div style={{ display: "flex", gap: 30, marginTop: 16 }}>
        <Stat
          label={view.status === "ARRIVED" ? "On blocks" : "Departs in"}
          value={view.status === "ARRIVED" ? timeUTC(view.eta) : countdown(view.untilDeparture)}
          size={27}
        />
        <Stat label="STD (UTC)" value={timeUTC(view.std)} size={27} />
        <Stat label="Block time" value={hm(view.block)} size={27} />
        <Stat label="Distance" value={`${num(view.distanceNm)} nm`} size={27} />
      </div>
    </div>
  );
}

export function ArrivalInfo({ view, style }) {
  const m = useMetar(view.sector.arr);
  const rows = [
    ["Runway", view.ofp?.arrRwy || "--"],
    ["Wind", windText(m?.wind)],
    ["Visibility", m?.visibility ?? "--"],
    ["Temperature", m?.tempC != null ? `${m.tempC}°C` : "--"],
    ["QNH", m?.qnh ? `${m.qnh} hPa` : "--"],
  ];
  return (
    <div className="panel" style={{ padding: "26px 30px", ...style }}>
      <CardHead icon={<ArrivalIcon />}>Arrival information</CardHead>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 18, columnGap: 40, marginTop: 24 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <div className="label" style={{ alignSelf: "center" }}>
              {k}
            </div>
            <div className="value" style={{ fontSize: 26 }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
