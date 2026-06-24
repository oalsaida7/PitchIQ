"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  obsidian: "#0B0C10", charcoal: "#1F2833", c2: "#161d27", c3: "#26303d", c4: "#2f3b4a",
  cyan: "#66FCF1", cyanDim: "rgba(102,252,241,0.1)", cyanBorder: "rgba(102,252,241,0.22)",
  ice: "#C5C6C7", iceDim: "rgba(197,198,199,0.5)", iceFaint: "rgba(197,198,199,0.1)",
  green: "#22c55e", red: "#ef4444", amber: "#f59e0b", blue: "#60a5fa",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
};
const rc = (r: number) => r >= 7.5 ? C.green : r >= 6.5 ? C.amber : C.red;
const rcBg = (r: number) => r >= 7.5 ? "rgba(34,197,94,0.15)" : r >= 6.5 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Dots() { return <span className="dots"><span /><span /><span /></span>; }
function Divider() { return <div style={{ height: 1, background: C.border, margin: "12px 0" }} />; }
function SLabel({ children, style, color }: { children: React.ReactNode; style?: React.CSSProperties; color?: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".9px", color: color || C.cyan, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </div>
  );
}
function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color, background: bg, letterSpacing: ".3px" }}>{label}</span>;
}
function StatBar({ label, hv, av }: { label: string; hv: number; av: number }) {
  const tot = (hv || 0) + (av || 0) || 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.ice, minWidth: 26, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{hv}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: C.c3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(((hv || 0) / tot) * 100)}%`, height: "100%", background: C.cyan, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, color: C.iceDim, minWidth: 95, textAlign: "center", flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, height: 4, background: C.c3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(((av || 0) / tot) * 100)}%`, height: "100%", background: C.blue, borderRadius: 2, marginLeft: "auto" }} />
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.ice, minWidth: 26, fontFamily: "'JetBrains Mono',monospace" }}>{av}</span>
    </div>
  );
}

// ─── Date nav ─────────────────────────────────────────────────────────────────
function buildDates() {
  const today = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const labels = ["−3 days", "−2 days", "Yesterday", "Today", "Tomorrow", "+2 days", "+3 days", "+4 days"];
    return { key, label: labels[i], isToday: i === 3 };
  });
}

// ─── Tab content ──────────────────────────────────────────────────────────────
type MatchTab = "preview" | "lineup" | "commentary" | "stats" | "table" | "review";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabContent({ match, tab, data }: { match: any; tab: MatchTab; data: any }) {
  if (tab === "preview") return (
    <div className="animate-in">
      <SLabel>Prediction</SLabel>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 38, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.ice, letterSpacing: 6, marginBottom: 8 }}>{data.prediction || "—"}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {[{ l: `${match.home.split(" ")[0]} ${data.homeWin || 45}%`, bg: C.cyanDim, c: C.cyan },
            { l: `Draw ${data.draw || 25}%`, bg: C.iceFaint, c: C.iceDim },
            { l: `${match.away.split(" ").slice(-1)[0]} ${data.awayWin || 30}%`, bg: "rgba(96,165,250,0.1)", c: C.blue }]
            .map(p => <span key={p.l} style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, color: p.c, background: p.bg }}>{p.l}</span>)}
        </div>
      </div>
      <Divider />
      <SLabel>Predicted Scorers</SLabel>
      <p style={{ fontSize: 13, color: C.ice, marginBottom: 4 }}>{data.homeScorerPred || `${match.home}: Striker (Expected 34')`}</p>
      <p style={{ fontSize: 13, color: C.ice, marginBottom: 12 }}>{data.awayScorerPred || `${match.away}: Attacker (Expected 67')`}</p>
      <Divider />
      <SLabel>Team Form</SLabel>
      {[{ name: match.home, form: data.homeForm }, { name: match.away, form: data.awayForm }].map(t => (
        <div key={t.name} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.iceDim, marginBottom: 4 }}>{t.name}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(t.form || ["W","W","D","L","W"]).map((r: string, i: number) => (
              <span key={i} className={`form-dot form-${r.toLowerCase()}`}>{r}</span>
            ))}
          </div>
        </div>
      ))}
      <Divider />
      <SLabel>Head to Head</SLabel>
      {(data.h2h || []).map((h: { date: string; result: string; winner: string }, i: number) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
          <span style={{ color: C.iceDim, minWidth: 58 }}>{h.date}</span>
          <span style={{ flex: 1, color: C.ice }}>{h.result}</span>
          <span style={{ fontWeight: 700, color: h.winner === "home" ? C.cyan : h.winner === "away" ? C.blue : C.iceDim }}>{h.winner === "draw" ? "D" : h.winner === "home" ? "W" : "L"}</span>
        </div>
      ))}
      <Divider />
      <SLabel>Tactics</SLabel>
      {[{ name: match.home, t: data.homeTactic }, { name: match.away, t: data.awayTactic }].map(x => (
        <div key={x.name} style={{ background: C.c3, borderRadius: 8, padding: "9px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{x.name}</div>
          <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.65 }}>{x.t || "Tactical analysis generating…"}</div>
        </div>
      ))}
      {(data.venue || data.referee || data.competition) && <>
        <Divider />
        <SLabel>Match Info</SLabel>
        {[["Venue", data.venue], ["Referee", data.referee], ["Competition", data.competition]].filter(([,v]) => v).map(([l, v]) => (
          <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: "8px 12px", marginBottom: 4, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{l as string}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ice }}>{v as string}</div>
          </div>
        ))}
      </>}
      {data.reasoning && <>
        <Divider />
        <SLabel>Reasoning</SLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.cyan}`, paddingLeft: 12 }}>{data.reasoning}</div>
      </>}
    </div>
  );

  if (tab === "lineup") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseGrid = (gridStr: string, isAway: boolean): { top: string; left: string } => {
      if (!gridStr) return { top: "50%", left: "50%" };
      const [line, col] = gridStr.split(":").map(Number);
      const maxLine = 4, maxCol = 5;
      let topPct = ((line - 1) / (maxLine - 1)) * 80 + 10;
      if (isAway) topPct = 100 - topPct;
      const leftPct = ((col - 1) / (maxCol - 1)) * 76 + 12;
      return { top: `${topPct}%`, left: `${leftPct}%` };
    };
    return (
      <div className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ color: C.cyan }}>{match.home} <span style={{ color: C.iceDim, fontWeight: 400 }}>({data.homeFormation})</span></span>
          <span style={{ color: C.blue }}><span style={{ color: C.iceDim, fontWeight: 400 }}>({data.awayFormation})</span> {match.away}</span>
        </div>
        {/* Pitch */}
        <div style={{ position: "relative", width: "100%", height: 380, background: "#1a2e1a", borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
          {/* Pitch markings */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 70, height: 70, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: "10%", left: "20%", right: "20%", height: "22%", border: "1px solid rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", bottom: "10%", left: "20%", right: "20%", height: "22%", border: "1px solid rgba(255,255,255,0.1)" }} />
          {/* Home players */}
          {(data.homeLineup || []).map((p: { num: number; name: string; grid?: string; pred?: string }, i: number) => {
            const pos = parseGrid(p.grid || `${Math.floor(i/3)+1}:${(i%5)+1}`, false);
            return (
              <div key={i} style={{ position: "absolute", top: pos.top, left: pos.left, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}>
                <div style={{ position: "relative", width: 26, height: 26, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  {p.num}
                  {p.pred && <span style={{ position: "absolute", top: -7, right: -14, fontSize: 8, fontWeight: 800, padding: "1px 3px", borderRadius: 3, background: rcBg(parseFloat(p.pred)), color: rc(parseFloat(p.pred)) }}>{p.pred}</span>}
                </div>
                <span style={{ fontSize: 8, color: C.ice, fontWeight: 600, marginTop: 2, textShadow: "0 1px 3px #000", whiteSpace: "nowrap", maxWidth: 55, overflow: "hidden", textOverflow: "ellipsis" }}>{String(p.name).split(" ").pop()}</span>
              </div>
            );
          })}
          {/* Away players */}
          {(data.awayLineup || []).map((p: { num: number; name: string; grid?: string; pred?: string }, i: number) => {
            const pos = parseGrid(p.grid || `${Math.floor(i/3)+1}:${(i%5)+1}`, true);
            return (
              <div key={i} style={{ position: "absolute", top: pos.top, left: pos.left, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}>
                <div style={{ position: "relative", width: 26, height: 26, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  {p.num}
                  {p.pred && <span style={{ position: "absolute", top: -7, right: -14, fontSize: 8, fontWeight: 800, padding: "1px 3px", borderRadius: 3, background: rcBg(parseFloat(p.pred)), color: rc(parseFloat(p.pred)) }}>{p.pred}</span>}
                </div>
                <span style={{ fontSize: 8, color: C.ice, fontWeight: 600, marginTop: 2, textShadow: "0 1px 3px #000", whiteSpace: "nowrap", maxWidth: 55, overflow: "hidden", textOverflow: "ellipsis" }}>{String(p.name).split(" ").pop()}</span>
              </div>
            );
          })}
        </div>
        {/* List */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[{ team: match.home, lineup: data.homeLineup, col: C.cyan }, { team: match.away, lineup: data.awayLineup, col: C.blue }].map(side => (
            <div key={side.team}>
              <SLabel color={side.col}>{side.team}</SLabel>
              {(side.lineup || []).map((p: { num: number; name: string; role: string; pred?: string }, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span><span style={{ color: C.iceDim, marginRight: 5 }}>{p.num}</span>{p.name}</span>
                  {p.pred && <span style={{ fontWeight: 700, color: rc(parseFloat(p.pred)), fontFamily: "'JetBrains Mono',monospace" }}>{p.pred}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        {data.lineupNote && <div style={{ marginTop: 10, fontSize: 12, color: C.iceDim, background: C.c3, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>{data.lineupNote}</div>}
      </div>
    );
  }

  if (tab === "review") return (
    <div className="animate-in">
      {data.manOfMatch && (
        <div style={{ background: "rgba(102,252,241,0.07)", border: `1px solid ${C.cyanBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span>⭐</span>
          <div>
            <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Man of the Match</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ice }}>{data.manOfMatch}</div>
          </div>
        </div>
      )}
      <SLabel>Goal Scorers</SLabel>
      {(data.scorers || []).length === 0 && <p style={{ fontSize: 12, color: C.iceDim, marginBottom: 12 }}>No goals recorded</p>}
      {(data.scorers || []).map((s: { minute: string; name: string; type: string; assist: string; team: string }, i: number) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
          <span style={{ color: C.cyan, fontWeight: 700, minWidth: 26, fontFamily: "'JetBrains Mono',monospace" }}>{s.minute}&apos;</span>
          <div><div style={{ color: C.ice, fontWeight: 500 }}>⚽ {s.name}</div><div style={{ color: C.iceDim }}>{s.type}{s.assist ? ` · Assist: ${s.assist}` : ""} · {s.team}</div></div>
        </div>
      ))}
      <Divider />
      <SLabel>Player Ratings</SLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 12 }}>
        {(data.ratings || []).map((r: { name: string; pos: string; team: string; rating: number }, i: number) => (
          <div key={i} style={{ background: C.c3, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 12, color: C.ice }}>{r.name}</div><div style={{ fontSize: 10, color: C.iceDim }}>{r.pos} · {r.team}</div></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: rc(r.rating), background: rcBg(r.rating), width: 34, height: 34, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace" }}>{r.rating}</div>
          </div>
        ))}
      </div>
      <Divider />
      <SLabel>Tactical Review</SLabel>
      {[{ name: match.home, t: data.homeReview, i: data.homeImprove }, { name: match.away, t: data.awayReview, i: data.awayImprove }].map(x => (
        <div key={x.name} style={{ background: C.c3, borderRadius: 8, padding: "9px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{x.name}</div>
          <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.6, marginBottom: 4 }}>{x.t}</div>
          {x.i && <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5, borderLeft: `2px solid ${C.amber}`, paddingLeft: 8 }}>Improvement: {x.i}</div>}
        </div>
      ))}
    </div>
  );

  if (tab === "commentary") {
    const typeColor: Record<string, string> = { goal: C.cyan, card: C.amber, chance: C.blue, normal: C.ice };
    return (
      <div className="animate-in">
        {(data.events || [{ min: "—", text: "Commentary will appear when the match is live.", type: "normal" }]).map((e: { min: string; text: string; type: string }, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, minWidth: 30, paddingTop: 1, fontFamily: "'JetBrains Mono',monospace" }}>{e.min}&apos;</span>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: typeColor[e.type] || C.ice }}>{e.type === "goal" ? "⚽ " : ""}{e.text}</span>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "stats") return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 11, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px" }}>
        <span>{match.home}</span><span>{match.away}</span>
      </div>
      {[["Possession %", data.possession?.home, data.possession?.away],
        ["Shots", data.shots?.home, data.shots?.away],
        ["Shots on target", data.shotsOnTarget?.home, data.shotsOnTarget?.away],
        ["Big chances", data.bigChances?.home, data.bigChances?.away],
        ["Passes", data.passes?.home, data.passes?.away],
        ["Pass accuracy %", data.passAccuracy?.home, data.passAccuracy?.away],
        ["Fouls", data.fouls?.home, data.fouls?.away],
        ["Offsides", data.offsides?.home, data.offsides?.away],
        ["Corners", data.corners?.home, data.corners?.away],
        ["Yellow cards", data.yellowCards?.home, data.yellowCards?.away],
        ["Red cards", data.redCards?.home, data.redCards?.away],
        ["xG", data.xG?.home, data.xG?.away],
      ].map(([l, h, a]) => <StatBar key={l as string} label={l as string} hv={(h as number) ?? 0} av={(a as number) ?? 0} />)}
    </div>
  );

  if (tab === "table") return (
    <div className="animate-in">
      <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 24px 24px 24px 24px 34px", gap: 3, padding: "4px 0 8px", borderBottom: `1px solid ${C.border2}`, fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px" }}>
        <span style={{ textAlign: "center" }}>#</span><span>Club</span>
        <span style={{ textAlign: "center" }}>P</span><span style={{ textAlign: "center" }}>W</span><span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>L</span><span style={{ textAlign: "center" }}>Pts</span>
      </div>
      {!(data.teams?.length) && <div style={{ padding: "12px 0", fontSize: 12, color: C.iceDim, textAlign: "center" }}>Standings loading…</div>}
      {(data.teams || []).map((t: { pos: number; name: string; played: number; won: number; drawn: number; lost: number; pts: number }) => {
        const hl = t.name === match.home || t.name === match.away;
        return (
          <div key={t.pos} style={{ display: "grid", gridTemplateColumns: "24px 1fr 24px 24px 24px 24px 34px", gap: 3, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center", background: hl ? "rgba(102,252,241,0.04)" : "transparent", borderRadius: hl ? 4 : 0 }}>
            <span style={{ textAlign: "center", color: hl ? C.cyan : C.iceDim, fontWeight: hl ? 700 : 400 }}>{t.pos}</span>
            <span style={{ color: hl ? C.cyan : C.ice, fontWeight: hl ? 600 : 400 }}>{t.name}</span>
            <span style={{ textAlign: "center", color: C.iceDim }}>{t.played}</span>
            <span style={{ textAlign: "center", color: C.iceDim }}>{t.won}</span>
            <span style={{ textAlign: "center", color: C.iceDim }}>{t.drawn}</span>
            <span style={{ textAlign: "center", color: C.iceDim }}>{t.lost}</span>
            <span style={{ textAlign: "center", fontWeight: 700, color: C.ice }}>{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
  return null;
}

// ─── Match expanded ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatchExpanded({ match, cache, onLoadTab }: { match: any; cache: Record<string, unknown>; onLoadTab: (tab: MatchTab) => void }) {
  const isFinal = match.status === "final";
  const tabs: { id: MatchTab; label: string }[] = isFinal
    ? [{ id: "review", label: "Review" }, { id: "lineup", label: "Lineups" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }]
    : [{ id: "preview", label: "Preview" }, { id: "lineup", label: "Lineups" }, { id: "commentary", label: "Commentary" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }];
  const defaultTab: MatchTab = isFinal ? "review" : "preview";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab, cache, onLoadTab]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = cache[activeTab] as Record<string, any> | undefined;

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.c2 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flexShrink: 0, padding: "9px 14px", fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, fontFamily: "'Space Grotesk',sans-serif", color: activeTab === t.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "14px 12px", minHeight: 80 }}>
        {!data
          ? <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.iceDim, fontSize: 13 }}><Dots /> Analyzing…</div>
          : <TabContent match={match} tab={activeTab} data={data} />
        }
      </div>
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, unknown>>({});

  const loadTab = useCallback(async (tab: MatchTab) => {
    if (tabCache[tab]) return;
    try {
      const res = await fetch("/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match, type: tab }),
      });
      const { data } = await res.json();
      setTabCache(prev => ({ ...prev, [tab]: data || { _empty: true } }));
    } catch {
      setTabCache(prev => ({ ...prev, [tab]: { _error: true } }));
    }
  }, [match, tabCache]);

  const isFinal = match.status === "final";
  const isLive = match.status === "live";
  const winH = isFinal && match.hasScore && match.score.home > match.score.away;
  const winA = isFinal && match.hasScore && match.score.away > match.score.home;

  return (
    <div
      style={{ background: C.charcoal, borderRadius: 10, border: `1px solid ${expanded ? C.cyanBorder : isLive ? "rgba(239,68,68,0.3)" : C.border}`, overflow: "hidden", marginBottom: 3, transition: "border-color .15s", cursor: "pointer" }}
      onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 1fr", alignItems: "center", gap: 6, padding: "11px 12px" }}>
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {match.homeLogo
            ? <img src={match.homeLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
            : <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.iceDim, flexShrink: 0 }}>{match.homeAbbr}</div>
          }
          <span style={{ fontSize: 13, fontWeight: 500, color: winA ? C.iceDim : C.ice, lineHeight: 1.2 }}>{match.home}</span>
        </div>
        {/* Middle */}
        <div style={{ textAlign: "center" }}>
          {isLive ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, background: C.red, borderRadius: "50%", animation: "live-pulse 1.5s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.red, fontFamily: "'JetBrains Mono',monospace" }}>{match.liveMin || "LIVE"}</span>
            </div>
          ) : isFinal ? (
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ice, letterSpacing: 2, fontFamily: "'JetBrains Mono',monospace" }}>
              {match.hasScore ? `${match.score.home}–${match.score.away}` : "FT"}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.iceDim }}>{match.kick || "TBD"}</div>
          )}
        </div>
        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexDirection: "row-reverse" }}>
          {match.awayLogo
            ? <img src={match.awayLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
            : <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.iceDim, flexShrink: 0 }}>{match.awayAbbr}</div>
          }
          <span style={{ fontSize: 13, fontWeight: 500, color: winH ? C.iceDim : C.ice, textAlign: "right", lineHeight: 1.2 }}>{match.away}</span>
        </div>
      </div>
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── Scores panel ─────────────────────────────────────────────────────────────
function ScoresPanel() {
  const dates = buildDates();
  const todayKey = dates.find(d => d.isToday)?.key || new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const PRIORITY = ["world cup", "premier league", "champions league", "la liga", "serie a", "bundesliga", "ligue 1", "mls", "primera division"];

  useEffect(() => {
    let active = true;
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`);
        const data = await res.json();
        if (active && data.matches) {
          const sorted = data.matches.sort((a: { leagueName: string; league: string; status: string }, b: { leagueName: string; league: string; status: string }) => {
            const aP = PRIORITY.findIndex(l => (a.leagueName || a.league || "").toLowerCase().includes(l));
            const bP = PRIORITY.findIndex(l => (b.leagueName || b.league || "").toLowerCase().includes(l));
            const aScore = aP === -1 ? 999 : aP;
            const bScore = bP === -1 ? 999 : bP;
            if (aScore !== bScore) return aScore - bScore;
            if (a.status === "live" && b.status !== "live") return -1;
            if (b.status === "live" && a.status !== "live") return 1;
            return 0;
          });
          setMatches(sorted);
        }
      } catch { /* silent */ }
      if (initial) setLoading(false);
    }
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byLeague: Record<string, any[]> = {};
  matches.forEach(m => {
    const key = m.leagueName || m.league || "Other";
    if (!byLeague[key]) byLeague[key] = [];
    byLeague[key].push(m);
  });

  const liveCount = matches.filter(m => m.status === "live").length;

  return (
    <div>
      {/* Date nav */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map(d => (
          <button key={d.key} onClick={() => setSelectedDate(d.key)}
            style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: d.isToday ? 600 : 400, fontFamily: "'Space Grotesk',sans-serif", color: selectedDate === d.key ? "#0B0C10" : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap" }}>
            {d.label}
          </button>
        ))}
      </div>
      {/* Live indicator */}
      {liveCount > 0 && (
        <div style={{ background: "rgba(239,68,68,0.08)", borderBottom: `1px solid rgba(239,68,68,0.2)`, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, background: C.red, borderRadius: "50%", animation: "live-pulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{liveCount} match{liveCount > 1 ? "es" : ""} live now</span>
        </div>
      )}
      <div style={{ padding: "6px 12px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: C.iceDim, fontSize: 13 }}><Dots /> Loading matches…</div>
        ) : !matches.length ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: C.iceDim, fontSize: 13 }}>No matches found for this date.</div>
        ) : (
          Object.entries(byLeague).map(([lg, ms]) => (
            <div key={lg} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 6px" }}>
                {ms[0].leagueLogo
                  ? <img src={ms[0].leagueLogo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
                  : <div style={{ width: 16, height: 16, borderRadius: 3, background: C.c4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 800, color: "#fff" }}>{lg.slice(0, 2).toUpperCase()}</div>
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: C.iceDim }}>{lg}</span>
                <span style={{ fontSize: 11, color: C.iceDim, marginLeft: "auto" }}>{ms.length} game{ms.length > 1 ? "s" : ""}</span>
              </div>
              {ms.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── News panel ───────────────────────────────────────────────────────────────
function NewsPanel() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => { if (d.news) setNews(d.news); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <div style={{ textAlign: "center", padding: "40px 16px", color: C.iceDim }}><Dots /> Fetching news…</div>}
      {!loading && !news.length && <div style={{ textAlign: "center", padding: "40px 16px", color: C.iceDim, fontSize: 13 }}>No news available right now.</div>}
      {news.map((n, i) => (
        <div key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, background: n.confirmed ? "rgba(102,252,241,0.03)" : "transparent", borderLeft: n.confirmed ? `3px solid ${C.cyan}` : "3px solid transparent" }}>
          <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: ".5px" }}>{n.source}</span>
              {n.tag === "done" && <Tag label="Done Deal" color={C.cyan} bg="rgba(102,252,241,0.12)" />}
              {n.tag === "rumor" && <Tag label="Rumor" color={C.amber} bg="rgba(245,158,11,0.1)" />}
            </div>
            {/* Added explicit Date stamp and active redirect links */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.iceDim }}>{n.time || "June 24, 2026"}</span>
              <a href={n.url || `https://www.google.com/search?q=${encodeURIComponent(n.headline)}`} target="_blank" rel="noopener noreferrer" style={{ color: C.cyan, fontSize: 12, textDecoration: "none" }}>↗</a>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.ice, lineHeight: 1.4, marginBottom: 4 }}>{n.headline}</div>
          {n.snippet && <div style={{ fontSize: 12, color: C.iceDim, lineHeight: 1.55 }}>{n.snippet}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Scout panel ──────────────────────────────────────────────────────────────
function ScoutPanel() {
  const [input, setInput] = useState("");
  const [simInput, setSimInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState("");
  const [report, setReport] = useState<Record<string, any> | null>(null);

  const gems = ["Rayan Cherki", "Sverre Nypan", "Yankuba Minteh", "Mikautadze", "Enzo Millot", "Cyril Ngonge"];
  const stars = ["Erling Haaland", "Lamine Yamal", "Pedri", "Vinicius Jr", "Mohamed Salah"];

  const scout = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true); setReport(null); setInput(name);
    try {
      const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } catch { setReport({ _error: true }); }
    setLoading(false);
  };

  const findSimilar = async () => {
    if (!simInput.trim()) return;
    setSimLoading(true); setSimResult("");
    try {
      const res = await fetch("/api/similar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: simInput }) });
      const data = await res.json();
      if (data.result) setSimResult(data.result);
    } catch { setSimResult("Could not complete similarity check. Try again."); }
    setSimLoading(false);
  };

  const ratColor = (v: number) => v >= 80 ? C.cyan : v >= 65 ? C.amber : C.red;
  const STATS = [["pace","Pace"],["technical","Tech"],["physical","Phys"],["mental","Mental"],["defending","Def"],["shooting","Shot"]] as const;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ice, marginBottom: 3 }}>Scout AI</div>
        <div style={{ fontSize: 12, color: C.iceDim }}>Stars, hidden gems, wonderkids — global analytical engines</div>
      </div>
      
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && scout(input)}
          placeholder="Search any player worldwide…"
          style={{ flex: 1, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.ice, outline: "none", fontFamily: "'Space Grotesk',sans-serif" }} />
        <button onClick={() => scout(input)} disabled={loading}
          style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.cyan}`, background: loading ? C.c3 : C.cyanDim, color: C.cyan, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <Dots /> : "Scout"}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Hidden Gems 💎</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {gems.map(g => <button key={g} onClick={() => scout(g)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 14, border: `1px solid rgba(102,252,241,0.28)`, background: "rgba(102,252,241,0.06)", color: C.cyan, cursor: "pointer" }}>{g}</button>)}
        </div>
        <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>World Class</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {stars.map(s => <button key={s} onClick={() => scout(s)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 14, border: `1px solid ${C.border2}`, background: C.c3, color: C.ice, cursor: "pointer" }}>{s}</button>)}
        </div>
      </div>

      {/* Fixed Lookalike Similarity Search Block */}
      <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Find me a player like…</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={simInput} onChange={e => setSimInput(e.target.value)} onKeyDown={e => e.key === "Enter" && findSimilar()}
            placeholder="e.g. a younger Pirlo, budget Haaland…"
            style={{ flex: 1, background: C.c3, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, color: C.ice, outline: "none" }} />
          <button onClick={findSimilar} disabled={simLoading}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(96,165,250,0.3)`, background: "rgba(96,165,250,0.1)", color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {simLoading ? <Dots /> : "Find"}
          </button>
        </div>
        {simResult && <div style={{ marginTop: 8, fontSize: 12, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.blue}`, paddingLeft: 10 }}>{simResult}</div>}
      </div>

      {loading && (
        <div style={{ background: C.charcoal, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, textAlign: "center", color: C.iceDim, fontSize: 13 }}>
          <Dots /> <span style={{ marginLeft: 8 }}>Scouting targets…</span>
        </div>
      )}

      {report && !loading && !report._error && (
        <div className="animate-in" style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px", background: "linear-gradient(135deg,#0a1e12,#0f2e1c)", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.cyanBorder}` }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(102,252,241,0.12)", border: `2px solid ${C.cyanBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: C.cyan, flexShrink: 0 }}>
              {String(report.name || "").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{report.name}</div>
              <div style={{ fontSize: 11, color: C.iceDim }}>{report.position} · {report.club} · {report.league}</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.cyan }}>{report.overall}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border }}>
            {STATS.map(([key, label]) => {
              const v = report.ratings?.[key] ?? 0;
              return (
                <div key={key} style={{ padding: "9px 4px", background: C.charcoal, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: ratColor(v) }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", marginTop: 1 }}>{label}</div>
                </div>
              );
            })}
          </div>

          {/* Restored Active Metrics & Historic Context Lists */}
          <div style={{ padding: 14 }}>
            <SLabel>Current Season Data</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
              {Object.entries(report.seasonStats || {}).map(([k, v]: any) => (
                <div key={k} style={{ background: C.c3, borderRadius: 6, padding: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ice }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase" }}>{k}</div>
                </div>
              ))}
            </div>

            {report.pastSeasonStats && (
              <>
                <SLabel>Historical Metrics</SLabel>
                <div style={{ marginBottom: 12 }}>
                  {report.pastSeasonStats.map((sh: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ice, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span>{sh.year} · {sh.club}</span>
                      <span style={{ color: C.cyan }}>{sh.goals}G / {sh.assists}A ({sh.apps} Apps)</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SLabel>Scout Verdict</SLabel>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.6, marginBottom: 14 }}>{report.verdict}</p>

            {/* Direct Verification Highlight Link Check */}
            {report.ytLink ? (
              <a href={report.ytLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, color: C.green, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                ▶ Watch Verified Highlights on YouTube
              </a>
            ) : (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 500 }}>
                ⚠️ Highlight Link: Media package currently unavailable for this player.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Search result (full Claude-powered detail) ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SearchResult({ entity }: { entity: any }) {
  const [aiDetail, setAiDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const d = entity.detail || {};
  const typeColor = entity.type === "player" ? C.cyan : C.amber;

  const loadAI = async () => {
    setLoading(true);
    try {
      if (entity.type === "player") {
        const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: entity.name }) });
        const { report } = await res.json();
        setAiDetail(report);
      } else {
        const res = await fetch("/api/predict", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match: { home: entity.name, away: "Opponent FC", leagueName: String(d.league || "Football"), status: "scheduled", score: { home: 0, away: 0 } }, type: "preview" }),
        });
        const { data } = await res.json();
        setAiDetail(data);
      }
    } catch { setAiDetail({ _error: true }); }
    setLoading(false);
  };

  return (
    <div className="animate-in" style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        {entity.logo
          ? <img src={entity.logo} alt="" style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0, borderRadius: 6 }} onError={e => (e.currentTarget.style.display = "none")} />
          : <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.c3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: typeColor, flexShrink: 0 }}>{entity.name.slice(0, 2).toUpperCase()}</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{entity.name}</span>
            <Tag label={entity.type} color={typeColor} bg={entity.type === "player" ? C.cyanDim : "rgba(245,158,11,0.1)"} />
          </div>
          <div style={{ fontSize: 12, color: C.iceDim }}>{entity.sub}</div>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        {/* TheSportsDB data */}
        {d.description && <p style={{ fontSize: 12, color: C.iceDim, lineHeight: 1.6, marginBottom: 12 }}>{d.description}</p>}
        {entity.type === "club" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {[["Stadium", d.stadium], ["Manager", d.manager], ["Founded", d.founded], ["Country", d.country]].filter(([,v]) => v).map(([l, v]) => (
              <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>{l as string}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.ice }}>{v as string}</div>
              </div>
            ))}
          </div>
        )}
        {entity.type === "player" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
            {[["Position", d.position], ["Age", d.age], ["Nationality", d.nationality]].filter(([,v]) => v).map(([l, v]) => (
              <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: "8px 10px", textAlign: "center", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ice }}>{v as string}</div>
                <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px", marginTop: 2 }}>{l as string}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* AI deep dive */}
        {!aiDetail && !loading && (
          <button onClick={loadAI} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${C.cyanBorder}`, background: C.cyanDim, color: C.cyan, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
            ✦ Load AI Analysis
          </button>
        )}
        {loading && <div style={{ textAlign: "center", color: C.iceDim, fontSize: 13 }}><Dots /> Generating AI analysis…</div>}
        
        {aiDetail && !loading && entity.type === "player" && (
          <div>
            <Divider />
            <SLabel>AI Scout Report</SLabel>
            {(aiDetail.ratings as Record<string, number>) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginBottom: 10 }}>
                {Object.entries(aiDetail.ratings as Record<string, number>).map(([k, v]) => (
                  <div key={k} style={{ background: C.c3, borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: v >= 80 ? C.cyan : v >= 65 ? C.amber : C.red, fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
                    <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 1 }}>{k.slice(0, 4)}</div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 6 }}>{aiDetail.style as string}</p>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7 }}>{aiDetail.verdict as string}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
type MainTab = "scores" | "news" | "scout";

export default function PitchIQ() {
  const [mainTab, setMainTab] = useState<MainTab>("scores");
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results?.length) { setSearchResults(data.results); setShowDropdown(true); }
        else { setShowDropdown(false); }
      } catch { /* silent */ }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectResult = (entity: any) => {
    setSearchQuery(entity.name); setShowDropdown(false); setShowSearch(true); setSearchResults([entity]);
  };

  const TABS: { id: MainTab; label: string }[] = [
    { id: "scores", label: "Scores" }, { id: "news", label: "News" }, { id: "scout", label: "Scout AI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, maxWidth: 680, margin: "0 auto" }}>
      <style>{`
        @keyframes live-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{opacity:.7;box-shadow:0 0 0 5px rgba(239,68,68,0)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .animate-in { animation: fade-up .18s ease-out both; }
        .dots { display:inline-flex; gap:3px; }
        .dots span { display:inline-block; width:5px; height:5px; border-radius:50%; background:#66FCF1; animation:db 1.2s infinite; }
        .dots span:nth-child(2){animation-delay:.18s} .dots span:nth-child(3){animation-delay:.36s}
        @keyframes db { 0%,80%,100%{transform:scale(.5);opacity:.3} 40%{transform:scale(1);opacity:1} }
        .form-dot { width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:'Space Grotesk',sans-serif; }
        .form-w{background:rgba(34,197,94,.18);color:#22c55e;border:1px solid rgba(34,197,94,.35)}
        .form-d{background:rgba(197,198,199,.1);color:rgba(197,198,199,.55);border:1px solid rgba(197,198,199,.2)}
        .form-l{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.28)}
        input::placeholder{color:rgba(197,198,199,0.35)}
        ::-webkit-scrollbar{width:3px;height:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#26303d;border-radius:2px}
      `}</style>
      
      {/* Top nav */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "0 14px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", height: 50, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: C.cyan, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.obsidian, letterSpacing: "-1px" }}>IQ</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ice, letterSpacing: "-.3px" }}>PitchIQ</span>
          </div>
          
          <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.iceDim, fontSize: 14, pointerEvents: "none" }}>⌕</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search players, clubs…"
              style={{ width: "100%", background: C.c3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "7px 10px 7px 28px", fontSize: 12, color: C.ice, outline: "none", fontFamily: "'Space Grotesk',sans-serif" }} />
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 200 }}>
                {searchResults.map((r, i) => (
                  <div key={i} onClick={() => selectResult(r)}
                    style={{ padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
                    {r.logo
                      ? <img src={r.logo} alt="" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 4 }} onError={e => (e.currentTarget.style.display = "none")} />
                      : <div style={{ width: 26, height: 26, borderRadius: 4, background: C.c3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.iceDim }}>{r.type === "player" ? "P" : "C"}</div>
                    }
                    <div>
                      <div style={{ fontSize: 13, color: C.ice, fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.iceDim }}>{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setMainTab(t.id); setShowSearch(false); setSearchQuery(""); }}
              style={{ flex: 1, padding: "9px 8px", fontSize: 13, fontWeight: mainTab === t.id && !showSearch ? 600 : 400, fontFamily: "'Space Grotesk',sans-serif", color: mainTab === t.id && !showSearch ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${mainTab === t.id && !showSearch ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .12s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {showSearch ? (
        <div style={{ padding: "10px 14px" }}>
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            style={{ fontSize: 12, color: C.cyan, background: "none", border: "none", cursor: "pointer", marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>
            ← Back
          </button>
          {searchResults.map((r, i) => <SearchResult key={i} entity={r} />)}
        </div>
      ) : (
        <>
          {mainTab === "scores" && <ScoresPanel />}
          {mainTab === "news" && <NewsPanel />}
          {mainTab === "scout" && <ScoutPanel />}
        </>
      )}
    </div>
  );
}