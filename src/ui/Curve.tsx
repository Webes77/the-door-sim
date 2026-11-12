import { useEffect, useRef } from "react";
import type { Pack, State } from "../engine/types";

// The donor's impulse across this conversation, with the two lines from the manual.
export function Curve({ state, pack, mark }: { state: State; pack: Pack; mark: number | null }) {
  const path = useRef<SVGPathElement>(null);
  const m = pack.scenario.meta;
  const W = 460, H = 300, L = 44, R = 12, T = 26, B = 40;
  const turns = state.turns;
  const pts = [turns[0]?.impulseBefore ?? 0, ...turns.map((t) => t.impulseAfter)];
  const x = (i: number) => L + (pts.length > 1 ? (i / (pts.length - 1)) * (W - L - R) : 0);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);

  let d = `M ${x(0)} ${y(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (x(i - 1) + x(i)) / 2;
    d += ` C ${mx} ${y(pts[i - 1])}, ${mx} ${y(pts[i])}, ${x(i)} ${y(pts[i])}`;
  }

  useEffect(() => {
    const p = path.current;
    if (!p) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const len = p.getTotalLength();
    p.style.transition = "none";
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset 2600ms ease-out";
    p.style.strokeDashoffset = "0";
  }, [d]);

  const closes = state.closes.filter((c) => c.method !== "trial");
  const objections = turns.filter((t) => t.events.includes("objection"));

  return (
    <div className="curve">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Her impulse across this conversation, with each close marked against the Buying Line">
        <line x1={L} y1={T} x2={L} y2={H - B} className="axis" />
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} className="axis" />
        <line x1={L} y1={y(m.buyingLine)} x2={W - R} y2={y(m.buyingLine)} className="buy" />
        <text x={L + 6} y={y(m.buyingLine) - 7} className="lbl buyt">BUYING LINE</text>
        <line x1={L} y1={y(m.attentionLine)} x2={W - R} y2={y(m.attentionLine)} className="att" />
        <text x={W - R - 4} y={y(m.attentionLine) + 16} textAnchor="end" className="lbl attt">ATTENTION LINE</text>
        <text x={16} y={(T + H - B) / 2} className="lbl attt" textAnchor="middle" transform={`rotate(-90 16 ${(T + H - B) / 2})`}>IMPULSE</text>
        <text x={(L + W - R) / 2} y={H - 12} className="lbl attt" textAnchor="middle">THIS CONVERSATION</text>
        <path ref={path} d={d} className="line" />
        {objections.map((t) => (
          <g key={`o${t.n}`}>
            <line x1={x(t.n + 1)} y1={y(t.impulseAfter) - 34} x2={x(t.n + 1)} y2={y(t.impulseAfter) - 10} className="axis" />
            <text x={x(t.n + 1)} y={y(t.impulseAfter) - 40} textAnchor="middle" className="lbl ink">Objection</text>
          </g>
        ))}
        {closes.map((c, i) => (
          <circle key={`c${i}`} cx={x(c.turn + 1) - (x(1) - x(0)) * 0.5} cy={y(c.above ? Math.max(c.impulse, m.buyingLine + 2) : c.impulse)} r={c.above ? 8 : 7} className={c.above ? "dot above" : "dot below"} />
        ))}
        {mark !== null && mark < pts.length - 1 && (
          <line x1={x(mark + 1)} y1={T} x2={x(mark + 1)} y2={H - B} className="mark" />
        )}
      </svg>
      <div className="legend">
        <span><i className="k above" />Close above the Buying Line</span>
        <span><i className="k below" />Close below it</span>
        {mark !== null && <span><i className="k tp" />Turning point</span>}
      </div>
    </div>
  );
}
