import type { CSSProperties, ReactNode } from "react";

type BlockProps = {
  x: number;
  y: number;
  h: number;
  top: ReactNode;
  ember?: boolean;
  delay?: number;
  endAlign?: boolean;
};

/** One isometric block on the 400×400 plane: a top face raised by `h`, plus four walls. */
function Block({ x, y, h, top, ember, delay = 0, endAlign }: BlockProps) {
  const topBg = ember ? "var(--ax-ember)" : "#FFFFFF";
  const shade = (dark: boolean): CSSProperties =>
    ember
      ? { background: "var(--ax-ember)", boxShadow: `inset 0 0 0 100px rgba(18,25,21,${dark ? 0.34 : 0.18})` }
      : { background: dark ? "#C5CAC1" : "#DCDFD8" };
  return (
    <div className="ax-block" style={{ left: x, top: y }}>
      <div className="ax-bob" style={{ animationDelay: `${delay}s` }}>
        <div className={`ax-face top${endAlign ? " end" : ""}`} style={{ transform: `translateZ(${h}px)`, background: topBg }}>
          {top}
        </div>
        <div className="ax-face" style={{ left: 0, top: 80, width: 80, height: h, transformOrigin: "top", transform: "rotateX(90deg)", ...shade(true) }} />
        <div className="ax-face" style={{ left: -h, top: 0, width: h, height: 80, transformOrigin: "right", transform: "rotateY(90deg)", ...shade(false) }} />
        <div className="ax-face" style={{ left: 0, top: -h, width: 80, height: h, transformOrigin: "bottom", transform: "rotateX(-90deg)", ...shade(true) }} />
        <div className="ax-face" style={{ left: 80, top: 0, width: h, height: 80, transformOrigin: "left", transform: "rotateY(-90deg)", ...shade(false) }} />
      </div>
    </div>
  );
}

/** Decorative hero map: your app at the centre, four prepared providers around it. */
export function AtlasScene() {
  return (
    <div className="ax-art" aria-hidden="true">
      <div className="ax-art-stage">
        <div className="ax-plane">
          <div className="ax-plane-edge front" />
          <div className="ax-plane-edge side" />
          <svg className="ax-routes" width="400" height="400" viewBox="0 0 400 400" fill="none">
            <path className="ax-route" d="M200 200 L80 80" stroke="#E8501A" strokeWidth="4" strokeDasharray="10 6" />
            <path className="ax-route" d="M200 200 L320 80" stroke="#121915" strokeWidth="2" strokeDasharray="6 6" />
            <path className="ax-route" d="M200 200 L80 320" stroke="#121915" strokeWidth="2" strokeDasharray="6 6" />
            <path className="ax-route" d="M200 200 L320 320" stroke="#121915" strokeWidth="2" strokeDasharray="6 6" />
            <circle cx="80" cy="80" r="52" stroke="#E8501A" strokeWidth="1.5" opacity="0.6" />
          </svg>

          {/* hub */}
          <div className="ax-block" style={{ left: 160, top: 160 }}>
            <div className="ax-face top end" style={{ transform: "translateZ(20px)", background: "#121915", color: "#F2F3EF", letterSpacing: "0.06em" }}>
              <span>YOUR<br />APP</span>
            </div>
            <div className="ax-face" style={{ left: 0, top: 80, width: 80, height: 20, transformOrigin: "top", transform: "rotateX(90deg)", background: "#2A322D" }} />
            <div className="ax-face" style={{ left: -20, top: 0, width: 20, height: 80, transformOrigin: "right", transform: "rotateY(90deg)", background: "#3A433D" }} />
            <div className="ax-face" style={{ left: 0, top: -20, width: 80, height: 20, transformOrigin: "bottom", transform: "rotateX(-90deg)", background: "#2A322D" }} />
            <div className="ax-face" style={{ left: 80, top: 0, width: 20, height: 80, transformOrigin: "left", transform: "rotateY(-90deg)", background: "#3A433D" }} />
          </div>

          <Block x={40} y={40} h={48} ember top={<><span style={{ fontWeight: 500 }}>01</span><span>GITHUB<br />repo access</span></>} />
          <Block x={280} y={40} h={64} delay={-1.4} endAlign top={<span>SLACK<br />workspace ok</span>} />
          <Block x={40} y={280} h={36} delay={-2.6} endAlign top={<span>GMAIL<br />scope review</span>} />
          <Block x={280} y={280} h={28} delay={-3.8} endAlign top={<span>TALLY<br />indie pick</span>} />
        </div>
      </div>

      <div className="ax-callout light ax-hide-sm">
        <div className="ax-callout-label">
          <span className="ax-ping-wrap"><span className="ax-ping" /><span /></span>
          YOUR NEXT STEP
        </div>
        <div className="ax-callout-title">Install the GitHub App on one test repo</div>
        <div className="ax-muted-mono" style={{ fontSize: 12 }}>source · docs.github.com</div>
      </div>
      <div className="ax-callout dark ax-hide-sm">
        <div className="ax-callout-label">LAUNCH GATE · GMAIL</div>
        <div style={{ fontSize: 15, lineHeight: 1.35 }}>Testing-mode Gmail authorizations expire after seven days.</div>
      </div>

      <ol className="ax-stages">
        <li><span>01</span><strong>Discover</strong></li>
        <li><span>02</span><strong>Understand</strong></li>
        <li className="later"><span>03</span><strong>Build</strong></li>
      </ol>
    </div>
  );
}
