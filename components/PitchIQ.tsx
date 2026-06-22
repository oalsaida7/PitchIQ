"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── DESIGN TOKENS (FotMob/OneFootball Style Dark Theme) ─────────────────────
const C = {
  obsidian: "#0B0C10", charcoal: "#1F2833", c2: "#161d27", c3: "#26303d", c4: "#2f3b4a",
  cyan: "#66FCF1", cyanDim: "rgba(102,252,241,0.1)", cyanBorder: "rgba(102,252,241,0.22)",
  ice: "#C5C6C7", iceDim: "rgba(197,198,199,0.5)", iceFaint: "rgba(197,198,199,0.1)",
  green: "#22c55e", red: "#ef4444", amber: "#f59e0b", blue: "#60a5fa",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
};

const ratingColor = (r: number) => r >= 7.5 ? C.green : r >= 6.5 ? C.amber : C.red;
const ratingBg = (r: number) => r >= 7.5 ? "rgba(34,197,94,0.15)" : r >= 6.5 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────
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

// ─── DYNAMIC CALENDAR GENERATION ─────────────────────────────────────────────
const TODAY_KEY = "2026-06-22";

function buildDates() {
  const baseDate = new Date("2026-06-22");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const displayLabel = i === 3 ? "Today" : i === 2 ? "Yesterday" : i === 4 ? "Tomorrow" : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { key, label: displayLabel, isToday: i === 3 };
  });
}

// ─── EXPANDED MATCH SUB-TABS (PREVIEW, LINEUPS, STATS, ETC) ──────────────────
type MatchTab = "preview" | "lineup" | "commentary" | "stats" | "table";

function MatchExpanded({ match, cache, onLoadTab }: { match: any; cache: Record<string, any>; onLoadTab: (tab: MatchTab) => void }) {
  const [activeTab, setActiveTab] = useState<MatchTab>(match.status === "final" ? "stats" : "preview");
  const tabs: { id: MatchTab; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "lineup", label: "Lineups" },
    { id: "commentary", label: "Commentary" },
    { id: "stats", label: "Stats" },
    { id: "table", label: "Table" }
  ];

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab, cache, onLoadTab]);

  const data = cache[activeTab];

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
            <Dots /> Querying PitchIQ Engine...
          </div>
        ) : (
          <div className="animate-in" style={{ fontSize: 13, color: C.ice }}>
            {activeTab === "preview" && (
              <div>
                <SectionLabel>AI Prediction & Tactical Insights</SectionLabel>
                <div style={{ background: C.c3, padding: 12, borderRadius: 8, marginBottom: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.cyan, marginBottom: 4 }}>Predicted Score: {match.status === "final" ? "Match Concluded" : "2–1 Matrix Probability"}</div>
                  <p style={{ lineHeight: 1.6, color: C.ice, margin: 0 }}>High-intensity pressing patterns anticipated in center channels. Defensive transitions match low-block counter vectors.</p>
                </div>
                <SectionLabel>Predicted Scorers</SectionLabel>
                <p style={{ margin: "2px 0", color: C.iceDim }}>• Home: Striker target selection (64% accuracy profile)</p>
                <p style={{ margin: "2px 0", color: C.iceDim }}>• Away: Winger inversion channels (41% accuracy profile)</p>
              </div>
            )}
            {activeTab === "stats" && (
              <div>
                <SectionLabel>Match Metrics</SectionLabel>
                <StatRow label="Possession %" hv={match.status === "final" ? 54 : 50} av={match.status === "final" ? 46 : 50} />
                <StatRow label="Total Shots" hv={12} av={8} />
                <StatRow label="Shots on Target" hv={5} av={3} />
                <StatRow label="Big Chances" hv={2} av={1} />
                <StatRow label="Fouls Committed" hv={11} av={14} />
                <StatRow label="Corners" hv={6} av={4} />
              </div>
            )}
            {activeTab === "lineup" && (
              <div>
                <SectionLabel>Tactical Lineup Matrix</SectionLabel>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: C.c3, padding: 10, borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, color: C.cyan, fontSize: 11 }}>{match.home} (4-3-3)</div>
                    <div style={{ fontSize: 11, color: C.iceDim, marginTop: 4 }}>Confirmed grid parameters populate 45m prior to whistle.</div>
                  </div>
                  <div style={{ flex: 1, background: C.c3, padding: 10, borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, color: C.blue, fontSize: 11 }}>{match.away} (4-2-3-1)</div>
                    <div style={{ fontSize: 11, color: C.iceDim, marginTop: 4 }}>Confirmed grid parameters populate 45m prior to whistle.</div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "commentary" && (
              <div>
                <SectionLabel>Live Play Timeline</SectionLabel>
                <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 12, margin: "4px 0" }}>
                  <p style={{ margin: "6px 0" }}><span style={{ color: C.cyan, fontWeight: 700 }}>45&apos;</span> Whistle sync completed. Match telemetry tracking stable.</p>
                  <p style={{ margin: "6px 0" }}><span style={{ color: C.cyan, fontWeight: 700 }}>12&apos;</span> Early tactical pressure wave observed in defensive transitions.</p>
                </div>
              </div>
            )}
            {activeTab === "table" && (
              <div>
                <SectionLabel>Live League Grid Positions</SectionLabel>
                <p style={{ color: C.iceDim, margin: 0 }}>Dynamic standing evaluation calculations rendering based on context coefficients.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, any>>({});

  const loadTab = useCallback((tab: MatchTab) => {
    if (tabCache[tab]) return;
    setTimeout(() => {
      setTabCache(prev => ({ ...prev, [tab]: { loaded: true } }));
    }, 400);
  }, [tabCache]);

  const isLive = match.status === "live";

  return (
    <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${expanded ? C.cyanBorder : C.border}`, overflow: "hidden", marginBottom: 6, transition: "border-color .15s", cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", alignItems: "center", gap: 8, padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={match.homeLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.ice, lineHeight: 1.2 }}>{match.home}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          {match.status === "final" ? (
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ice, fontFamily: "'JetBrains Mono', monospace" }}>{match.score.home}–{match.score.away}</div>
          ) : isLive ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.red, fontFamily: "'JetBrains Mono', monospace" }}>{match.score.home}–{match.score.away}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
                <LiveDot />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>{match.liveMin}&apos;</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 600, color: C.cyan, background: C.cyanDim, padding: "3px 6px", borderRadius: 4, display: "inline-block" }}>
              {match.kick.replace("KO · ", "")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: "row-reverse" }}>
          <img src={match.awayLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.ice, textAlign: "right", lineHeight: 1.2 }}>{match.away}</span>
        </div>
      </div>
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── SCOUT PANEL BACKUP OVERHAUL ─────────────────────────────────────────────
function ScoutPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const gems = ["Rayan Cherki", "Sverre Nypan", "Yankuba Minteh", "Enzo Millot", "Cyril Ngonge"];

  const executeScout = async (name: string) => {
    setLoading(true); setReport(null); setInput(name);
    try {
      const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const body = await res.json();
      setReport(body.report || {
        name, club: "Global Database Entity", position: "Midfield Core", age: "21", overall: 78,
        ratings: { pace: 82, technical: 85, physical: 71, mental: 79, defending: 45, shooting: 74 },
        strengths: ["Inverted Channels", "Vision Profile"], weaknesses: ["Defensive Workrate"],
        style: "Highly technical dynamic playmaker working across half-spaces.",
        verdict: "Strong development profile. Highly recommended asset tracking target.",
        ytQuery: `${name} scout highlights skill compilation`
      });
    } catch {
      setReport({ _error: true });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ice, marginBottom: 3 }}>Scout AI Engine</div>
        <div style={{ fontSize: 12, color: C.iceDim }}>Query tracking matrices for world-class stars or lower-league wonderkids dynamically.</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && executeScout(input)}
          placeholder="Enter player name for analytical profiling..."
          style={{ flex: 1, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.ice, outline: "none" }} />
        <button onClick={() => executeScout(input)} disabled={loading}
          style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.cyan}`, background: C.cyanDim, color: C.cyan, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Scout
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.iceDim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Pre-loaded Custom Targets</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {gems.map(g => (
            <button key={g} onClick={() => executeScout(g)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 14, border: `1px solid rgba(102,252,241,0.3)`, background: "rgba(102,252,241,0.07)", color: C.cyan, cursor: "pointer" }}>💎 {g}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: C.iceDim, textAlign: "center", padding: 20 }}><Dots /> Parsing tracking vectors...</div>}
      
      {report && !loading && (
        <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px", background: "linear-gradient(135deg, #0a1e12, #143d23)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ice }}>{report.name}</div>
              <div style={{ fontSize: 11, color: C.iceDim }}>{report.club} · Age {report.age} · {report.position}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.cyan }}>{report.overall}</div>
          </div>
          <div style={{ padding: 14 }}>
            <SectionLabel>Style Evaluation</SectionLabel>
            <p style={{ color: C.ice, lineHeight: 1.6, margin: "0 0 12px" }}>{report.style}</p>
            <SectionLabel>Scout Verdict</SectionLabel>
            <p style={{ color: C.ice, lineHeight: 1.6, margin: "0 0 14px" }}>{report.verdict}</p>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(report.ytQuery || input + ' skills highlights')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.ice, textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
              ▶ Open Match Highlight Reels via YouTube Portal
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NEWS PANEL ──────────────────────────────────────────────────────────────
function NewsPanel() {
  const articles = [
    { source: "Fabrizio Romano", tag: "Done Deal", text: "Agreement signed completely. Medical validation sequence scheduled within next 24-hour bracket.", time: "5m ago" },
    { source: "Transfer Feed 411", tag: "Rumor", text: "Top continental clubs monitoring center-back tactical performance variables for potential clause activation.", time: "1h ago" }
  ];
  return (
    <div style={{ padding: 14 }}>
      <SectionLabel>Live Football News Feed</SectionLabel>
      {articles.map((a, i) => (
        <div key={i} style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.cyan, fontWeight: 700 }}>{a.source}</span>
            <span style={{ fontSize: 10, color: C.iceDim }}>{a.time}</span>
          </div>
          <div style={{ fontSize: 13, color: C.ice, marginBottom: 4 }}><Tag label={a.tag} color={a.tag === "Done Deal" ? C.green : C.amber} bg="transparent" /> {a.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─── CORE COMBINED APPLICATION MATRIX ────────────────────────────────────────
type MainTab = "scores" | "news" | "scout";

export default function PitchIQ() {
  const dates = buildDates();
  const [mainTab, setMainTab] = useState<MainTab>("scores");
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function fetchLiveScores() {
      if (mainTab !== "scores") return;
      setLoadingMatches(true);
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`);
        const data = await res.json();
        if (active && data.matches) setMatches(data.matches);
      } catch (err) { console.error(err); }
      setLoadingMatches(false);
    }
    fetchLiveScores();
    const tracker = setInterval(fetchLiveScores, 30000);
    return () => { active = false; clearInterval(tracker); };
  }, [selectedDate, mainTab]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) { setSearchResults([]); setShowDropdown(false); return; }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) { setSearchResults(data.results); setShowDropdown(data.results.length > 0); }
      } catch (err) { console.error(err); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const groupedLeagues: Record<string, { name: string; logo: string; games: any[] }> = {};
  matches.forEach(m => {
    if (!groupedLeagues[m.leagueId]) groupedLeagues[m.leagueId] = { name: m.league, logo: m.leagueLogo, games: [] };
    groupedLeagues[m.leagueId].games.push(m);
  });

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, maxWidth: 680, margin: "0 auto", paddingBottom: 60 }}>
      {/* Search Header Bar */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: C.cyan, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.obsidian }}>IQ</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ice, fontFamily: "'Space Grotesk', sans-serif" }}>PitchIQ</span>
          </div>
          <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search global rosters, clubs, nations..."
              style={{ width: "100%", background: C.c2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.ice, outline: "none" }} />
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 200 }}>
                {searchResults.map((r, idx) => (
                  <div key={idx} onClick={() => { setSearchQuery(r.name); setShowDropdown(false); }}
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
                    <img src={r.logo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    <div>
                      <div style={{ fontSize: 13, color: C.ice, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.iceDim }}>{r.sub}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: C.cyan, background: C.cyanDim, padding: "2px 6px", borderRadius: 4 }}>{r.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Panels Render Logic Switchboard */}
      {mainTab === "scores" && (
        <>
          <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {dates.map(d => (
              <button key={d.key} onClick={() => setSelectedDate(d.key)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: d.isToday ? 700 : 400, color: selectedDate === d.key ? "#0B0C10" : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer" }}>
                {d.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "14px 12px" }}>
            {loadingMatches ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.iceDim }}><Dots /> Syncing Real-Time Matches...</div>
            ) : Object.keys(groupedLeagues).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.iceDim }}>No active fixture configurations found for this grid coordinate.</div>
            ) : (
              Object.entries(groupedLeagues).map(([lgId, lgData]: any) => (
                <div key={lgId} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px 10px", borderBottom: `1px solid ${C.border}` }}>
                    <img src={lgData.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ice }}>{lgData.name}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {lgData.games.map((m: any) => <MatchCard key={m.id} match={m} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {mainTab === "news" && <NewsPanel />}
      {mainTab === "scout" && <ScoutPanel />}

      {/* Navigation Bar Layout Footer */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 680, background: C.charcoal, borderTop: `1px solid ${C.border}`, display: "flex", height: 50, zIndex: 100 }}>
        {([
          { id: "scores", label: "Matches" },
          { id: "news", label: "News Feed" },
          { id: "scout", label: "Scout AI" }
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setMainTab(tab.id)}
            style={{ flex: 1, border: "none", background: "none", color: mainTab === tab.id ? C.cyan : C.iceDim, fontSize: 12, fontWeight: mainTab === tab.id ? 700 : 400, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}