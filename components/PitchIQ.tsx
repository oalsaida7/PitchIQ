"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { MATCHES_BY_DATE, NEWS, SEARCH_DATA, type Match, type NewsItem, type SearchEntity } from "@/lib/data";

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
  return <span className="live-dot" />;
}

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color, background: bg, letterSpacing: ".4px" }}>
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".9px", color: C.cyan, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", ...style }}>
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
        <div className="stat-track" style={{ flex: 1 }}><div className="stat-fill-l" style={{ width: `${Math.round((hv / tot) * 100)}%` }} /></div>
        <span style={{ fontSize: 10, color: C.iceDim, textAlign: "center", minWidth: 100, flexShrink: 0 }}>{label}</span>
        <div className="stat-track" style={{ flex: 1 }}><div className="stat-fill-r" style={{ width: `${Math.round((av / tot) * 100)}%` }} /></div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, minWidth: 28, fontFamily: "'JetBrains Mono', monospace" }}>{av}</span>
    </div>
  );
}

// ─── Date navigation ──────────────────────────────────────────────────────────
const TODAY_KEY = "2026-06-21";

function buildDates() {
  const today = new Date("2026-06-21");
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const labels = ["−3 days", "−2 days", "Yesterday", "Today", "Tomorrow", "+2 days", "+3 days", "+4 days"];
    return { key, label: labels[i], isToday: i === 3 };
  });
}

// ─── League meta ──────────────────────────────────────────────────────────────
const LEAGUES = [
  { id: "all", name: "All", color: C.charcoal, abbr: "ALL" },
  { id: "wc", name: "World Cup", color: "#c9a227", abbr: "WC" },
  { id: "epl", name: "Premier League", color: "#3d185b", abbr: "PL" },
  { id: "la_liga", name: "La Liga", color: "#ee8707", abbr: "LL" },
  { id: "serie_a", name: "Serie A", color: "#024494", abbr: "SA" },
  { id: "bundesliga", name: "Bundesliga", color: "#d20515", abbr: "BL" },
  { id: "ligue_1", name: "Ligue 1", color: "#091c3e", abbr: "L1" },
  { id: "mls", name: "MLS", color: "#012b6b", abbr: "MLS" },
  { id: "ucl", name: "Champions League", color: "#072854", abbr: "UCL" },
];

// ─── Match expanded tabs ───────────────────────────────────────────────────────
type MatchTab = "preview" | "lineup" | "commentary" | "stats" | "table" | "review";

function MatchExpanded({ match, cache, onLoadTab }: {
  match: Match;
  cache: Record<string, unknown>;
  onLoadTab: (tab: MatchTab) => void;
}) {
  const isFinal = match.status === "final";
  const tabs: { id: MatchTab; label: string }[] = isFinal
    ? [{ id: "review", label: "Review" }, { id: "lineup", label: "Lineups" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }]
    : [{ id: "preview", label: "Preview" }, { id: "lineup", label: "Lineups" }, { id: "commentary", label: "Commentary" }, { id: "stats", label: "Stats" }, { id: "table", label: "Table" }];

  const defaultTab: MatchTab = isFinal ? "review" : "preview";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab]);

  const data = cache[activeTab] as Record<string, unknown> | undefined;

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.c2 }} onClick={e => e.stopPropagation()}>
      {/* Tab bar */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flexShrink: 0, padding: "10px 16px", fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: activeTab === t.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div style={{ padding: "16px 14px", minHeight: 80 }}>
        {!data ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.iceDim, fontSize: 13 }}>
            <Dots /> AI analyzing…
          </div>
        ) : (
          <TabContent match={match} tab={activeTab} data={data} />
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabContent({ match, tab, data }: { match: Match; tab: MatchTab; data: any }) {
  if (tab === "preview") {
    return (
      <div className="animate-in">
        <SectionLabel>AI Prediction</SectionLabel>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.ice, letterSpacing: 8, marginBottom: 8 }}>{data.prediction || "—"}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {[{ label: `${match.home.split(" ")[0]} ${data.homeWin}%`, bg: "rgba(102,252,241,0.12)", color: C.cyan },
              { label: `Draw ${data.draw}%`, bg: C.iceFaint, color: C.iceDim },
              { label: `${match.away.split(" ").slice(-1)[0]} ${data.awayWin}%`, bg: "rgba(96,165,250,0.12)", color: C.blue }]
              .map(p => <span key={p.label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 20, color: p.color, background: p.bg }}>{p.label}</span>)}
          </div>
        </div>
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Predicted Scorers</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, marginBottom: 4 }}>{data.homeScorerPred}</div>
        <div style={{ fontSize: 13, color: C.ice, marginBottom: 12 }}>{data.awayScorerPred}</div>
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Team Form</SectionLabel>
        {[{ name: match.home, form: data.homeForm }, { name: match.away, form: data.awayForm }].map(t => (
          <div key={t.name} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.iceDim, marginBottom: 4 }}>{t.name}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {(t.form || []).map((r: string, i: number) => <span key={i} className={`form-dot form-${r.toLowerCase()}`}>{r}</span>)}
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Head to Head</SectionLabel>
        {(data.h2h || []).map((h: { date: string; result: string; winner: string }, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
            <span style={{ color: C.iceDim, minWidth: 60 }}>{h.date}</span>
            <span style={{ flex: 1, color: C.ice }}>{h.result}</span>
            <span style={{ fontWeight: 700, color: h.winner === "home" ? C.cyan : h.winner === "away" ? C.blue : C.iceDim }}>{h.winner === "draw" ? "D" : h.winner === "home" ? "W" : "L"}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Tactics</SectionLabel>
        {[{ name: match.home, text: data.homeTactic }, { name: match.away, text: data.awayTactic }].map(t => (
          <div key={t.name} style={{ background: C.c3, borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.65 }}>{t.text}</div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Match Info</SectionLabel>
        {[{ label: "Venue", val: data.venue }, { label: "Referee", val: data.referee }, { label: "Competition", val: data.competition }].map(r => (
          <div key={r.label} style={{ background: C.c3, borderRadius: 8, padding: "8px 12px", marginBottom: 4, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ice }}>{r.val}</div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>Reasoning</SectionLabel>
        <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, borderLeft: `2px solid ${C.cyan}`, paddingLeft: 12 }}>{data.reasoning}</div>
      </div>
    );
  }

  if (tab === "lineup") {
    const side = (lineup: { num: number; name: string; role: string; pred: string }[], team: string, formation: string) => (
      <div style={{ background: C.c3, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", flex: 1 }}>
        <div style={{ padding: "8px 10px", background: C.c4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px" }}>{team}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>{formation}</span>
        </div>
        {(lineup || []).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, color: C.iceDim, minWidth: 16, fontFamily: "'JetBrains Mono', monospace" }}>{p.num}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.ice }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.iceDim }}>{p.role}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{p.pred}</span>
          </div>
        ))}
      </div>
    );
    return (
      <div className="animate-in">
        <div style={{ display: "flex", gap: 8 }}>
          {side(data.homeLineup, match.home, data.homeFormation)}
          {side(data.awayLineup, match.away, data.awayFormation)}
        </div>
        {data.lineupNote && <div style={{ marginTop: 8, fontSize: 12, color: C.iceDim, background: C.c3, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>{data.lineupNote}</div>}
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
        {(data.scorers || []).map((s: { minute: string; name: string; type: string; assist: string; team: string }, i: number) => (
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
          {(data.ratings || []).map((r: { name: string; pos: string; team: string; rating: number }, i: number) => (
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
        {[{ name: match.home, text: data.homeReview }, { name: match.away, text: data.awayReview }].map(t => (
          <div key={t.name} style={{ background: C.c3, borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.65 }}>{t.text}</div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <SectionLabel>What Could Have Been Better</SectionLabel>
        {[{ name: match.home, text: data.homeImprove }, { name: match.away, text: data.awayImprove }].map(t => (
          <div key={t.name} style={{ background: C.c3, borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t.name} — improvements</div>
            <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.65 }}>{t.text}</div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "commentary") {
    const typeStyle: Record<string, { color: string }> = {
      goal: { color: C.cyan }, card: { color: C.amber }, chance: { color: C.blue }, normal: { color: C.ice },
    };
    return (
      <div className="animate-in">
        {(data.events || []).map((e: { min: string; text: string; type: string }, i: number) => (
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
          ["Possession %", data.possession?.home, data.possession?.away],
          ["Shots", data.shots?.home, data.shots?.away],
          ["Shots on target", data.shotsOnTarget?.home, data.shotsOnTarget?.away],
          ["Big chances", data.bigChances?.home, data.bigChances?.away],
          ["Big chances missed", data.bigChancesMissed?.home, data.bigChancesMissed?.away],
          ["Passes", data.passes?.home, data.passes?.away],
          ["Pass accuracy %", data.passAccuracy?.home, data.passAccuracy?.away],
          ["Fouls", data.fouls?.home, data.fouls?.away],
          ["Offsides", data.offsides?.home, data.offsides?.away],
          ["Corners", data.corners?.home, data.corners?.away],
          ["Yellow cards", data.yellowCards?.home, data.yellowCards?.away],
          ["Red cards", data.redCards?.home, data.redCards?.away],
          ["xG", data.xG?.home, data.xG?.away],
        ].map(([l, h, a]) => <StatRow key={l as string} label={l as string} hv={h as number ?? 0} av={a as number ?? 0} />)}
      </div>
    );
  }

  if (tab === "table") {
    return (
      <div className="animate-in">
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 28px 28px 28px 28px 36px", gap: 4, padding: "4px 0 8px", borderBottom: `1px solid ${C.border2}`, fontSize: 10, fontWeight: 700, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".4px" }}>
          <span style={{ textAlign: "center" }}>#</span><span>Club</span><span style={{ textAlign: "center" }}>P</span><span style={{ textAlign: "center" }}>W</span><span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>L</span><span style={{ textAlign: "center" }}>Pts</span>
        </div>
        {(data.teams || []).map((t: { pos: number; name: string; played: number; won: number; drawn: number; lost: number; pts: number }) => {
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
      </div>
    );
  }

  return null;
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, unknown>>({});

  const loadTab = useCallback(async (tab: MatchTab) => {
    if (tabCache[tab]) return;
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match, type: tab }),
      });
      const { data } = await res.json();
      setTabCache(prev => ({ ...prev, [tab]: data }));
    } catch {
      setTabCache(prev => ({ ...prev, [tab]: { _error: true } }));
    }
  }, [match, tabCache]);

  const isFinal = match.status === "final";
  const isLive = match.status === "live";
  const winH = isFinal && match.score.home > match.score.away;
  const winA = isFinal && match.score.away > match.score.home;
  const ph = match.prob?.home ?? 0, pd = match.prob?.draw ?? 0, pa = match.prob?.away ?? 0;

  return (
    <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${expanded ? C.cyanBorder : C.border}`, overflow: "hidden", marginBottom: 4, transition: "border-color .15s", cursor: "pointer" }}
      onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 1fr", alignItems: "center", gap: 8, padding: "12px 14px" }}>
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.iceDim, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{match.homeAbbr}</div>
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
              <div style={{ fontSize: 11, color: C.iceDim }}>{match.kick.split("·")[1]?.trim() || ""}</div>
            </>
          )}
        </div>
        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.iceDim, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{match.awayAbbr}</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: winH ? C.iceDim : C.ice, textAlign: "right", lineHeight: 1.2 }}>{match.away}</span>
        </div>
      </div>
      {match.prob && (
        <>
          <div className="prob-strip">
            <div className="pb-h" style={{ width: `${ph}%` }} />
            <div className="pb-d" style={{ width: `${pd}%` }} />
            <div className="pb-a" style={{ width: `${pa}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 14px 6px", fontSize: 10, color: C.iceDim }}>
            <span>{ph}% {match.homeAbbr}</span><span>{pd}% Draw</span><span>{pa}% {match.awayAbbr}</span>
          </div>
        </>
      )}
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── Scores panel ─────────────────────────────────────────────────────────────
function ScoresPanel() {
  const dates = buildDates();
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [selectedLeague, setSelectedLeague] = useState("all");

  const matches = (MATCHES_BY_DATE[selectedDate] || []).filter(m => selectedLeague === "all" || m.league === selectedLeague);
  const byLeague: Record<string, Match[]> = {};
  matches.forEach(m => { if (!byLeague[m.league]) byLeague[m.league] = []; byLeague[m.league].push(m); });

  return (
    <div>
      {/* Date nav */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map(d => (
          <button key={d.key} onClick={() => setSelectedDate(d.key)}
            style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: d.isToday ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: selectedDate === d.key ? "#0B0C10" : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            {d.label}
          </button>
        ))}
      </div>
      {/* League filter */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {LEAGUES.map(l => (
          <button key={l.id} onClick={() => setSelectedLeague(l.id)}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 8, border: `1px solid ${selectedLeague === l.id ? C.cyanBorder : C.border}`, background: selectedLeague === l.id ? C.cyanDim : C.charcoal, cursor: "pointer", transition: "all .15s" }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: l.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{l.abbr}</div>
            <span style={{ fontSize: 11, fontWeight: 500, color: selectedLeague === l.id ? C.cyan : C.ice, whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif" }}>{l.name}</span>
          </button>
        ))}
      </div>
      {/* Matches */}
      <div style={{ padding: "4px 12px 20px" }}>
        {!matches.length ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: C.iceDim, fontSize: 13 }}>No matches on this date</div>
        ) : (
          Object.entries(byLeague).map(([lg, ms]) => (
            <div key={lg} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 8px" }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, background: ms[0].leagueColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{ms[0].leagueAbbr}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.iceDim }}>{ms[0].leagueName}</span>
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

// ─── News panel ───────────────────────────────────────────────────────────────
function NewsPanel() {
  const cats = [{ id: "all", label: "All" }, { id: "transfers", label: "Transfers" }, { id: "wc", label: "World Cup" }, { id: "epl", label: "Premier League" }];
  const [cat, setCat] = useState("all");
  const items: NewsItem[] = cat === "all" ? NEWS : NEWS.filter(n => n.cat === cat);

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.charcoal }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ flex: 1, padding: "11px 8px", fontSize: 12, fontWeight: cat === c.id ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif", color: cat === c.id ? C.cyan : C.iceDim, background: "none", border: "none", borderBottom: `2px solid ${cat === c.id ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all .15s" }}>
            {c.label}
          </button>
        ))}
      </div>
      <div>
        {items.map(n => (
          <div key={n.id} style={{ padding: "14px 14px", borderBottom: `1px solid ${C.border}`, background: n.confirmed ? "rgba(102,252,241,0.03)" : "transparent", borderLeft: n.confirmed ? `3px solid ${C.cyan}` : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: ".5px" }}>{n.source}</span>
              {n.confirmed && <Tag label="Confirmed" color={C.cyan} bg="rgba(102,252,241,0.1)" />}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.ice, lineHeight: 1.4, marginBottom: 5 }}>
              {n.tag === "done" && <Tag label="Done Deal" color={C.cyan} bg="rgba(102,252,241,0.12)" />}
              {n.tag === "rumor" && <Tag label="Rumor" color={C.amber} bg="rgba(245,158,11,0.12)" />}
              {n.tag === "breaking" && <Tag label="Breaking" color={C.red} bg="rgba(239,68,68,0.12)" />}
              {n.tag && " "}
              {n.headline}
            </div>
            <div style={{ fontSize: 12, color: C.iceDim, lineHeight: 1.55 }}>{n.snippet}</div>
            <div style={{ fontSize: 10, color: C.iceDim, marginTop: 6 }}>{n.time}</div>
          </div>
        ))}
      </div>
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
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

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
          {/* Header */}
          <div style={{ padding: "16px 14px", background: `linear-gradient(135deg, #0a1e12, #0f2e1c, #143d23)`, display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.cyanBorder}` }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(102,252,241,0.15)", border: `2px solid ${C.cyanBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.cyan, flexShrink: 0 }}>
              {String(report.name).split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.ice }}>{String(report.name)}</div>
              <div style={{ fontSize: 11, color: C.iceDim }}>{String(report.position)} · {String(report.club)} · {String(report.league)} · {String(report.nationality)} · Age {String(report.age)}</div>
              {Boolean(report.hidden_gem) && <span style={{ fontSize: 10, fontWeight: 700, background: "#fef08a", color: "#713f12", padding: "2px 7px", borderRadius: 3, display: "inline-block", marginTop: 3 }}>💎 Hidden Gem</span>}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{String(report.overall)}</div>
          </div>
          {/* Ratings grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border }}>
            {(["pace", "technical", "physical", "mental", "defending", "shooting"] as const).map(stat => {
              const v = (report.ratings as Record<string, number>)[stat] ?? 0;
              return (
                <div key={stat} style={{ padding: "10px 6px", background: C.charcoal, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: rc(v), fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 1 }}>{stat.slice(0, 4)}</div>
                </div>
              );
            })}
          </div>
          {/* Season stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border }}>
            {[["Goals", (report.seasonStats as Record<string, number>)?.goals], ["Assists", (report.seasonStats as Record<string, number>)?.assists], ["Apps", (report.seasonStats as Record<string, number>)?.apps], ["Rating", (report.seasonStats as Record<string, number>)?.avgRating]].map(([l, v]) => (
              <div key={l as string} style={{ padding: "8px 4px", background: C.c2, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ice, fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
                <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 1 }}>{l as string}</div>
              </div>
            ))}
          </div>
          {/* Body */}
          <div style={{ padding: "14px" }}>
            <SectionLabel>Strengths</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {(report.strengths as string[]).map(s => <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: C.green }}>{s}</span>)}
            </div>
            <SectionLabel>Weaknesses</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {(report.weaknesses as string[]).map(s => <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: C.red }}>{s}</span>)}
            </div>
            <SectionLabel>Playing Style</SectionLabel>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 12 }}>{String(report.style)}</p>
            <SectionLabel>Scout Verdict</SectionLabel>
            <p style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 14 }}>{String(report.verdict)}</p>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(String(report.ytQuery))}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.ice, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              <span style={{ color: "#ef4444", fontSize: 18 }}>▶</span> Watch {String(report.name)} highlights on YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Search panel ─────────────────────────────────────────────────────────────
function SearchResult({ entity }: { entity: SearchEntity }) {
  const d = entity.detail as Record<string, unknown>;
  const initials = entity.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const typeColor = entity.type === "player" ? C.cyan : entity.type === "club" ? C.amber : C.green;
  const typeBg = entity.type === "player" ? "rgba(102,252,241,0.1)" : entity.type === "club" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)";

  return (
    <div className="animate-in" style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.c3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: typeColor, flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{entity.name}</span>
            <Tag label={entity.type} color={typeColor} bg={typeBg} />
            {(d.hidden as boolean) && <Tag label="Hidden Gem" color={C.cyan} bg={C.cyanDim} />}
          </div>
          <div style={{ fontSize: 12, color: C.iceDim }}>{entity.sub}</div>
        </div>
      </div>

      {entity.type === "player" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
            {[["Goals", d.goals], ["Assists", d.assists], ["Apps", d.apps], ["Avg Rating", d.avgRating], ["Age", d.age], ["Position", String(d.pos).slice(0, 6)]].map(([l, v]) => (
              <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.ice, fontFamily: "'JetBrains Mono', monospace" }}>{v as string | number}</div>
                <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l as string}</div>
              </div>
            ))}
          </div>
          <SectionLabel>Recent Matches</SectionLabel>
          {(d.recentGames as { date: string; opp: string; result: string; rating?: number }[]).map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
              <span style={{ color: C.iceDim, minWidth: 50 }}>{g.date}</span>
              <span style={{ flex: 1, color: C.ice }}>{g.opp}</span>
              <span style={{ fontWeight: 600, color: g.result.startsWith("W") ? C.green : g.result.startsWith("D") ? C.iceDim : C.red }}>{g.result}</span>
              {g.rating && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: ratingColor(g.rating), background: ratingBg(g.rating), fontFamily: "'JetBrains Mono', monospace" }}>{g.rating}</span>}
            </div>
          ))}
        </div>
      )}

      {entity.type === "club" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
            {[["Manager", String(d.manager).split(" ").slice(-1)[0]], ["Position", `${d.position}${d.position === 1 ? "st" : d.position === 2 ? "nd" : d.position === 3 ? "rd" : "th"}`], ["Founded", d.founded]].map(([l, v]) => (
              <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ice }}>{v as string | number}</div>
                <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l as string}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.iceDim, marginBottom: 12 }}>🏟 {String(d.stadium)}</div>
          <SectionLabel>Current Squad</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {(d.squad as string[]).map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 6, padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
                <span style={{ color: C.iceDim, minWidth: 18, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                <span style={{ color: C.ice }}>{p}</span>
              </div>
            ))}
          </div>
          <SectionLabel style={{ marginTop: 14 } as React.CSSProperties}>Recent Results</SectionLabel>
          {(d.recentGames as { date: string; opp: string; result: string }[]).map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
              <span style={{ color: C.iceDim, minWidth: 50 }}>{g.date}</span>
              <span style={{ flex: 1, color: C.ice }}>{g.opp}</span>
              <span style={{ fontWeight: 600, color: g.result.startsWith("W") ? C.green : g.result.startsWith("D") ? C.iceDim : C.red }}>{g.result}</span>
            </div>
          ))}
        </div>
      )}

      {entity.type === "country" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {[["FIFA Rank", d.ranking], ["Coach", String(d.coach).split(" ").slice(-1)[0]], ["Group", d.group]].filter(Boolean).map(([l, v]) => (
              <div key={l as string} style={{ background: C.c3, borderRadius: 8, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ice }}>{v as string | number}</div>
                <div style={{ fontSize: 9, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l as string}</div>
              </div>
            ))}
          </div>
          <SectionLabel>Recent Form</SectionLabel>
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {(d.recentForm as string[]).map((r, i) => <span key={i} className={`form-dot form-${r.toLowerCase()}`}>{r}</span>)}
          </div>
          <SectionLabel>World Cup Squad</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {(d.squad as string[]).map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 6, padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span style={{ color: C.iceDim, minWidth: 18, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                <span style={{ color: C.ice }}>{p}</span>
              </div>
            ))}
          </div>
          <SectionLabel style={{ marginTop: 14 } as React.CSSProperties}>Recent Results</SectionLabel>
          {(d.recentGames as { date: string; opp: string; result: string }[]).map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
              <span style={{ color: C.iceDim, minWidth: 50 }}>{g.date}</span>
              <span style={{ flex: 1, color: C.ice }}>{g.opp}</span>
              <span style={{ fontWeight: 600, color: g.result.startsWith("W") ? C.green : g.result.startsWith("D") ? C.iceDim : C.red }}>{g.result}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
type MainTab = "scores" | "news" | "scout";

export default function PitchIQ() {
  const [mainTab, setMainTab] = useState<MainTab>("scores");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchEntity[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = searchQuery.toLowerCase();
    const results = SEARCH_DATA.filter(d => d.name.toLowerCase().includes(q) || d.sub.toLowerCase().includes(q)).slice(0, 6);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSelect = (entity: SearchEntity) => {
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
              placeholder="Search players, clubs, countries…"
              style={{ width: "100%", background: C.c3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "7px 10px 7px 28px", fontSize: 12, color: C.ice, outline: "none", fontFamily: "'Space Grotesk', sans-serif", transition: "border .15s" }} />
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 200 }}>
                {searchResults.map(r => (
                  <div key={r.name} onClick={() => handleSearchSelect(r)}
                    style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: C.c3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.iceDim }}>
                      {r.type === "player" ? "P" : r.type === "club" ? "C" : "N"}
                    </div>
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
          {searchResults.map(r => <SearchResult key={r.name} entity={r} />)}
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
