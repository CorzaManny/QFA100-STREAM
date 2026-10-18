import { useEffect, useState } from "react";

// Each graphic is laid out on a fixed design canvas (e.g. 1920x1080) and
// scaled to whatever size the OBS Browser Source is, so it looks identical
// at 720p, 1080p or 1440p.
export default function Stage({ width, height, children, style }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, height]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
