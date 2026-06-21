"use client";

import { useState, useCallback } from "react";
import { LEAGUES, LEAGUE_LABELS, type Match, type PlayerReport } from "@/lib/data";

const QUICK_PLAYERS = [
  "Erling Haaland", "Vinicius Jr", "Bukayo Saka",
  "Lamine Yamal", "Rodri", "Pedri", "Kylian Mbappé", "Mohamed Salah",
];

type Tab = "matches" | "scout" | "compare";
type League = "epl" | "la_liga" | "ucl" | "mls";

function ratingColor(v: number) {
  if (v >= 80) return "#22c55e";
  if (v >= 65) return "#f59e0b";
  return "#ef4444";
}

function StatusBadge({ status }: { status: Match["status"] }) {
  if (status === "final")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400">FT</span>;
  if (status === "live")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/60 text-red-400 animate-pulse">● LIVE</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Upcoming</span>;
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
          style={{ animation: `dotBounce 1.2s ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  );
}

function MatchCard({
  match,
  aiAnalysis,
  onAnalyze,
  analyzing,
}: {
  match: Match;
  aiAnalysis?: string;
  onAnalyze: (id: string) => void;
  analyzing: boolean;
}) {
  const ph = match.prob ? Math.round(match.prob.home) : 0;
  const pd = match.prob ? Math.round(match.prob.draw) : 0;
  const pa = match.prob ? 100 - ph - pd : 0;

  return (
    <div className={`bg-zinc-900 rounded-xl border ${aiAnalysis ? "border-emerald-700" : "border-zinc-800"} p-4 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">{match.time}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="grid grid-cols-[1fr_72px_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-medium shrink-0">
            {match.homeAbbr.slice(0, 3)}
          </div>
          <span className="text-sm font-medium text-white truncate">{match.home}</span>
        </div>

        <div className="text-center">
          {match.status === "scheduled" ? (
            <span className="text-xs text-zinc-600">vs</span>
          ) : (
            <span className="text-xl font-medium text-white tracking-widest">
              {match.score.home}–{match.score.away}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm font-medium text-white truncate text-right">{match.away}</span>
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-medium shrink-0">
            {match.awayAbbr.slice(0, 3)}
          </div>
        </div>
      </div>

      {match.prob && (
        <>
          <div className="prob-bar mt-3">
            <div className="prob-home" style={{ width: `${ph}%` }} />
            <div className="prob-draw" style={{ width: `${pd}%` }} />
            <div className="prob-away" style={{ width: `${pa}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-zinc-600">
            <span>{ph}% {match.homeAbbr}</span>
            <span>{pd}% draw</span>
            <span>{pa}% {match.awayAbbr}</span>
          </div>
        </>
      )}

      <button
        onClick={() => onAnalyze(match.id)}
        disabled={analyzing}
        className="mt-3 w-full py-2 rounded-lg border border-emerald-700 text-emerald-400 text-sm hover:bg-emerald-900/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {analyzing ? <LoadingDots /> : <>{aiAnalysis ? "↺ Regenerate" : "✦ AI Analysis"}</>}
      </button>

      {aiAnalysis && (
        <div className="mt-3 bg-zinc-800/60 rounded-lg p-3 border-l-2 border-emerald-600">
          <div className="text-xs text-emerald-500 font-medium mb-1.5">AI Analyst</div>
          <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}

function ScoutCard({
  player,
  isSaved,
  onToggleSave,
}: {
  player: PlayerReport;
  isSaved: boolean;
  onToggleSave: (name: string) => void;
}) {
  const initials = player.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const stats = [
    { label: "Pace", value: player.ratings.pace },
    { label: "Technical", value: player.ratings.technical },
    { label: "Physical", value: player.ratings.physical },
    { label: "Mental", value: player.ratings.mental },
    { label: "Defense", value: player.ratings.defending },
    { label: "Shooting", value: player.ratings.shooting },
  ];

  return (
    <div className={`bg-zinc-900 rounded-xl border ${isSaved ? "border-emerald-600" : "border-zinc-800"} overflow-hidden`}>
      <div className="p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0f4c28 0%, #166534 100%)" }}>
        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-medium text-base shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-base">{player.name}</div>
          <div className="text-white/70 text-xs">{player.position} · {player.club} · {player.nationality} · Age {player.age}</div>
        </div>
        <div className="text-white text-3xl font-medium pl-2 shrink-0">{player.overall}</div>
        <button
          onClick={() => onToggleSave(player.name)}
          className={`text-xs px-2.5 py-1.5 rounded-md border transition-all shrink-0 ${isSaved ? "bg-white/20 border-white/60 text-white" : "border-white/40 text-white/80 hover:bg-white/10"}`}
        >
          {isSaved ? "✓ Saved" : "+ Compare"}
        </button>
      </div>

      <div className="ratings-grid">
        {stats.map((s) => (
          <div key={s.label} className="py-3 text-center bg-zinc-900">
            <div className="text-xl font-medium" style={{ color: ratingColor(s.value) }}>{s.value}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Strengths</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {player.strengths.map((s) => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-400">{s}</span>
          ))}
        </div>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Weaknesses</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {player.weaknesses.map((w) => (
            <span key={w} className="text-xs px-2.5 py-1 rounded-full bg-red-900/40 text-red-400">{w}</span>
          ))}
        </div>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Playing style</div>
        <p className="text-sm text-zinc-300 leading-relaxed mb-3">{player.style}</p>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Scout verdict</div>
        <p className="text-sm text-zinc-300 leading-relaxed">{player.verdict}</p>
      </div>
    </div>
  );
}

function ComparePanel({ players, onRemove }: { players: PlayerReport[]; onRemove: (name: string) => void }) {
  if (players.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <div className="text-4xl mb-3">⇄</div>
        <p className="text-sm">Go to Scout AI, generate reports, and tap &ldquo;+ Compare&rdquo; to add players here</p>
      </div>
    );
  }

  const stats = [
    { key: "pace", label: "Pace" },
    { key: "technical", label: "Technical" },
    { key: "physical", label: "Physical" },
    { key: "mental", label: "Mental" },
    { key: "defending", label: "Defense" },
    { key: "shooting", label: "Shooting" },
  ] as const;

  const shown = players.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-sm font-medium text-white mb-4">Player Comparison ({players.length} saved)</div>
        <div className={`grid gap-3 ${shown.length === 1 ? "grid-cols-1" : shown.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
          {shown.map((p) => (
            <div key={p.name} className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white truncate">{p.name.split(" ").slice(-1)[0]}</span>
                <span className="text-lg font-medium text-emerald-400">{p.overall}</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">{p.position} · {p.club}</div>
              {stats.map((s) => {
                const val = p.ratings[s.key];
                return (
                  <div key={s.key} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-zinc-500 w-16 shrink-0">{s.label}</span>
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${val}%`, background: ratingColor(val) }}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-300 w-5 text-right">{val}</span>
                  </div>
                );
              })}
              <button
                onClick={() => onRemove(p.name)}
                className="mt-2 w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {shown.map((p) => (
        <div key={p.name} className="opacity-80">
          <ScoutCard player={p} isSaved={true} onToggleSave={onRemove} />
        </div>
      ))}
    </div>
  );
}

export default function PitchIQ() {
  const [tab, setTab] = useState<Tab>("matches");
  const [league, setLeague] = useState<League>("epl");
  const [aiCache, setAiCache] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [scoutedPlayers, setScoutedPlayers] = useState<PlayerReport[]>([]);
  const [savedPlayers, setSavedPlayers] = useState<PlayerReport[]>([]);
  const [playerInput, setPlayerInput] = useState("");
  const [scouting, setScouting] = useState(false);
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [scoutError, setScoutError] = useState("");

  const analyzeMatch = useCallback(async (id: string) => {
    const match = LEAGUES[league].find((m) => m.id === id);
    if (!match) return;
    setAnalyzing(id);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiCache((prev) => ({ ...prev, [id]: data.analysis }));
      }
    } catch {
      console.error("Analysis failed");
    }
    setAnalyzing(null);
  }, [league]);

  const scoutPlayer = useCallback(async (name?: string) => {
    const playerName = name ?? playerInput.trim();
    if (!playerName) return;
    setScouting(true);
    setScoutError("");
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName }),
      });
      const data = await res.json();
      if (data.report) {
        setScoutedPlayers((prev) => {
          const filtered = prev.filter((p) => p.name !== data.report.name);
          return [data.report, ...filtered];
        });
      }
    } catch {
      setScoutError("Could not generate scouting report. Please try again.");
    }
    setScouting(false);
  }, [playerInput]);

  const findSimilar = useCallback(async () => {
    const q = simInput.trim();
    if (!q) return;
    setSimLoading(true);
    setSimResult("");
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.result) setSimResult(data.result);
    } catch {
      setSimResult("Could not find similar players. Please try again.");
    }
    setSimLoading(false);
  }, [simInput]);

  const toggleSave = useCallback((name: string) => {
    const player = scoutedPlayers.find((p) => p.name === name)
      ?? savedPlayers.find((p) => p.name === name);
    if (!player) return;
    setSavedPlayers((prev) => {
      const exists = prev.some((p) => p.name === name);
      return exists ? prev.filter((p) => p.name !== name) : [...prev, player];
    });
  }, [scoutedPlayers, savedPlayers]);

  const matches = LEAGUES[league];

  return (
    <div className="min-h-screen bg-zinc-950">
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .prob-bar { height: 4px; border-radius: 2px; overflow: hidden; display: flex; gap: 1px; }
        .prob-home { background: #166534; border-radius: 2px 0 0 2px; }
        .prob-draw { background: #4b5563; }
        .prob-away { background: #1e40af; border-radius: 0 2px 2px 0; }
        .ratings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #3f3f46; border-top: 1px solid #3f3f46; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-xl shrink-0">⚽</div>
          <div>
            <div className="text-xl font-medium text-white">PitchIQ</div>
            <div className="text-xs text-zinc-500">AI Match Analyst & Scout</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-5">
          {(["matches", "scout", "compare"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                tab === t
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "matches" && "📅"}
              {t === "scout" && "🔍"}
              {t === "compare" && "⇄"}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "compare" && savedPlayers.length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center">
                  {savedPlayers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* MATCHES */}
        {tab === "matches" && (
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              {(Object.keys(LEAGUE_LABELS) as League[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLeague(l)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    league === l
                      ? "bg-emerald-800 border-emerald-700 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {LEAGUE_LABELS[l]}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  aiAnalysis={aiCache[match.id]}
                  onAnalyze={analyzeMatch}
                  analyzing={analyzing === match.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* SCOUT */}
        {tab === "scout" && (
          <div>
            <div className="mb-4">
              <div className="text-sm font-medium text-white mb-1">Scout any player</div>
              <div className="text-xs text-zinc-500">Generate AI scouting reports. Save players to compare them.</div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && scoutPlayer()}
                placeholder="e.g. Bukayo Saka, Pedri, Haaland…"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-700"
              />
              <button
                onClick={() => scoutPlayer()}
                disabled={scouting}
                className="px-4 py-2.5 rounded-lg bg-emerald-800 text-white text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-emerald-700 transition-colors"
              >
                {scouting ? <LoadingDots /> : "Scout"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {QUICK_PLAYERS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPlayerInput(p); scoutPlayer(p); }}
                  className="px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:border-emerald-700 hover:text-emerald-400 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Similarity Search */}
            <div className="mb-5">
              <div className="text-xs font-medium text-blue-400 mb-2">✦ Find me a player like…</div>
              <div className="flex gap-2 mb-2">
                <input
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && findSimilar()}
                  placeholder="e.g. Pirlo but younger, a faster Thiago…"
                  className="flex-1 bg-zinc-900 border border-dashed border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={findSimilar}
                  disabled={simLoading}
                  className="px-4 py-2.5 rounded-lg bg-blue-900 text-blue-200 text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-blue-800 transition-colors"
                >
                  {simLoading ? <LoadingDots /> : "Find"}
                </button>
              </div>
              {simResult && (
                <div className="bg-zinc-900 border-l-2 border-blue-600 rounded-r-lg p-3">
                  <div className="text-xs text-blue-400 font-medium mb-2">Scout recommendations</div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{simResult}</p>
                </div>
              )}
            </div>

            {scoutError && (
              <div className="text-sm text-red-400 mb-3">{scoutError}</div>
            )}

            <div className="space-y-4">
              {scouting && (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  <LoadingDots /> <span className="ml-2">Scouting player…</span>
                </div>
              )}
              {scoutedPlayers.length === 0 && !scouting ? (
                <div className="text-center py-12 text-zinc-600">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="text-sm">Search a player above to generate their scouting report</p>
                </div>
              ) : (
                scoutedPlayers.map((p) => (
                  <ScoutCard
                    key={p.name}
                    player={p}
                    isSaved={savedPlayers.some((s) => s.name === p.name)}
                    onToggleSave={toggleSave}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* COMPARE */}
        {tab === "compare" && (
          <ComparePanel players={savedPlayers} onRemove={toggleSave} />
        )}
      </div>
    </div>
  );
}
