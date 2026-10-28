import { useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-./";

// Text the flaps can show: uppercase, accents stripped, anything else blank.
export function flapSafe(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9:\-./ ]/g, " ");
}

// A row of split-flap cells. Whenever `text` changes each cell spins through
// random characters and settles left-to-right, like a Solari board. Cells are
// updated directly in the DOM so hundreds of them can flap without
// re-rendering React every frame. Changing `tick` replays the flap on text
// that has not changed, so a whole board can be made to run again.
export default function SplitFlap({ text, width, delay = 0, tone = "", tick = 0 }) {
  const ref = useRef(null);
  const target = flapSafe(text).padEnd(width).slice(0, width);

  useEffect(() => {
    const cells = [...ref.current.children];
    const start = performance.now() + delay;
    const settleAt = cells.map((_, i) => start + 250 + i * 35 + Math.random() * 300);
    const flip = (cell, ch) => {
      cell.textContent = ch;
      cell.dataset.f = cell.dataset.f === "a" ? "b" : "a";
    };

    let raf;
    let lastTick = 0;
    const frame = (now) => {
      if (now - lastTick >= 60) {
        lastTick = now;
        let settled = true;
        cells.forEach((cell, i) => {
          if (now >= settleAt[i]) {
            if (cell.textContent !== target[i]) flip(cell, target[i]);
          } else {
            settled = false;
            if (now >= start && (target[i] !== " " || cell.textContent !== " ")) {
              flip(cell, CHARS[(Math.random() * CHARS.length) | 0]);
            }
          }
        });
        if (settled) return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, tick]);

  return (
    <span ref={ref} className={`flaps ${tone}`}>
      {Array.from({ length: width }, (_, i) => (
        <span key={i} className="flap">
          {" "}
        </span>
      ))}
    </span>
  );
}
