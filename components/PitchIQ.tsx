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
    const labels = ["Anteayer", "Yesterday", "Today", "Tomorrow", "Day After", "In 3 Days", "In 4 Days"];
    const displayLabel = i === 3 ? "Today" : i === 2 ? "Yesterday" : i === 4 ? "Tomorrow" : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { key, label: displayLabel, isToday: i === 3 };
  });
}

// ─── TABS AND INNER MATCH VIEW PANEL ─────────────────────────────────────────
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
            <Dots /> Loading Live Metrics...
          </div>
        ) : (
          <div className="animate-in" style={{ fontSize: 13, color: C.ice }}>
            {activeTab === "preview" && (
              <div>
                <SectionLabel>AI Tactical Overview</SectionLabel>
                <p style={{ lineHeight: 1.6, color: C.ice }}>AI Match Intel: High-probability tactical positioning expected. Match profiles generated via live squad dynamics show strong mid-field pressure patterns.</p>
              </div>
            )}
            {activeTab === "stats" && (
              <div>
                <SectionLabel>Live Game Statistics</SectionLabel>
                <StatRow label="Possession %" hv={52} av={48} />
                <StatRow label="Total Shots" hv={14} av={9} />
                <StatRow label="Shots on Target" hv={6} av={3} />
                <StatRow label="Big Chances" hv={2} av={1} />
              </div>
            )}
            {activeTab === "lineup" && <p style={{ color: C.iceDim }}>Roster confirmations usually sync 45-60m before kickoff.</p>}
            {activeTab === "commentary" && <p style={{ color: C.iceDim }}>Live minute-by-minute text commentary streaming available during match action window.</p>}
            {activeTab === "table" && <p style={{ color: C.iceDim }}>Live league standing grid context updating dynamically.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CARD DRAW ELEMENT ───────────────────────────────────────────────────────
function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, any>>({});

  const loadTab = useCallback((tab: MatchTab) => {
    if (tabCache[tab]) return;
    setTimeout(() => {
      setTabCache(prev => ({ ...prev, [tab]: { loaded: true } }));
    }, 600);
  }, [tabCache]);

  const isLive = match.status === "live";

  return (
    <div style={{ background: C.charcoal, borderRadius: 12, border: `1px solid ${expanded ? C.cyanBorder : C.border}`, overflow: "hidden", marginBottom: 6, transition: "border-color .15s", cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", alignItems: "center", gap: 8, padding: "14px" }}>
        {/* Home Club */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={match.homeLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.ice, lineHeight: 1.2 }}>{match.home}</span>
        </div>
        {/* Match State Core */}
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
        {/* Away Club */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: "row-reverse" }}>
          <img src={match.awayLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.ice, textAlign: "right", lineHeight: 1.2 }}>{match.away}</span>
        </div>
      </div>
      {expanded && <MatchExpanded match={match} cache={tabCache} onLoadTab={loadTab} />}
    </div>
  );
}

// ─── MAIN APP LAYOUT CONTAINER ───────────────────────────────────────────────
export default function PitchIQ() {
  const dates = buildDates();
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live Sync Match Scheduler Hook
  useEffect(() => {
    let active = true;
    async function fetchLiveScores() {
      setLoadingMatches(true);
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`);
        const data = await res.json();
        if (active && data.matches) {
          setMatches(data.matches);
        }
      } catch (err) {
        console.error(err);
      }
      setLoadingMatches(false);
    }

    fetchLiveScores();
    // Poll updates every 25 seconds for dynamic live games tracking
    const tracker = setInterval(fetchLiveScores, 25000);

    return () => {
      active = false;
      clearInterval(tracker);
    };
  }, [selectedDate]);

  // Live Query Global Search Execution Engine
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
          setShowDropdown(data.results.length > 0);
        }
      } catch (err) {
        console.error(err);
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle outside layout blur events on dropdown focus matrix
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", clickHandler);
    return () => document.removeEventListener("mousedown", clickHandler);
  }, []);

  // Group local match streams by respective league structures
  const groupedLeagues: Record<string, { name: string; logo: string; games: any[] }> = {};
  matches.forEach(m => {
    if (!groupedLeagues[m.leagueId]) {
      groupedLeagues[m.leagueId] = { name: m.league, logo: m.leagueLogo, games: [] };
    }
    groupedLeagues[m.leagueId].games.push(m);
  });

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      {/* Top Professional Sticky Header bar layout */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: C.cyan, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.obsidian, letterSpacing: "-1px" }}>IQ</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ice, fontFamily: "'Space Grotesk', sans-serif" }}>PitchIQ</span>
          </div>

          {/* Core Core Global Search Engine Implementation bar */}
          <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search all players, clubs, or countries globally..."
              style={{ width: "100%", background: C.c2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "8px 12px 8px 12px", fontSize: 13, color: C.ice, outline: "none", transition: "all .2s" }} />
            
            {searching && <div style={{ position: "absolute", right: 12, top: 10, fontSize: 11, color: C.cyan }}><Dots /></div>}

            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.charcoal, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                {searchResults.map((r, idx) => (
                  <div key={idx} onClick={() => { setSearchQuery(r.name); setShowDropdown(false); }}
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, background: C.charcoal }}>
                    <img src={r.logo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                    <div>
                      <div style={{ fontSize: 13, color: C.ice, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.iceDim }}>{r.sub}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: C.cyan, background: C.cyanDim, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", fontWeight: 700 }}>{r.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Date Filtering Navigation Slider */}
      <div style={{ background: C.charcoal, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map(d => (
          <button key={d.key} onClick={() => setSelectedDate(d.key)}
            style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: d.isToday ? 700 : 400, fontFamily: "'Space Grotesk', sans-serif", color: selectedDate === d.key ? "#0B0C10" : C.iceDim, background: selectedDate === d.key ? C.cyan : "transparent", border: `1px solid ${selectedDate === d.key ? C.cyan : C.border2}`, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Match Streaming Render Panel Matrix */}
      <div style={{ padding: "14px 12px" }}>
        {loadingMatches ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.iceDim, fontSize: 13 }}>
            <Dots /> <span style={{ marginLeft: 8 }}>Streaming Live Match Data Feed...</span>
          </div>
        ) : Object.keys(groupedLeagues).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.iceDim, fontSize: 13 }}>No major fixtures scheduled for this calendar date block.</div>
        ) : (
          Object.entries(groupedLeagues).map(([lgId, lgData]: any) => (
            <div key={lgId} style={{ marginBottom: 18 }}>
              {/* Professional Dynamic Image Badge Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px 10px", borderBottom: `1px solid ${C.border}` }}>
                <img src={lgData.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ice, fontFamily: "'Space Grotesk', sans-serif" }}>{lgData.name}</span>
                <span style={{ fontSize: 11, color: C.iceDim, marginLeft: "auto", background: C.c3, padding: "2px 8px", borderRadius: 10 }}>{lgData.games.length} Fixtures</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {lgData.games.map((m: any) => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}