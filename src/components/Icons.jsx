const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

// Top-down airliner pointing north, so rotate(heading) aims it correctly.
export function PlaneIcon({ size = 40, color = "#fff", heading = 0, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${heading}deg)`, ...style }}>
      <path
        fill={color}
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        transform="translate(0.5 0)"
      />
    </svg>
  );
}

export const PinIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const WeatherHeadIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M8 3v2M4.2 6.2l1.4 1.4M3 11h2" />
    <path d="M7 15a4 4 0 0 1 .6-7.95A5 5 0 0 1 17 9a4 4 0 0 1 0 8H8a2 2 0 0 1-1-2z" />
  </svg>
);

export const RouteIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" />
  </svg>
);

export const CrewIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
    <path d="M8 6h8" />
  </svg>
);

export const ArrivalIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M2 21h20" />
    <path d="M3.5 12.5l3 1 3.5-4 2 .5-1.5 4.5 5 1.5 3-1.5 2.5 1-2 2.5-15-3.5z" />
  </svg>
);

export const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// Filled, colourful icon for the weather card.
export function SkyIcon({ condition, size = 72 }) {
  const sun = (
    <g>
      <circle cx="22" cy="22" r="9" fill="#ffc542" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1="22"
          y1="7"
          x2="22"
          y2="3"
          stroke="#ffc542"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${a} 22 22)`}
        />
      ))}
    </g>
  );
  const cloud = (fill = "#e9eef7") => (
    <path d="M20 54h28a11 11 0 0 0 0-22 15 15 0 0 0-28.6 3.5A9.5 9.5 0 0 0 20 54z" fill={fill} />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {condition === "clear" && (
        <g transform="translate(10 10)">
          {sun}
        </g>
      )}
      {condition === "partly" && (
        <>
          <g transform="translate(14 0)">{sun}</g>
          {cloud()}
        </>
      )}
      {condition === "cloudy" && (
        <>
          <path d="M30 40h22a9 9 0 0 0 0-18 12 12 0 0 0-22.6 2.6A8 8 0 0 0 30 40z" fill="#9fb0c9" />
          {cloud()}
        </>
      )}
      {condition === "rain" && (
        <>
          <g transform="translate(0 -8)">{cloud("#c9d3e3")}</g>
          {[22, 32, 42].map((x) => (
            <line key={x} x1={x} y1="52" x2={x - 4} y2="60" stroke="#6ea6ff" strokeWidth="3" strokeLinecap="round" />
          ))}
        </>
      )}
      {condition === "storm" && (
        <>
          <g transform="translate(0 -8)">{cloud("#aab6c9")}</g>
          <path d="M34 46l-7 10h6l-3 8 9-12h-6l3-6z" fill="#ffc542" />
        </>
      )}
      {condition === "fog" && (
        <>
          <g transform="translate(0 -10)">{cloud("#c9d3e3")}</g>
          {[50, 56, 62].map((y) => (
            <line key={y} x1="14" y1={y - 4} x2="52" y2={y - 4} stroke="#c9d3e3" strokeWidth="3" strokeLinecap="round" />
          ))}
        </>
      )}
    </svg>
  );
}
