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

const ratingColor = (r: number) => r >= 7.5 ? C.green : r >= 6.5 ? C.amber : C.red;
const ratingBg = (r: number) => r >= 7.5 ? "rgba(34,197,94,0.15)" : r >= 6.5 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";

// ─── Tiny shared UI ───────────────────────────────────────────────────────────
function Dots() {
  return (
    <span className="dots">
      <span /><span /><span />
    </span>
  );
}

function LiveDot() {
  return <span className="live-dot" style={{ display: "inline-block", width: 8, height: 8, background: C.red, borderRadius: "50%", animation: "pulse 1.5s infinite" }} />;
}

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color, background: bg, letterSpacing: ".4px" }}>
      {label}
    </span>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".9px", color: C.cyan, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </div>
  );
}

function StatRow({ label, hv, av }: { label: string; hv: number; av: number }) {
  const tot = hv + av || 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, minWidth: 28, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{hv}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <div className="stat-track" style={{ flex: 1, height: 6, background: C.c3, borderRadius: 3, overflow: "hidden" }}>
          <div className="stat-fill-l" style={{ width: `${Math.round((hv / tot) * 100)}%`, height: "100%", background: C.cyan }} />
        </div>
        <span style={{ fontSize: 10, color: C.iceDim, textAlign: "center", minWidth: 100, flexShrink: 0 }}>{label}</span>
        <div className="stat-track" style={{ flex: 1, height: 6, background: C.c3, borderRadius: 3, overflow: "hidden" }}>
          <div className="stat-fill-r" style={{ width: `${Math.round((av / tot) * 100)}%`, height: "100%", background: C.blue }} />
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, minWidth: 28, fontFamily: "'JetBrains Mono', monospace" }}>{av}</span>
    </div>
  );
}

// ─── Date navigation ──────────────────────────────────────────────────────────
function buildDates() {
  const today = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const labels = ["−3 days", "−2 days", "Yesterday", "Today", "Tomorrow", "+2 days", "+3 days", "+4 days"];
    return { key, label: labels[i], isToday: i === 3 };
  });
}

// ─── Match expanded tabs ───────────────────────────────────────────────────────
type MatchTab = "preview" | "lineup" | "commentary" | "stats" | "table" | "review";

function MatchExpanded({ match, cache, onLoadTab }: { match: any; cache: Record<string, unknown>; onLoadTab: (tab: MatchTab) => void; }) {
  const isFinal = match.status === "final";
  const tabs: { id: MatchTab; label: string }[] = isFinal
    ? [{ id: "review", label: "Review" }, { id: "lineup", label: "Lineups" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }]
    : [{ id: "preview", label: "Preview" }, { id: "lineup", label: "Lineups" }, { id: "commentary", label: "Commentary" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }];

  const defaultTab: MatchTab = isFinal ? "review" : "preview";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab, cache, onLoadTab]);

  const data = cache[activeTab] as Record<string, any> | undefined;

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.c2 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flexShrink: 0, padding: "10px 16px", fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: activeTab === t.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 14px", minHeight: 80 }}>
        {!data ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.iceDim, fontSize: 13 }}>
            <Dots /> AI analyzing live data…
          </div>
        ) : (
          <TabContent match={match} tab={activeTab} data={data} />
        )}
      </div>
    </div>
  );
}

function TabContent({ match, tab, data }: { match: any; tab: MatchTab; data: any }) {
  if (tab === "preview") {
    return (
      <div className="animate-in">
        <SectionLabel>AI Prediction</SectionLabel>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.ice, letterSpacing: 8, marginBottom: 8 }}>{data.prediction || "—"}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {[{ label: `${match.home.split(" ")[0]} ${data.homeWin || 45}%`, bg: "rgba(102,252,241,0.12)", color: C.cyan },
              { label: `Draw ${data.draw || 25}%`, bg: C.iceFaint, color: C.iceDim },
              { label: `${match.away.split(" ").slice(-1)[0]} ${data.awayWin || 30}%`, bg: "rgba(96,165,250,0.12)", color: C.blue }]
              .map(p => <span key={p.label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 20, color: p.color, background: p.bg }}>{p.label}</span>)}
          </div>
        </div>
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Predicted Scorers</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, marginBottom: 4 }}>{data.homeScorerPred || `• ${match.home}: Striker (Expected 34')`}</div>
        <div style={{ fontSize: 13, color: C.ice, marginBottom: 12 }}>{data.awayScorerPred || `• ${match.away}: Attacking Midfield (Expected 61')`}</div>
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Head to Head</SectionLabel>
        {(data.h2h || []).map((h: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
            <span style={{ color: C.iceDim, minWidth: 60 }}>{h.date}</span>
            <span style={{ flex: 1, color: C.ice }}>{h.result}</span>
            <span style={{ fontWeight: 700, color: h.winner === "home" ? C.cyan : h.winner === "away" ? C.blue : C.iceDim }}>{h.winner === "draw" ? "D" : h.winner === "home" ? "W" : "L"}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Reasoning</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.cyan}`, paddingLeft: 12 }}>{data.reasoning || "Analytical models predict structural vulnerabilities in defensive transition matrices."}</div>
      </div>
    );
  }

  if (tab === "lineup") {
    // Helper engine to convert API coordinate metrics ("line:column") to responsive absolute layout percentages
    const parseCoordinates = (gridStr: string, isAway: boolean) => {
      if (!gridStr) return { top: "50%", left: "50%" };
      const [line, col] = gridStr.split(":").map(Number);
      
      // Calculate row positioning across the field halves
      let topPercent = ((line - 1) / 4) * 85 + 8;
      if (isAway) topPercent = 100 - topPercent; // Reverse mapping sequence for opponents

      const leftPercent = ((col - 1) / 4) * 76 + 12;
      return { top: `${topPercent}%`, left: `${leftPercent}%` };
    };

    return (
      <div className="animate-in" style={{ background: "#111612", borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12, fontWeight: 700 }}>
          <span style={{ color: C.cyan }}>{match.home} ({data.homeFormation})</span>
          <span style={{ color: C.blue }}>{data.awayFormation} ({match.away})</span>
        </div>

        {/* ─── GRAPHICAL FOOTBALL FIELD CANVAS CONTAINER ─── */}
        <div style={{ position: "relative", width: "100%", height: 420, background: "#1e2e1c", borderRadius: 8, border: "2px solid rgba(255,255,255,0.1)", overflow: "hidden", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 50%, transparent 50%)", backgroundSize: "100% 40px" }}>
          {/* Center Field Markings Line stripe */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%" }} />

          {/* HOME TEAM NODES (Top Half Grid Map) */}
          {(data.homeLineup || []).map((p: any, i: number) => {
            const coords = parseCoordinates(p.grid || `1:${i+1}`, false);
            return (
              <div key={i} style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}>
                <div style={{ position: "relative", width: 28, height: 28, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {p.num}
                  {/* Floating Performance Pill Badge */}
                  <span style={{ position: "absolute", top: -6, right: -12, fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 4, background: ratingBg(p.rating || 6.5), color: ratingColor(p.rating || 6.5), scale: "0.85" }}>
                    {(p.rating || 6.5).toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: 9, color: C.ice, fontWeight: 600, marginTop: 3, textShadow: "1px 1px 3px #000", whiteSpace: "nowrap", maxWidth: 65, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split(" ").pop()}</span>
              </div>
            );
          })}

          {/* AWAY TEAM NODES (Bottom Half Grid Map) */}
          {(data.awayLineup || []).map((p: any, i: number) => {
            const coords = parseCoordinates(p.grid || `4:${i+1}`, true);
            return (
              <div key={i} style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}>
                <div style={{ position: "relative", width: 28, height: 28, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {p.num}
                  <span style={{ position: "absolute", top: -6, right: -12, fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 4, background: ratingBg(p.rating || 6.5), color: ratingColor(p.rating || 6.5), scale: "0.85" }}>
                    {(p.rating || 6.5).toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: 9, color: C.ice, fontWeight: 600, marginTop: 3, textShadow: "1px 1px 3px #000", whiteSpace: "nowrap", maxWidth: 65, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split(" ").pop()}</span>
              </div>
            );
          })}
        </div>

        {/* Traditional Vertical Scroll List below the field */}
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel style={{ color: C.cyan }}>{match.home} Squad</SectionLabel>
            {(data.homeLineup || []).map((p: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span><span style={{ color: C.iceDim, marginRight: 6 }}>{p.num}</span> {p.name}</span>
                <span style={{ fontWeight: 700, color: ratingColor(p.rating || 6.5) }}>{(p.rating || 6.5).toFixed(1)}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel style={{ color: C.blue }}>{match.away} Squad</SectionLabel>
            {(data.awayLineup || []).map((p: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span><span style={{ color: C.iceDim, marginRight: 6 }}>{p.num}</span> {p.name}</span>
                <span style={{ fontWeight: 700, color: ratingColor(p.rating || 6.5) }}>{(p.rating || 6.5).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === "review") {
    return (
      <div className="animate-in">
        {data.manOfMatch && (
          <div style={{ background: "rgba(102,252,241,0.08)", border: `1px solid ${C.cyanBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <div>
              <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Man of the Match</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ice }}>{data.manOfMatch}</div>
            </div>
          </div>
        )}
        <SectionLabel>Goal Scorers</SectionLabel>
        {(data.scorers || []).map((s: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
            <span style={{ color: C.cyan, fontWeight: 700, minWidth: 28, fontFamily: "'JetBrains Mono', monospace" }}>{s.minute}'</span>
            <div>
              <div style={{ color: C.ice, fontWeight: 500 }}>{s.name}</div>
              <div style={{ color: C.iceDim }}>{s.type}{s.assist ? ` · Assist: ${s.assist}` : ""} · {s.team}</div>
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Player Ratings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {(data.ratings || []).map((r: any, i: number) => (
            <div key={i} style={{ background: C.c3, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: C.ice }}>{r.name}</div>
                <div style={{ fontSize: 10, color: C.iceDim }}>{r.pos} · {r.team}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ratingColor(r.rating), background: ratingBg(r.rating), width: 36, height: 36, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>{r.rating}</div>
            </div>
          ))}
        </div>
        <SectionLabel>Tactical Review</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.65 }}>{data.reviewText || "Match concluded. Analysis compiling..."}</div>
      </div>
    );
  }

  if (tab === "commentary") {
    const typeStyle: Record<string, { color: string }> = { goal: { color: C.cyan }, card: { color: C.amber }, chance: { color: C.blue }, normal: { color: C.ice } };
    return (
      <div className="animate-in">
        {(data.events || [{min: "45", text: "Match telemetry streaming active.", type: "normal"}]).map((e: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, minWidth: 32, paddingTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{e.min}&apos;</span>
            <span style={{ fontSize: 13, lineHeight: 1.55, ...(typeStyle[e.type] || typeStyle.normal) }}>
              {e.type === "goal" && "⚽ "}{e.text}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "stats") {
    return (
      <div className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 11, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px" }}>
          <span>{match.home}</span><span>{match.away}</span>
        </div>
        {[
          ["Possession %", data.possession?.home || 50, data.possession?.away || 50],
          ["Shots", data.shots?.home || 0, data.shots?.away || 0],
          ["Shots on target", data.shotsOnTarget?.home || 0, data.shotsOnTarget?.away || 0],
          ["Big chances", data.bigChances?.home || 0, data.bigChances?.away || 0],
          ["Big chances missed", data.bigChancesMissed?.home || 0, data.bigChancesMissed?.away || 0],
          ["Passes", data.passes?.home || 0, data.passes?.away || 0],
          ["Pass accuracy %", data.passAccuracy?.home || 0, data.passAccuracy?.away || 0],
          ["Fouls", data.fouls?.home || 0, data.fouls?.away || 0],
          ["Offsides", data.offsides?.home || 0, data.offsides?.away || 0],
          ["Corners", data.corners?.home || 0, data.corners?.away || 0],
          ["Yellow cards", data.yellowCards?.home || 0, data.yellowCards?.away || 0],
          ["Red cards", data.redCards?.home || 0, data.redCards?.away || 0],
          ["xG", data.xG?.home || 0, data.xG?.away || 0],
        ].map(([l, h, a]) => <StatRow key={l as string} label={l as string} hv={h as number} av={a as number} />)}
      </div>
    );
  }

  if (tab === "table") {
    return (
      <div className="animate-in">
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 28px 28px 28px 28px 36px", gap: 4, padding: "4px 0 8px", borderBottom: `1px solid ${C.border2}`, fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px" }}>
          <span style={{ textAlign: "center" }}>#</span><span>Club</span><span style={{ textAlign: "center" }}>P</span><span style={{ textAlign: "center" }}>W</span><span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>L</span><span style={{ textAlign: "center" }}>Pts</span>
        </div>
        {(data.teams || []).map((t: any) => {
          const isHighlighted = t.name === match.home || t.name === match.away;
          return (
            <div key={t.pos} style={{ display: "grid", gridTemplateColumns: "28px 1fr 28px 28px 28px 28px 36px", gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center", background: isHighlighted ? "rgba(102,252,241,0.04)" : "transparent", borderRadius: isHighlighted ? 4 : 0 }}>
              <span style={{ textAlign: "center", color: isHighlighted ? C.cyan : C.iceDim, fontWeight: isHighlighted ? 700 : 400 }}>{t.pos}</span>
              <span style={{ color: isHighlighted ? C.cyan : C.ice, fontWeight: isHighlighted ? 600 : 400 }}>{t.name}</span>
              <span style={{ textAlign: "center", color: C.iceDim }}>{t.played}</span>
              <span style={{ textAlign: "center", color: C.iceDim }}>{t.won}</span>
              <span style={{ textAlign: "center", color: C.iceDim }}>{t.drawn}</span>
              <span style={{ textAlign: "center", color: C.iceDim }}>{t.lost}</span>
              <span style={{ textAlign: "center", fontWeight: 700, color: C.ice }}>{t.pts}</span>
            </div>
          );
        })}
        {!(data.teams && data.teams.length > 0) && <div style={{ padding: 12, fontSize: 11, color: C.iceDim, textAlign: "center" }}>Table standings currently syncing...</div>}
      </div>
    );
  }

  return null;
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, unknown>>({});

  const loadTab = useCallback(async (tab: MatchTab) => {
    if (tabCache[tab]) return;
    try {
      const res = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match, type: tab }) });
      const { data } = await res.json();
      setTabCache(prev => ({ ...prev, [tab]: data }));
    } catch { setTabCache(prev => ({ ...prev, [tab]: { _error: true } })); }
  }, [match, tabCache]);

  const isFinal = match.status === "final";
  const isLive = match.status === "live";
  const winH = isFinal && match.score.home > match.score.away;
  const winA = isFinal && match.score.away > match.score.home;
  const ph = match.prob?.home ?? 45, pd = match.prob?.draw ?? 25, pa = match.prob?.away ?? 30;

  return (
    <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${expanded ? C.cyanBorder : C.border}`, overflow: "hidden", marginBottom: 4, transition: "border-color .15s", cursor: "pointer" }}
      onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", alignItems: "center", gap: 8, padding: "12px 14px" }}>
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {match.homeLogo ? (
            <img src={match.homeLogo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} onError={(e)=>(e.currentTarget.style.display='none')} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.iceDim, flexShrink: 0 }}>{match.homeAbbr}</div>
          )}
          <span style={{ fontSize: 13, fontWeight: 500, color: winA ? C.iceDim : C.ice, lineHeight: 1.2 }}>{match.home}</span>
        </div>
        {/* Middle */}
        <div style={{ textAlign: "center" }}>
          {isFinal ? (
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ice, letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace" }}>{match.score.home}–{match.score.away}</div>
          ) : isLive ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <LiveDot />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.red, fontFamily: "'JetBrains Mono', monospace" }}>{match.liveMin || "45"}&apos;</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.iceDim }}>vs</div>
              <div style={{ fontSize: 11, color: C.iceDim }}>{match.kick?.replace("KO · ", "") || ""}</div>
            </>
          )}
        </div>
        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse" }}>
          {match.awayLogo ? (
            <img src={match.awayLogo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} onError={(e)=>(e.currentTarget.style.display='none')} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.iceDim, flexShrink: 0 }}>{match.awayAbbr}</div>
          )}
          <span style={{ fontSize: 13, fontWeight: 500, color: winH ? C.iceDim : C.ice, textAlign: "right", lineHeight: 1.2 }}>{match.away}</span>
        </div>
      </div>
      <div className="prob-strip" style={{ display: "flex", height: 3 }}>
        <div style={{ width: `${ph}%`, background: C.cyan }} />
        <div style={{ width: `${pd}%`, background: C.iceDim }} />
        <div style={{ width: `${pa}%`, background: C.blue }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 14px 6px", fontSize: 10, color: C.iceDim }}>
        <span>{ph}% {match.homeAbbr}</span><span>{pd}% Draw</span><span>{pa}% {match.awayAbbr}</span>
      </div>
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── Live Scores panel ────────────────────────────────────────────────────────
function ScoresPanel() {
  const dates = buildDates();
  const [selectedDate, setSelectedDate] = useState(dates.find(d => d.isToday)?.key || new Date().toISOString().split("T")[0]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // League prioritization list
  const IMPORTANT_LEAGUES = [
    "world cup", "premier league", "champions league", "la liga", 
    "serie a", "bundesliga", "ligue 1", "mls", "primera division", "copa america"
  ];

  useEffect(() => {
    let active = true;
    
    async function fetchLive(isInitialLoad = false) {
      // Only flash the loading indicator on the very first page mount
      if (isInitialLoad) setLoading(true);
      
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`);
        const data = await res.json();
        if (active && data.matches) {
          // Sort to pin major leagues at the top
          const sorted = data.matches.sort((a: any, b: any) => {
            const aIsMajor = IMPORTANT_LEAGUES.some(l => (a.leagueName || a.league).toLowerCase().includes(l)) ? 1 : 0;
            const bIsMajor = IMPORTANT_LEAGUES.some(l => (b.leagueName || b.league).toLowerCase().includes(l)) ? 1 : 0;
            return bIsMajor - aIsMajor;
          });
          setMatches(sorted);
        }
      } catch (e) { console.error(e); }
      
      if (isInitialLoad) setLoading(false);
    }

    // 1. Initial load shows the visible spinner
    fetchLive(true);

    // 2. SILENT BACKGROUND UPDATE: Polls quietly every 30 seconds
    // Overwrites numbers behind the scenes without blanking out the UI
    const interval = setInterval(() => {
      fetchLive(false); 
    }, 30000); 

    return () => { active = false; clearInterval(interval); };
  }, [selectedDate]);

  const byLeague: Record<string, any[]> = {};
  matches.forEach(m => { 
    const key = m.leagueName || m.league;
    if (!byLeague[key]) byLeague[key] = []; 
    byLeague[key].push(m); 
  });

  return (
    <div>
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map(d => (
          <button key={d.key} onClick={() => setSelectedDate(d.key)}
            style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: selectedDate === d.key ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: selectedDate === d.key ? "#0B0C10" : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "4px 12px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: C.iceDim, fontSize: 13 }}><Dots /> Syncing live feed...</div>
        ) : !matches.length ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: C.iceDim, fontSize: 13 }}>No matches found for this date.</div>
        ) : (
          Object.entries(byLeague).map(([lg, ms]) => (
            <div key={lg} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 8px" }}>
                {ms[0].leagueLogo ? (
                  <img src={ms[0].leagueLogo} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: 3, background: C.charcoal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{lg.substring(0,2).toUpperCase()}</div>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: C.iceDim }}>{lg}</span>
                <span style={{ fontSize: 11, color: C.iceDim, marginLeft: "auto" }}>{ms.length} match{ms.length > 1 ? "es" : ""}</span>
              </div>
              {ms.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Live RSS News panel ──────────────────────────────────────────────────────
function NewsPanel() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (data.news) setNews(data.news);
      } catch {}
      setLoading(false);
    }
    fetchNews();
  }, []);

  return (
    <div style={{ padding: 14 }}>
      <SectionLabel>Live Transfers & Football Feed</SectionLabel>
      {loading ? <div style={{ color: C.iceDim }}><Dots /> Fetching live streams...</div> : news.map((n, i) => (
        <div key={i} style={{ padding: "14px 14px", borderBottom: `1px solid ${C.border}`, background: n.confirmed ? "rgba(102,252,241,0.03)" : "transparent", borderLeft: n.confirmed ? `3px solid ${C.cyan}` : "3px solid transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: ".5px" }}>{n.source}</span>
            {n.confirmed && <Tag label="Confirmed" color={C.cyan} bg="rgba(102,252,241,0.1)" />}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.ice, lineHeight: 1.4, marginBottom: 5 }}>
            {n.tag === "done" && <Tag label="Done Deal" color={C.cyan} bg="rgba(102,252,241,0.12)" />}
            {n.tag === "rumor" && <Tag label="Rumor" color={C.amber} bg="rgba(245,158,11,0.12)" />}
            {" "}{n.headline}
          </div>
          <div style={{ fontSize: 12, color: C.iceDim, lineHeight: 1.55 }}>{n.snippet}</div>
          <div style={{ fontSize: 10, color: C.iceDim, marginTop: 6 }}>{n.time}</div>
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
    setLoading(true); setReport(null); setInput(name);
    try {
      const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const { report: r } = await res.json();
      setReport(r);
    } catch { setReport({ _error: true }); }
    setLoading(false);
  };

  const findSimilar = async () => {
    if (!simInput.trim()) return;
    setSimLoading(true); setSimResult("");
    try {
      const res = await fetch("/api/similar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: simInput }) });
      const { result } = await res.json();
      setSimResult(result);
    } catch { setSimResult("Could not load. Try again."); }
    setSimLoading(false);
  };

  const rc = (v: number) => v >= 80 ? C.cyan : v >= 65 ? C.amber : C.red;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ice, marginBottom: 3 }}>Scout AI</div>
        <div style={{ fontSize: 12, color: C.iceDim }}>Stars, hidden gems, lower-league wonderkids — global scouting powered by AI</div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && scout(input)}
          placeholder="Search any player worldwide…"
          style={{ flex: 1, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.ice, outline: "none", fontFamily: "'Space Grotesk', sans-serif" }} />
        <button onClick={() => scout(input)} disabled={loading}
          style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.cyan}`, background: loading ? C.c3 : C.cyanDim, color: C.cyan, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all .15s" }}>
          {loading ? <Dots /> : "Scout"}
        </button>
      </div>

      {/* Quick chips */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Hidden Gems</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {gems.map(g => (
            <button key={g} onClick={() => scout(g)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 14, border: `1px solid rgba(102,252,241,0.3)`, background: "rgba(102,252,241,0.07)", color: C.cyan, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>💎 {g}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>World Class</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {stars.map(s => (
            <button key={s} onClick={() => scout(s)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 14, border: `1px solid ${C.border2}`, background: C.c3, color: C.ice, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Similarity search */}
      <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Find me a player like…</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={simInput} onChange={e => setSimInput(e.target.value)} onKeyDown={e => e.key === "Enter" && findSimilar()}
            placeholder="e.g. a younger Pirlo, budget Haaland, faster Thiago…"
            style={{ flex: 1, background: C.c3, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.ice, outline: "none", fontFamily: "'Space Grotesk', sans-serif" }} />
          <button onClick={findSimilar} disabled={simLoading}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid rgba(96,165,250,0.3)`, background: "rgba(96,165,250,0.1)", color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
            {simLoading ? <Dots /> : "Find"}
          </button>
        </div>
        {simResult && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.blue}`, paddingLeft: 10 }}>{simResult}</div>
        )}
      </div>

      {/* Scout result */}
      {loading && (
        <div style={{ background: C.charcoal, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, textAlign: "center", color: C.iceDim, fontSize: 13 }}>
          <Dots /> <span style={{ marginLeft: 8 }}>Scouting player…</span>
        </div>
      )}
      {report && !loading && (
        <div className="animate-in" style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 14px", background: `linear-gradient(135deg, #0a1e12, #0f2e1c, #143d23)`, display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.cyanBorder}` }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(102,252,241,0.15)", border: `2px solid ${C.cyanBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.cyan, flexShrink: 0 }}>
              {String(report.name).split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.ice }}>{String(report.name)}</div>
              <div style={{ fontSize: 11, color: C.iceDim }}>{String(report.position)} · {String(report.club)} · {String(report.age)}</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{String(report.overall || 82)}</div>
          </div>
          
          <div style={{ padding: "14px" }}>
            <SectionLabel>Playing Style</SectionLabel>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 12 }}>{String(report.style)}</p>
            <SectionLabel>Scout Verdict</SectionLabel>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 14 }}>{String(report.verdict)}</p>
            
            <a href={report.ytLink || `https://www.youtube.com/results?search_query=${encodeURIComponent(String(report.ytQuery || report.name + ' highlights'))}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.ice, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              <span style={{ color: "#ef4444", fontSize: 18 }}>▶</span> Watch {String(report.name)} highlights
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Search panel ─────────────────────────────────────────────────────────────
function SearchResult({ entity }: { entity: any }) {
  const d = entity.detail || {};
  const typeColor = entity.type === "player" ? C.cyan : entity.type === "club" ? C.amber : C.green;
  const typeBg = entity.type === "player" ? "rgba(102,252,241,0.1)" : entity.type === "club" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)";

  return (
    <div className="animate-in" style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        {entity.logo ? (
          <img src={entity.logo} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: typeColor, flexShrink: 0 }}>
            {entity.name.substring(0,2).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{entity.name}</span>
            <Tag label={entity.type} color={typeColor} bg={typeBg} />
          </div>
          <div style={{ fontSize: 12, color: C.iceDim }}>{entity.sub}</div>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, color: C.iceDim }}>Connect Claude API to render full deep-dive stats matrix for {entity.name}.</div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
type MainTab = "scores" | "news" | "scout";

export default function PitchIQ() {
  const [mainTab, setMainTab] = useState<MainTab>("scores");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) { setSearchResults([]); setShowDropdown(false); return; }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) { setSearchResults(data.results); setShowDropdown(data.results.length > 0); }
      } catch {}
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSelect = (entity: any) => {
    setSearchQuery(entity.name);
    setShowDropdown(false);
    setShowSearch(true);
    setSearchResults([entity]);
  };

  const TABS: { id: MainTab; label: string }[] = [
    { id: "scores", label: "Scores" },
    { id: "news", label: "News" },
    { id: "scout", label: "Scout AI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, maxWidth: 680, margin: "0 auto" }}>
      {/* Top nav */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "0 14px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", height: 50, gap: 12 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: C.cyan, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.obsidian, letterSpacing: "-1px" }}>IQ</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ice, letterSpacing: "-.3px" }}>PitchIQ</span>
          </div>
          {/* Search */}
          <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.iceDim, fontSize: 14, pointerEvents: "none" }}>⌕</div>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search live clubs, countries…"
              style={{ width: "100%", background: C.c3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "7px 10px 7px 28px", fontSize: 12, color: C.ice, outline: "none", fontFamily: "'Space Grotesk', sans-serif", transition: "border .15s" }} />
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 200 }}>
                {searchResults.map((r, idx) => (
                  <div key={idx} onClick={() => handleSearchSelect(r)}
                    style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
                    {r.logo ? (
                      <img src={r.logo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: C.c3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.iceDim }}>{r.type.substring(0,1).toUpperCase()}</div>
                    )}
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
        {/* Main tabs */}
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setMainTab(t.id); setShowSearch(false); }}
              style={{ flex: 1, padding: "10px 8px", fontSize: 13, fontWeight: mainTab === t.id && !showSearch ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: mainTab === t.id && !showSearch ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${mainTab === t.id && !showSearch ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {showSearch ? (
        <div style={{ padding: "12px 14px" }}>
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.cyan, background: "none", border: "none", cursor: "pointer", marginBottom: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
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