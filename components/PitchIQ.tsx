"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
interface Match {
  id: string;
  status: "scheduled" | "live" | "final";
  liveMin?: string | number;
  kick: string;
  league: string;
  leagueName: string;
  leagueLogo?: string;
  home: string;
  homeAbbr: string;
  homeLogo?: string;
  away: string;
  awayAbbr: string;
  awayLogo?: string;
  score: { home: number; away: number };
  prob?: { home: number; draw: number; away: number };
}

interface PlayerNode {
  name: string;
  num: number;
  grid: string; // e.g., "1:1" (GK), "4:2" (ST)
  rating?: number;
}

type MatchTab = "preview" | "lineup" | "commentary" | "stats" | "table" | "review";
type MainTab = "scores" | "news" | "scout";

// ─── Design Tokens (Cyber-Styled) ─────────────────────────────────────────────
const C = {
  obsidian: "#07090C", charcoal: "#121820", c2: "#1A222D", c3: "#232D3B", c4: "#2D3A4C",
  cyan: "#00F0FF", cyanDim: "rgba(0,240,255,0.1)", cyanBorder: "rgba(0,240,255,0.3)",
  ice: "#E2E8F0", iceDim: "#94A3B8", iceFaint: "rgba(148,163,184,0.1)",
  green: "#39FF14", red: "#FF003C", amber: "#FFB000", blue: "#0066FF",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.12)",
  glow: "0 0 10px rgba(0,240,255,0.2), 0 0 20px rgba(0,240,255,0.1)",
};

const ratingColor = (r: number) => r >= 7.5 ? C.green : r >= 6.5 ? C.amber : C.red;
const ratingBg = (r: number) => r >= 7.5 ? "rgba(57,255,20,0.15)" : r >= 6.5 ? "rgba(255,176,0,0.15)" : "rgba(255,0,60,0.15)";

// ─── Shared UI Components ─────────────────────────────────────────────────────
function Dots() {
  return <span className="dots"><span /><span /><span /></span>;
}

function LiveDot() {
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, background: C.red, borderRadius: "50%", boxShadow: `0 0 8px ${C.red}`, animation: "pulse 1.5s infinite" }} />
  );
}

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color, background: bg, letterSpacing: ".4px", border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.cyan, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,240,255,0.3)", ...style }}>
      {children}
    </div>
  );
}

function StatRow({ label, hv, av }: { label: string; hv: number; av: number }) {
  const tot = hv + av || 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, minWidth: 28, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{hv}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: C.c3, borderRadius: 2, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: `${Math.round((hv / tot) * 100)}%`, height: "100%", background: C.cyan, boxShadow: `0 0 5px ${C.cyan}` }} />
        </div>
        <span style={{ fontSize: 10, color: C.iceDim, textAlign: "center", minWidth: 110, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <div style={{ flex: 1, height: 4, background: C.c3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${Math.round((av / tot) * 100)}%`, height: "100%", background: C.blue, boxShadow: `0 0 5px ${C.blue}` }} />
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, minWidth: 28, fontFamily: "'JetBrains Mono', monospace" }}>{av}</span>
    </div>
  );
}

// ─── Date Navigation ──────────────────────────────────────────────────────────
function buildDates() {
  const today = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const labels = ["−3 Days", "−2 Days", "Yesterday", "Today", "Tomorrow", "+2 Days", "+3 Days", "+4 Days"];
    return { key, label: labels[i], isToday: i === 3 };
  });
}

// ─── Match Expanded Tabs ──────────────────────────────────────────────────────
function MatchExpanded({ match, cache, onLoadTab }: { match: Match; cache: Record<string, any>; onLoadTab: (tab: MatchTab) => void; }) {
  const isFinal = match.status === "final";
  const tabs: { id: MatchTab; label: string }[] = isFinal
    ? [{ id: "review", label: "Review" }, { id: "lineup", label: "Lineups" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }]
    : [{ id: "preview", label: "Preview" }, { id: "lineup", label: "Lineups" }, { id: "commentary", label: "Live Feed" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }];

  const defaultTab: MatchTab = isFinal ? "review" : "preview";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab, cache, onLoadTab]);

  const data = cache[activeTab];

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.c2 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flexShrink: 0, padding: "12px 16px", fontSize: 12, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .2s", textTransform: "uppercase", letterSpacing: "0.5px", textShadow: activeTab === t.id ? "0 0 8px rgba(0,240,255,0.4)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 14px", minHeight: 100 }}>
        {!data ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, gap: 10, color: C.cyan, fontSize: 12, textTransform: "uppercase", letterSpacing: "1px" }}>
            <Dots /> AI Processing Telemetry...
          </div>
        ) : (
          <TabContent match={match} tab={activeTab} data={data} />
        )}
      </div>
    </div>
  );
}

function TabContent({ match, tab, data }: { match: Match; tab: MatchTab; data: any }) {
  if (tab === "preview") {
    return (
      <div className="animate-in">
        <SectionLabel>AI Prediction Matrix</SectionLabel>
        <div style={{ textAlign: "center", marginBottom: 16, background: C.charcoal, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: C.cyan, letterSpacing: 8, marginBottom: 12, textShadow: C.glow }}>
            {data.prediction || "—"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {[{ label: `${match.homeAbbr} ${data.homeWin || 45}%`, bg: C.cyanDim, color: C.cyan },
              { label: `DRAW ${data.draw || 25}%`, bg: C.iceFaint, color: C.iceDim },
              { label: `${match.awayAbbr} ${data.awayWin || 30}%`, bg: "rgba(0,102,255,0.15)", color: C.blue }]
              .map(p => <span key={p.label} style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 4, color: p.color, background: p.bg, border: `1px solid ${p.color}40` }}>{p.label}</span>)}
          </div>
        </div>
        
        <SectionLabel>Expected Scorers</SectionLabel>
        <div style={{ background: C.charcoal, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.ice, marginBottom: 8, display: "flex", gap: 8 }}><span style={{color: C.cyan}}>▶</span> {data.homeScorerPred || `${match.home}: Striker (Expected 34')`}</div>
          <div style={{ fontSize: 13, color: C.ice, display: "flex", gap: 8 }}><span style={{color: C.blue}}>▶</span> {data.awayScorerPred || `${match.away}: Attacking Midfield (Expected 61')`}</div>
        </div>

        <SectionLabel>Tactical Reasoning</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.cyan}`, paddingLeft: 12, background: `linear-gradient(90deg, ${C.cyanDim}, transparent)`, padding: "10px 12px" }}>
          {data.reasoning || "Analytical models predict structural vulnerabilities in defensive transition matrices."}
        </div>
      </div>
    );
  }

  if (tab === "lineup") {
    // Advanced coordinate parser for absolute positioning on the tactical pitch
    const parseCoordinates = (gridStr: string, isAway: boolean) => {
      if (!gridStr) return { top: "50%", left: "50%" };
      const [line, col] = gridStr.split(":").map(Number);
      
      // Map lines 1 (GK) to 4 (FWD) across the vertical pitch
      let topPercent = ((line - 1) / 3) * 40 + 8; // 8% to 48% for home half
      if (isAway) topPercent = 100 - topPercent; // 92% to 52% for away half

      // Distribute columns horizontally
      // Assuming max 5 players in a line for centering math
      const maxColsInLine = 5; 
      const leftPercent = 50 + ((col - (maxColsInLine / 2 + 0.5)) * 18); 
      
      return { top: `${topPercent}%`, left: `${leftPercent}%` };
    };

    return (
      <div className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
          <span style={{ color: C.cyan, textShadow: `0 0 5px ${C.cyan}` }}>{match.homeAbbr} ({data.homeFormation || "4-3-3"})</span>
          <span style={{ color: C.blue, textShadow: `0 0 5px ${C.blue}` }}>{data.awayFormation || "4-2-3-1"} ({match.awayAbbr})</span>
        </div>

        {/* ─── TACTICAL PITCH CANVAS ─── */}
        <div style={{ position: "relative", width: "100%", height: 500, background: "#0A1410", borderRadius: 8, border: `2px solid ${C.border2}`, overflow: "hidden", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.02) 48px, rgba(255,255,255,0.02) 96px)" }}>
          {/* Pitch Markings */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.2)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 90, height: 90, border: "2px solid rgba(255,255,255,0.2)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 6, height: 6, background: "rgba(255,255,255,0.4)", borderRadius: "50%" }} />
          
          {/* Penalty Areas */}
          <div style={{ position: "absolute", top: -2, left: "20%", right: "20%", height: "15%", border: "2px solid rgba(255,255,255,0.2)", borderTop: "none" }} />
          <div style={{ position: "absolute", bottom: -2, left: "20%", right: "20%", height: "15%", border: "2px solid rgba(255,255,255,0.2)", borderBottom: "none" }} />

          {/* HOME NODES */}
          {(data.homeLineup || Array(11).fill({name: "Player", num: 0, grid: "1:3"})).map((p: PlayerNode, i: number) => {
            const coords = parseCoordinates(p.grid || `1:${(i%5)+1}`, false);
            return (
              <div key={`h-${i}`} style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10, transition: "all 0.3s ease" }}>
                <div style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.cyan}`, boxShadow: `0 0 10px ${C.cyanDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                  {p.num}
                  <span style={{ position: "absolute", top: -8, right: -14, fontSize: 9, fontWeight: 800, padding: "2px 4px", borderRadius: 4, background: ratingBg(p.rating || 6.5), color: ratingColor(p.rating || 6.5), border: `1px solid ${ratingColor(p.rating || 6.5)}40` }}>
                    {(p.rating || 6.5).toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: C.ice, fontWeight: 700, marginTop: 4, textShadow: "0 2px 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>{p.name.split(" ").pop()}</span>
              </div>
            );
          })}

          {/* AWAY NODES */}
          {(data.awayLineup || Array(11).fill({name: "Player", num: 0, grid: "1:3"})).map((p: PlayerNode, i: number) => {
            const coords = parseCoordinates(p.grid || `1:${(i%5)+1}`, true);
            return (
              <div key={`a-${i}`} style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10, transition: "all 0.3s ease" }}>
                <div style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", background: C.charcoal, border: `2px solid ${C.blue}`, boxShadow: `0 0 10px rgba(0,102,255,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                  {p.num}
                  <span style={{ position: "absolute", top: -8, right: -14, fontSize: 9, fontWeight: 800, padding: "2px 4px", borderRadius: 4, background: ratingBg(p.rating || 6.5), color: ratingColor(p.rating || 6.5), border: `1px solid ${ratingColor(p.rating || 6.5)}40` }}>
                    {(p.rating || 6.5).toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: C.ice, fontWeight: 700, marginTop: 4, textShadow: "0 2px 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>{p.name.split(" ").pop()}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tab === "review") {
    return (
      <div className="animate-in">
        {data.manOfMatch && (
          <div style={{ background: C.cyanDim, border: `1px solid ${C.cyanBorder}`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: C.glow }}>
            <span style={{ fontSize: 24 }}>⭐</span>
            <div>
              <div style={{ fontSize: 10, color: C.cyan, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>Man of the Match</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{data.manOfMatch}</div>
            </div>
          </div>
        )}
        <SectionLabel>Goal Telemetry</SectionLabel>
        <div style={{ background: C.charcoal, borderRadius: 8, border: `1px solid ${C.border}`, padding: "8px 12px", marginBottom: 16 }}>
          {(data.scorers || []).map((s: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: i !== data.scorers.length -1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              <span style={{ color: C.cyan, fontWeight: 800, minWidth: 32, fontFamily: "'JetBrains Mono', monospace" }}>{s.minute}'</span>
              <div>
                <div style={{ color: C.ice, fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ color: C.iceDim, fontSize: 11 }}>{s.type}{s.assist ? ` · Ast: ${s.assist}` : ""} · {s.team}</div>
              </div>
            </div>
          ))}
        </div>
        
        <SectionLabel>AI Tactical Review</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, background: C.charcoal, padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>
          {data.reviewText || "Match concluded. Deep-dive analysis compiling..."}
        </div>
      </div>
    );
  }

  if (tab === "commentary") {
    const typeStyle: Record<string, { color: string, icon: string }> = { 
      goal: { color: C.cyan, icon: "⚽" }, 
      card: { color: C.amber, icon: "🟨" }, 
      chance: { color: C.blue, icon: "⚡" }, 
      normal: { color: C.ice, icon: "▪" } 
    };
    return (
      <div className="animate-in">
        {(data.events || [{min: "45", text: "Match telemetry streaming active...", type: "normal"}]).map((e: any, i: number) => {
          const style = typeStyle[e.type] || typeStyle.normal;
          return (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.cyan, minWidth: 36, fontFamily: "'JetBrains Mono', monospace" }}>{e.min}'</span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: style.color }}>
                <span style={{ marginRight: 6 }}>{style.icon}</span>{e.text}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "stats") {
    return (
      <div className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12, fontWeight: 800, color: C.iceDim, textTransform: "uppercase", letterSpacing: "1px" }}>
          <span style={{ color: C.cyan }}>{match.homeAbbr}</span><span style={{ color: C.blue }}>{match.awayAbbr}</span>
        </div>
        <div style={{ background: C.charcoal, padding: "16px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
          {[
            ["Possession %", data.possession?.home || 50, data.possession?.away || 50],
            ["Expected Goals (xG)", data.xG?.home || 1.2, data.xG?.away || 0.8],
            ["Total Shots", data.shots?.home || 0, data.shots?.away || 0],
            ["Shots on Target", data.shotsOnTarget?.home || 0, data.shotsOnTarget?.away || 0],
            ["Pass Accuracy %", data.passAccuracy?.home || 0, data.passAccuracy?.away || 0],
            ["Fouls", data.fouls?.home || 0, data.fouls?.away || 0],
            ["Corners", data.corners?.home || 0, data.corners?.away || 0],
          ].map(([l, h, a]) => <StatRow key={l as string} label={l as string} hv={h as number} av={a as number} />)}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, any>>({});

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
    <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${expanded ? C.cyan : C.border}`, boxShadow: expanded ? C.glow : "none", overflow: "hidden", marginBottom: 8, transition: "all .2s ease", cursor: "pointer" }}
      onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", alignItems: "center", gap: 8, padding: "14px 16px" }}>
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {match.homeLogo ? (
            <img src={match.homeLogo} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} onError={(e)=>(e.currentTarget.style.display='none')} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.iceDim }}>{match.homeAbbr}</div>
          )}
          <span style={{ fontSize: 14, fontWeight: winH ? 700 : 500, color: winA ? C.iceDim : C.ice }}>{match.home}</span>
        </div>
        {/* Middle Score/Time */}
        <div style={{ textAlign: "center", background: C.c2, padding: "6px 0", borderRadius: 6, border: `1px solid ${C.border}` }}>
          {isFinal ? (
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ice, letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>{match.score.home} - {match.score.away}</div>
          ) : isLive ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <LiveDot />
              <span style={{ fontSize: 13, fontWeight: 800, color: C.red, fontFamily: "'JetBrains Mono', monospace" }}>{match.liveMin}'</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 600, color: C.iceDim, letterSpacing: "0.5px" }}>{match.kick.replace("KO · ", "")}</div>
          )}
        </div>
        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: "row-reverse" }}>
          {match.awayLogo ? (
            <img src={match.awayLogo} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} onError={(e)=>(e.currentTarget.style.display='none')} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.iceDim }}>{match.awayAbbr}</div>
          )}
          <span style={{ fontSize: 14, fontWeight: winA ? 700 : 500, color: winH ? C.iceDim : C.ice, textAlign: "right" }}>{match.away}</span>
        </div>
      </div>
      
      {/* Probability Strip */}
      <div style={{ display: "flex", height: 4, background: C.c2 }}>
        <div style={{ width: `${ph}%`, background: C.cyan, boxShadow: `0 0 5px ${C.cyan}` }} />
        <div style={{ width: `${pd}%`, background: C.iceDim }} />
        <div style={{ width: `${pa}%`, background: C.blue, boxShadow: `0 0 5px ${C.blue}` }} />
      </div>
      
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── Live Scores Panel ────────────────────────────────────────────────────────
function ScoresPanel() {
  const dates = buildDates();
  const [selectedDate, setSelectedDate] = useState(dates.find(d => d.isToday)?.key || new Date().toISOString().split("T")[0]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const IMPORTANT_LEAGUES = ["world cup", "premier league", "champions league", "la liga", "serie a", "bundesliga", "ligue 1", "mls"];

  useEffect(() => {
    let active = true;
    async function fetchLive(isInitialLoad = false) {
      if (isInitialLoad) setLoading(true);
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`);
        const data = await res.json();
        if (active && data.matches) {
          const sorted = data.matches.sort((a: Match, b: Match) => {
            const aMajor = IMPORTANT_LEAGUES.some(l => a.leagueName.toLowerCase().includes(l)) ? 1 : 0;
            const bMajor = IMPORTANT_LEAGUES.some(l => b.leagueName.toLowerCase().includes(l)) ? 1 : 0;
            return bMajor - aMajor;
          });
          setMatches(sorted);
        }
      } catch (e) { console.error(e); }
      if (isInitialLoad) setLoading(false);
    }

    fetchLive(true);
    const interval = setInterval(() => fetchLive(false), 30000); // Silent background polling
    return () => { active = false; clearInterval(interval); };
  }, [selectedDate]);

  const byLeague: Record<string, Match[]> = {};
  matches.forEach(m => { 
    if (!byLeague[m.leagueName]) byLeague[m.leagueName] = []; 
    byLeague[m.leagueName].push(m); 
  });

  return (
    <div>
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map(d => (
          <button key={d.key} onClick={() => setSelectedDate(d.key)}
            style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: selectedDate === d.key ? 700 : 500, color: selectedDate === d.key ? C.obsidian : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer", transition: "all .2s", boxShadow: selectedDate === d.key ? C.glow : "none" }}>
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 14px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: C.cyan, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px" }}><Dots /> Syncing Telemetry...</div>
        ) : !matches.length ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: C.iceDim, fontSize: 14 }}>No matches found for this date.</div>
        ) : (
          Object.entries(byLeague).map(([lg, ms]) => (
            <div key={lg} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0 10px" }}>
                {ms[0].leagueLogo ? (
                  <img src={ms[0].leagueLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: C.c3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>{lg.substring(0,2).toUpperCase()}</div>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ice, textTransform: "uppercase", letterSpacing: "0.5px" }}>{lg}</span>
              </div>
              {ms.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Scout AI Panel ───────────────────────────────────────────────────────────
function ScoutPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const scout = async (name: string) => {
    if(!name) return;
    setLoading(true); setReport(null); setInput(name);
    try {
      const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const { report: r } = await res.json();
      setReport(r);
    } catch { setReport({ _error: true }); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <SectionLabel style={{ fontSize: 16, color: C.ice, textShadow: "none", marginBottom: 4 }}>Scout AI Network</SectionLabel>
      <div style={{ fontSize: 12, color: C.iceDim, marginBottom: 16 }}>Global player database indexing powered by Claude AI.</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && scout(input)}
          placeholder="Enter player name (e.g. Lamine Yamal)..."
          style={{ flex: 1, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "12px 16px", fontSize: 14, color: C.ice, outline: "none", transition: "border .2s" }} 
          onFocus={(e) => e.target.style.border = `1px solid ${C.cyan}`}
          onBlur={(e) => e.target.style.border = `1px solid ${C.border2}`} />
        <button onClick={() => scout(input)} disabled={loading}
          style={{ padding: "0 24px", borderRadius: 8, border: `1px solid ${C.cyan}`, background: loading ? C.c3 : C.cyanDim, color: C.cyan, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "all .2s", boxShadow: C.glow }}>
          {loading ? <Dots /> : "SCOUT"}
        </button>
      </div>

      {loading && (
        <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${C.border}`, padding: 30, textAlign: "center", color: C.cyan, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px" }}>
          <Dots /> Compiling Dossier...
        </div>
      )}

      {report && !loading && !report._error && (
        <div className="animate-in" style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${C.cyanBorder}`, overflow: "hidden", boxShadow: C.glow }}>
          <div style={{ padding: "20px", background: `linear-gradient(135deg, #0A1410, #12241C)`, display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${C.cyanBorder}` }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.cyanDim, border: `2px solid ${C.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: C.cyan, boxShadow: C.glow }}>
              {String(report.name).split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ice }}>{report.name}</div>
              <div style={{ fontSize: 13, color: C.cyan, fontWeight: 600, marginTop: 4 }}>{report.position} · {report.club} · Age {report.age}</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: C.green, fontFamily: "'JetBrains Mono', monospace", textShadow: `0 0 10px ${C.green}` }}>
              {report.overall || 85}
            </div>
          </div>
          
          <div style={{ padding: "20px" }}>
            <SectionLabel>Tactical Profile</SectionLabel>
            <p style={{ fontSize: 14, color: C.ice, lineHeight: 1.7, marginBottom: 16 }}>{report.style}</p>
            <SectionLabel>AI Verdict</SectionLabel>
            <p style={{ fontSize: 14, color: C.ice, lineHeight: 1.7, marginBottom: 20, padding: 12, background: C.c2, borderRadius: 8, borderLeft: `3px solid ${C.cyan}` }}>{report.verdict}</p>
            
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(report.ytQuery || report.name + ' highlights')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", background: "rgba(255,0,60,0.1)", border: `1px solid rgba(255,0,60,0.3)`, borderRadius: 8, color: C.ice, textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "all .2s" }}>
              <span style={{ color: C.red, fontSize: 18 }}>▶</span> WATCH HIGHLIGHTS
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Application ─────────────────────────────────────────────────────────
export default function PitchIQ() {
  const [mainTab, setMainTab] = useState<MainTab>("scores");

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, maxWidth: 720, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navigation Bar */}
      <div style={{ background: "rgba(18, 24, 32, 0.8)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", height: 60, gap: 16 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.cyan, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: C.obsidian, boxShadow: C.glow }}>IQ</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.ice, letterSpacing: "-0.5px" }}>PitchIQ</span>
          </div>
        </div>
        
        {/* Main Tabs */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { id: "scores", label: "LIVE SCORES" },
            { id: "scout", label: "SCOUT AI" },
          ].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id as MainTab)}
              style={{ padding: "12px 0", fontSize: 13, fontWeight: mainTab === t.id ? 800 : 600, color: mainTab === t.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `3px solid ${mainTab === t.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .2s", textTransform: "uppercase", letterSpacing: "1px", textShadow: mainTab === t.id ? C.glow : "none" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ paddingBottom: 40 }}>
        {mainTab === "scores" && <ScoresPanel />}
        {mainTab === "scout" && <ScoutPanel />}
      </div>
      
      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .dots span { display: inline-block; width: 4px; height: 4px; background: currentColor; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out both; }
        .dots span:nth-child(1) { animation-delay: -0.32s; }
        .dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}} />
    </div>
  );
}