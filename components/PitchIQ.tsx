"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { pitchPositionFromGrid } from "@/lib/tsdb";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  obsidian: "#0B0C10",
  charcoal: "#1F2833",
  c2: "#161d27",
  c3: "#26303d",
  c4: "#2f3b4a",
  cyan: "#66FCF1",
  cyanDim: "rgba(102,252,241,0.1)",
  cyanBorder: "rgba(102,252,241,0.22)",
  ice: "#C5C6C7",
  iceDim: "rgba(197,198,199,0.5)",
  iceFaint: "rgba(197,198,199,0.1)",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#60a5fa",
  border: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.1)",
};

const rc = (r: number) =>
  r >= 7.5 ? C.green : r >= 6.5 ? C.amber : C.red;
const rcBg = (r: number) =>
  r >= 7.5
    ? "rgba(34,197,94,0.15)"
    : r >= 6.5
    ? "rgba(245,158,11,0.12)"
    : "rgba(239,68,68,0.12)";
const attrColor = (v: number) =>
  v >= 80 ? C.cyan : v >= 65 ? C.amber : C.red;

function TeamBadge({
  src,
  abbr,
  international,
}: {
  src?: string;
  abbr: string;
  international?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: international ? 28 : 24,
          height: international ? 20 : 24,
          objectFit: international ? "cover" : "contain",
          flexShrink: 0,
          borderRadius: international ? 2 : 0,
          border: international ? `1px solid ${C.border2}` : "none",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: C.c3,
        border: `1px solid ${C.border2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 8,
        fontWeight: 700,
        color: C.iceDim,
        flexShrink: 0,
        fontFamily: "'JetBrains Mono',monospace",
      }}
    >
      {abbr}
    </div>
  );
}

function matchEvents(match: { events?: unknown[]; timeline?: unknown[] }) {
  return (match.events || match.timeline || []) as Array<{
    type: string;
    team?: string;
    min?: string;
    label?: string;
    text?: string;
    playerName?: string;
  }>;
}

// ─── Shared atoms ──────────────────────────────────────────────────────────────
function Dots() {
  return (
    <span className="dots">
      <span />
      <span />
      <span />
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "12px 0" }} />;
}

function SLabel({
  children,
  style,
  color,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  color?: string;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".9px",
        color: color || C.cyan,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Tag({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        color,
        background: bg,
        letterSpacing: ".3px",
      }}
    >
      {label}
    </span>
  );
}

function StatBar({
  label,
  hv,
  av,
}: {
  label: string;
  hv: number;
  av: number;
}) {
  const tot = (hv || 0) + (av || 0) || 1;
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.ice,
          minWidth: 26,
          textAlign: "right",
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        {hv}
      </span>
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            background: C.c3,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.round(((hv || 0) / tot) * 100)}%`,
              height: "100%",
              background: C.cyan,
              borderRadius: 2,
              transition: "width .5s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10,
            color: C.iceDim,
            minWidth: 100,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        <div
          style={{
            flex: 1,
            height: 4,
            background: C.c3,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.round(((av || 0) / tot) * 100)}%`,
              height: "100%",
              background: C.blue,
              borderRadius: 2,
              marginLeft: "auto",
              transition: "width .5s ease",
            }}
          />
        </div>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.ice,
          minWidth: 26,
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        {av}
      </span>
    </div>
  );
}

// ─── Date nav builder ──────────────────────────────────────────────────────────
function buildDates() {
  const today = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + (i - 3));
    const key = d.toISOString().split("T")[0];
    const labels = [
      "−3 days",
      "−2 days",
      "Yesterday",
      "Today",
      "Tomorrow",
      "+2 days",
      "+3 days",
      "+4 days",
    ];
    return { key, label: labels[i], isToday: i === 3 };
  });
}

// ─── Tab types ─────────────────────────────────────────────────────────────────
type MatchTab =
  | "preview"
  | "lineup"
  | "commentary"
  | "stats"
  | "table"
  | "review";

// ─── Tab content renderer ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabContent({ match, tab, data }: { match: any; tab: MatchTab; data: any }) {
  // ── PREVIEW ──────────────────────────────────────────────────────────────────
  if (tab === "preview") {
    return (
      <div className="animate-in">
        <SLabel>AI Prediction</SLabel>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
              color: C.ice,
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            {data.prediction || "—"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[
              {
                l: `${match.home.split(" ")[0]} ${data.homeWin || 45}%`,
                bg: C.cyanDim,
                c: C.cyan,
              },
              {
                l: `Draw ${data.draw || 25}%`,
                bg: C.iceFaint,
                c: C.iceDim,
              },
              {
                l: `${match.away.split(" ").slice(-1)[0]} ${data.awayWin || 30}%`,
                bg: "rgba(96,165,250,0.1)",
                c: C.blue,
              },
            ].map((p) => (
              <span
                key={p.l}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 20,
                  color: p.c,
                  background: p.bg,
                }}
              >
                {p.l}
              </span>
            ))}
          </div>
        </div>
        <Divider />
        <SLabel>Predicted Scorers</SLabel>
        <p style={{ fontSize: 13, color: C.ice, marginBottom: 4 }}>
          {data.homeScorerPred || `${match.home}: Striker (Expected 34')`}
        </p>
        <p style={{ fontSize: 13, color: C.ice, marginBottom: 12 }}>
          {data.awayScorerPred || `${match.away}: Attacker (Expected 67')`}
        </p>
        <Divider />
        <SLabel>Team Form</SLabel>
        {[
          { name: match.home, form: data.homeForm },
          { name: match.away, form: data.awayForm },
        ].map((t) => (
          <div key={t.name} style={{ marginBottom: 10 }}>
            <div
              style={{ fontSize: 12, color: C.iceDim, marginBottom: 4 }}
            >
              {t.name}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(t.form || ["W", "W", "D", "L", "W"]).map(
                (r: string, i: number) => (
                  <span
                    key={i}
                    className={`form-dot form-${r.toLowerCase()}`}
                  >
                    {r}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
        <Divider />
        <SLabel>Head to Head</SLabel>
        {(data.h2h || []).map(
          (
            h: { date: string; result: string; winner: string },
            i: number
          ) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "6px 0",
                borderBottom: `1px solid ${C.border}`,
                fontSize: 12,
                alignItems: "center",
              }}
            >
              <span style={{ color: C.iceDim, minWidth: 58 }}>{h.date}</span>
              <span style={{ flex: 1, color: C.ice }}>{h.result}</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    h.winner === "home"
                      ? C.cyan
                      : h.winner === "away"
                      ? C.blue
                      : C.iceDim,
                }}
              >
                {h.winner === "draw" ? "D" : h.winner === "home" ? "W" : "L"}
              </span>
            </div>
          )
        )}
        {(data.homeTactic || data.awayTactic) && (
          <>
            <Divider />
            <SLabel>Tactics</SLabel>
            {[
              { name: match.home, t: data.homeTactic },
              { name: match.away, t: data.awayTactic },
            ].map((x) => (
              <div
                key={x.name}
                style={{
                  background: C.c3,
                  borderRadius: 8,
                  padding: "9px 12px",
                  marginBottom: 6,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.iceDim,
                    textTransform: "uppercase",
                    letterSpacing: ".4px",
                    marginBottom: 3,
                  }}
                >
                  {x.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.ice,
                    lineHeight: 1.65,
                  }}
                >
                  {x.t || "Tactical analysis generating…"}
                </div>
              </div>
            ))}
          </>
        )}
        {(data.venue || data.referee || data.competition) && (
          <>
            <Divider />
            <SLabel>Match Info</SLabel>
            {[
              ["Venue", data.venue || match.venue],
              ["Referee", data.referee],
              ["Competition", data.competition || match.leagueName],
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <div
                  key={l as string}
                  style={{
                    background: C.c3,
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 4,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                      marginBottom: 2,
                    }}
                  >
                    {l as string}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.ice,
                    }}
                  >
                    {v as string}
                  </div>
                </div>
              ))}
          </>
        )}
        {data.reasoning && (
          <>
            <Divider />
            <SLabel>Reasoning</SLabel>
            <div
              style={{
                fontSize: 13,
                color: C.ice,
                lineHeight: 1.7,
                borderLeft: `2px solid ${C.cyan}`,
                paddingLeft: 12,
              }}
            >
              {data.reasoning}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── LINEUP ───────────────────────────────────────────────────────────────────
  if (tab === "lineup") {
    const isRealData = data.isReal === true;
    const hasPlayers =
      (data.homeLineup?.length || 0) > 0 || (data.awayLineup?.length || 0) > 0;

    if (data.hasLineup === false || (!hasPlayers && data._loaded)) {
      return (
        <div className="animate-in">
          <div
            style={{
              padding: "16px 0",
              textAlign: "center",
              fontSize: 13,
              color: C.iceDim,
            }}
          >
            Official lineups are not yet published for this fixture.
          </div>
        </div>
      );
    }

    const renderPitchPlayer = (
      p: { num: number; name: string; grid?: string; pred?: string },
      side: "home" | "away",
      i: number
    ) => {
      const pos = pitchPositionFromGrid(
        p.grid || `${side === "home" ? 2 : 6}:${(i % 5) + 1}`,
        side
      );
      const rating = p.pred ? parseFloat(p.pred) : 0;
      const borderCol = side === "home" ? C.cyan : C.blue;
      const lastName = String(p.name).split(" ").pop() || p.name;

      return (
        <div
          key={`${side}-${i}-${p.num}`}
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%,-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: side === "home" ? 12 : 11,
            minWidth: 52,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: C.charcoal,
              border: `2px solid ${borderCol}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
            }}
          >
            {p.num}
            {p.pred && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -18,
                  fontSize: 8,
                  fontWeight: 800,
                  padding: "1px 3px",
                  borderRadius: 3,
                  background: rcBg(rating),
                  color: rc(rating),
                  whiteSpace: "nowrap",
                }}
              >
                {p.pred}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 9,
              color: C.ice,
              fontWeight: 600,
              marginTop: 3,
              textShadow: "0 1px 4px #000",
              whiteSpace: "nowrap",
              maxWidth: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
              padding: "0 2px",
            }}
          >
            {lastName}
          </span>
        </div>
      );
    };

    return (
      <div className="animate-in">
        {isRealData && hasPlayers && (
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: `1px solid rgba(34,197,94,0.2)`,
              borderRadius: 6,
              padding: "5px 10px",
              marginBottom: 8,
              fontSize: 11,
              color: C.green,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            ✓ Official lineup confirmed
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span style={{ color: C.cyan }}>
            {match.home}
            {data.homeFormation && (
              <span
                style={{ color: C.iceDim, fontWeight: 400 }}
              >{` (${data.homeFormation})`}</span>
            )}
          </span>
          <span style={{ color: C.blue }}>
            {data.awayFormation && (
              <span
                style={{ color: C.iceDim, fontWeight: 400 }}
              >{`(${data.awayFormation}) `}</span>
            )}
            {match.away}
          </span>
        </div>

        {/* Pitch canvas — home top half, away bottom half */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 420,
            background: "linear-gradient(180deg,#1a331a 0%,#1a331a 49%,#142814 50%,#1a331a 51%,#1a331a 100%)",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: 2,
              background: "rgba(255,255,255,0.18)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 72,
              height: 72,
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: "50%",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "4%",
              left: "20%",
              right: "20%",
              height: "18%",
              border: "1px solid rgba(255,255,255,0.1)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "4%",
              left: "20%",
              right: "20%",
              height: "18%",
              border: "1px solid rgba(255,255,255,0.1)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 8,
              fontSize: 9,
              fontWeight: 700,
              color: C.cyan,
              opacity: 0.7,
              zIndex: 2,
            }}
          >
            {match.home}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 6,
              right: 8,
              fontSize: 9,
              fontWeight: 700,
              color: C.blue,
              opacity: 0.7,
              zIndex: 2,
            }}
          >
            {match.away}
          </div>
          {(data.homeLineup || []).map(
            (
              p: { num: number; name: string; grid?: string; pred?: string },
              i: number
            ) => renderPitchPlayer(p, "home", i)
          )}
          {(data.awayLineup || []).map(
            (
              p: { num: number; name: string; grid?: string; pred?: string },
              i: number
            ) => renderPitchPlayer(p, "away", i)
          )}
        </div>

        {/* List view */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { team: match.home, lineup: data.homeLineup, col: C.cyan },
            { team: match.away, lineup: data.awayLineup, col: C.blue },
          ].map((side) => (
            <div key={side.team}>
              <SLabel color={side.col}>{side.team}</SLabel>
              {(side.lineup || []).map(
                (
                  p: {
                    num: number;
                    name: string;
                    role: string;
                    pred?: string;
                  },
                  i: number
                ) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 0",
                      borderBottom: `1px solid ${C.border}`,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      <span
                        style={{
                          color: C.iceDim,
                          marginRight: 5,
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 10,
                        }}
                      >
                        {p.num}
                      </span>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: C.iceDim,
                        marginLeft: 4,
                      }}
                    >
                      {p.role}
                    </span>
                  </div>
                )
              )}
              {/* Subs */}
              {((side.team === match.home ? data.homeSubs : data.awaySubs) || []).length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                      marginBottom: 4,
                    }}
                  >
                    Substitutes
                  </div>
                  {(
                    side.team === match.home
                      ? data.homeSubs
                      : data.awaySubs
                  ).map((name: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        color: C.iceDim,
                        padding: "3px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {data.lineupNote && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: C.iceDim,
              background: C.c3,
              padding: "8px 12px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
            }}
          >
            {data.lineupNote}
          </div>
        )}
      </div>
    );
  }

  // ── REVIEW ───────────────────────────────────────────────────────────────────
  if (tab === "review") {
    return (
      <div className="animate-in">
        {data.manOfMatch && (
          <div
            style={{
              background: "rgba(102,252,241,0.07)",
              border: `1px solid ${C.cyanBorder}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>⭐</span>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: C.cyan,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                }}
              >
                Man of the Match
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.ice,
                }}
              >
                {data.manOfMatch}
              </div>
            </div>
          </div>
        )}

        <SLabel>Goal Scorers</SLabel>
        {(data.scorers || []).length === 0 && (
          <p
            style={{ fontSize: 12, color: C.iceDim, marginBottom: 12 }}
          >
            No goals recorded
          </p>
        )}
        {(data.scorers || []).map(
          (
            s: {
              minute: string;
              name: string;
              type: string;
              assist: string;
              team: string;
            },
            i: number
          ) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "6px 0",
                borderBottom: `1px solid ${C.border}`,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: C.cyan,
                  fontWeight: 700,
                  minWidth: 28,
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {s.minute}&apos;
              </span>
              <div>
                <div style={{ color: C.ice, fontWeight: 500 }}>
                  ⚽ {s.name}
                </div>
                <div style={{ color: C.iceDim }}>
                  {s.type}
                  {s.assist ? ` · Assist: ${s.assist}` : ""} · {s.team}
                </div>
              </div>
            </div>
          )
        )}

        <Divider />
        <SLabel>Player Ratings</SLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 5,
            marginBottom: 12,
          }}
        >
          {(data.ratings || []).map(
            (
              r: {
                name: string;
                pos: string;
                team: string;
                rating: number;
              },
              i: number
            ) => (
              <div
                key={i}
                style={{
                  background: C.c3,
                  borderRadius: 8,
                  padding: "8px 10px",
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: C.ice }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.iceDim }}>
                    {r.pos} · {r.team}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: rc(r.rating),
                    background: rcBg(r.rating),
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {r.rating}
                </div>
              </div>
            )
          )}
        </div>

        <Divider />
        <SLabel>Tactical Review</SLabel>
        {[
          {
            name: match.home,
            t: data.homeReview,
            imp: data.homeImprove,
          },
          {
            name: match.away,
            t: data.awayReview,
            imp: data.awayImprove,
          },
        ].map((x) => (
          <div
            key={x.name}
            style={{
              background: C.c3,
              borderRadius: 8,
              padding: "9px 12px",
              marginBottom: 6,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.iceDim,
                textTransform: "uppercase",
                letterSpacing: ".4px",
                marginBottom: 3,
              }}
            >
              {x.name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.ice,
                lineHeight: 1.6,
                marginBottom: x.imp ? 6 : 0,
              }}
            >
              {x.t}
            </div>
            {x.imp && (
              <div
                style={{
                  fontSize: 12,
                  color: C.amber,
                  lineHeight: 1.5,
                  borderLeft: `2px solid ${C.amber}`,
                  paddingLeft: 8,
                }}
              >
                Improvement: {x.imp}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── COMMENTARY ────────────────────────────────────────────────────────────────
  if (tab === "commentary") {
    const isReal = data.isReal === true;
    const typeColor: Record<string, string> = {
      goal: C.cyan,
      penalty: C.cyan,
      og: C.amber,
      card: C.amber,
      yellow: C.amber,
      redcard: C.red,
      red: C.red,
      chance: C.blue,
      normal: C.ice,
    };
    const typeIcon: Record<string, string> = {
      goal: "⚽",
      penalty: "⚽ (P)",
      og: "⚽ (OG)",
      yellow: "🟨",
      card: "🟨",
      red: "🟥",
      redcard: "🟥",
      chance: "",
      normal: "",
    };
    return (
      <div className="animate-in">
        {isReal && (
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: `1px solid rgba(34,197,94,0.2)`,
              borderRadius: 6,
              padding: "5px 10px",
              marginBottom: 8,
              fontSize: 11,
              color: C.green,
            }}
          >
            ✓ Live match events from TheSportsDB
          </div>
        )}
        {(
          data.events || [
            {
              min: "—",
              text: "No events yet. Check back when the match starts.",
              type: "normal",
            },
          ]
        ).map(
          (
            e: {
              min: string;
              text: string;
              type: string;
              team?: string;
            },
            i: number
          ) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "7px 0",
                borderBottom: `1px solid ${C.border}`,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.cyan,
                  minWidth: 32,
                  paddingTop: 1,
                  fontFamily: "'JetBrains Mono',monospace",
                  flexShrink: 0,
                }}
              >
                {e.min}&apos;
              </span>
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: typeColor[e.type] || C.ice,
                }}
              >
                {typeIcon[e.type] ? `${typeIcon[e.type]} ` : ""}
                {e.text}
              </span>
            </div>
          )
        )}
      </div>
    );
  }

  // ── STATS ──────────────────────────────────────────────────────────────────
  if (tab === "stats") {
    const isReal = data.isReal === true;

    if (data.hasStats === false) {
      return (
        <div className="animate-in">
          <div
            style={{
              padding: "16px 0",
              textAlign: "center",
              fontSize: 13,
              color: C.iceDim,
            }}
          >
            Match statistics are not available yet for this fixture.
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in">
        {isReal && (
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: `1px solid rgba(34,197,94,0.2)`,
              borderRadius: 6,
              padding: "5px 10px",
              marginBottom: 10,
              fontSize: 11,
              color: C.green,
            }}
          >
            ✓ Live stats from TheSportsDB
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 700,
            color: C.iceDim,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          <span>{match.home}</span>
          <span>{match.away}</span>
        </div>
        {[
          ["Possession %", data.possession?.home, data.possession?.away],
          ["Shots", data.shots?.home, data.shots?.away],
          ["Shots on target", data.shotsOnTarget?.home, data.shotsOnTarget?.away],
          ["Shots off target", data.shotsOffTarget?.home, data.shotsOffTarget?.away],
          ["Corners", data.corners?.home, data.corners?.away],
          ["Fouls", data.fouls?.home, data.fouls?.away],
          ["Offsides", data.offsides?.home, data.offsides?.away],
          ["Yellow cards", data.yellowCards?.home, data.yellowCards?.away],
          ["Red cards", data.redCards?.home, data.redCards?.away],
          ["GK saves", data.gkSaves?.home, data.gkSaves?.away],
          ["Passes", data.passes?.home, data.passes?.away],
        ].map(([l, h, a]) => (
          <StatBar
            key={l as string}
            label={l as string}
            hv={(h as number) ?? 0}
            av={(a as number) ?? 0}
          />
        ))}
      </div>
    );
  }

  // ── TABLE ──────────────────────────────────────────────────────────────────
  if (tab === "table") {
    const teams = data.teams || [];

    if (data.hasTable === false || (data._loaded && teams.length === 0)) {
      return (
        <div className="animate-in">
          <div
            style={{
              padding: "16px 0",
              textAlign: "center",
              fontSize: 13,
              color: C.iceDim,
            }}
          >
            Standings are not available for this competition right now.
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in">
        {data.isWorldCup && data.groupName && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.cyan,
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: 8,
            }}
          >
            {data.groupName}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "24px 1fr 28px 28px 28px 28px 36px",
            gap: 3,
            padding: "4px 0 8px",
            borderBottom: `1px solid ${C.border2}`,
            fontSize: 10,
            fontWeight: 700,
            color: C.iceDim,
            textTransform: "uppercase",
            letterSpacing: ".4px",
          }}
        >
          <span style={{ textAlign: "center" }}>#</span>
          <span>Club</span>
          <span style={{ textAlign: "center" }}>P</span>
          <span style={{ textAlign: "center" }}>W</span>
          <span style={{ textAlign: "center" }}>D</span>
          <span style={{ textAlign: "center" }}>L</span>
          <span style={{ textAlign: "center" }}>Pts</span>
        </div>
        {teams.map(
          (t: {
            pos: number;
            name: string;
            played: number;
            won: number;
            drawn: number;
            lost: number;
            gd?: string;
            pts: number;
          }) => {
            const hl =
              t.name === match.home || t.name === match.away;
            return (
              <div
                key={t.pos}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr 28px 28px 28px 28px 36px",
                  gap: 3,
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 12,
                  alignItems: "center",
                  background: hl
                    ? "rgba(102,252,241,0.04)"
                    : "transparent",
                  borderRadius: hl ? 4 : 0,
                }}
              >
                <span
                  style={{
                    textAlign: "center",
                    color: hl ? C.cyan : C.iceDim,
                    fontWeight: hl ? 700 : 400,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.pos}
                </span>
                <span
                  style={{
                    color: hl ? C.cyan : C.ice,
                    fontWeight: hl ? 600 : 400,
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: C.iceDim,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.played}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: C.iceDim,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.won}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: C.iceDim,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.drawn}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: C.iceDim,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.lost}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    color: C.ice,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {t.pts}
                </span>
              </div>
            );
          }
        )}
      </div>
    );
  }

  return null;
}

// ─── Match expanded panel ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatchExpanded({
  match,
  cache,
  onLoadTab,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: any;
  cache: Record<string, unknown>;
  onLoadTab: (tab: MatchTab) => void;
}) {
  const isFinal = match.status === "final";
  const isLive = match.status === "live";

  const tabs: { id: MatchTab; label: string }[] =
    isFinal
      ? [
          { id: "review", label: "Review" },
          { id: "lineup", label: "Lineups" },
          { id: "commentary", label: "Timeline" },
          { id: "stats", label: "Stats" },
          { id: "table", label: "Table" },
        ]
      : isLive
      ? [
          { id: "commentary", label: "Live" },
          { id: "stats", label: "Stats" },
          { id: "lineup", label: "Lineups" },
          { id: "table", label: "Table" },
        ]
      : [
          { id: "preview", label: "Preview" },
          { id: "lineup", label: "Lineups" },
          { id: "table", label: "Table" },
        ];

  const defaultTab: MatchTab = isFinal
    ? "review"
    : isLive
    ? "commentary"
    : "preview";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);

  useEffect(() => {
    if (!cache[activeTab]) onLoadTab(activeTab);
  }, [activeTab, cache, onLoadTab]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = cache[activeTab] as Record<string, any> | undefined;

  return (
    <div
      style={{ borderTop: `1px solid ${C.border}`, background: C.c2 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: `1px solid ${C.border}`,
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flexShrink: 0,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: activeTab === t.id ? 600 : 400,
              fontFamily: "'Space Grotesk',sans-serif",
              color: activeTab === t.id ? C.cyan : C.iceDim,
              background: "none",
              border: "none",
              borderBottom: `2px solid ${
                activeTab === t.id ? C.cyan : "transparent"
              }`,
              cursor: "pointer",
              transition: "all .12s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "14px 12px", minHeight: 80 }}>
        {!data ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: C.iceDim,
              fontSize: 13,
            }}
          >
            <Dots /> Loading…
          </div>
        ) : data._error ? (
          <div
            style={{
              padding: "12px 0",
              fontSize: 13,
              color: C.red,
              textAlign: "center",
            }}
          >
            Could not load this tab. Please try again.
          </div>
        ) : (
          <TabContent match={match} tab={activeTab} data={data} />
        )}
      </div>
    </div>
  );
}

// ─── Match card ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const [tabCache, setTabCache] = useState<Record<string, unknown>>({});

  const loadTab = useCallback(
    async (tab: MatchTab) => {
      if (tabCache[tab]) return;
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match, type: tab }),
          cache: "no-store",
        });
        const payload = await res.json();
        const data = payload?.data;
        setTabCache((prev) => ({
          ...prev,
          [tab]: data
            ? { ...data, _loaded: true }
            : { _empty: true, _loaded: true },
        }));
      } catch {
        setTabCache((prev) => ({ ...prev, [tab]: { _error: true, _loaded: true } }));
      }
    },
    [match, tabCache]
  );

  const isFinal = match.status === "final";
  const isLive = match.status === "live";
  const winH =
    isFinal && match.hasScore && match.score.home > match.score.away;
  const winA =
    isFinal && match.hasScore && match.score.away > match.score.home;

  // For live games that have a real score but haven't been marked final yet
  const showScore = (isFinal || isLive) && match.hasScore;

  return (
    <div
      style={{
        background: C.charcoal,
        borderRadius: 10,
        border: `1px solid ${
          expanded
            ? C.cyanBorder
            : isLive
            ? "rgba(239,68,68,0.35)"
            : C.border
        }`,
        overflow: "hidden",
        marginBottom: 3,
        transition: "border-color .15s",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 72px 1fr",
          alignItems: "center",
          gap: 6,
          padding: "11px 12px",
        }}
      >
        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <TeamBadge
            src={match.homeFlag || match.homeLogo}
            abbr={match.homeAbbr}
            international={match.isInternational}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: winA ? C.iceDim : C.ice,
              lineHeight: 1.2,
            }}
          >
            {match.home}
          </span>
        </div>

        {/* Middle: score / live min / kick-off */}
        <div style={{ textAlign: "center" }}>
          {isLive ? (
            <div>
              {showScore && (
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.ice,
                    letterSpacing: 2,
                    fontFamily: "'JetBrains Mono',monospace",
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  {match.score.home}–{match.score.away}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    background: C.red,
                    borderRadius: "50%",
                    animation: "live-pulse 1.5s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.red,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {match.liveMin || "LIVE"}
                </span>
              </div>
            </div>
          ) : isFinal ? (
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: C.ice,
                letterSpacing: 2,
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              {match.hasScore
                ? `${match.score.home}–${match.score.away}`
                : "FT"}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.iceDim }}>
              {match.kick || "TBD"}
            </div>
          )}
        </div>

        {/* Away */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexDirection: "row-reverse",
          }}
        >
          <TeamBadge
            src={match.awayFlag || match.awayLogo}
            abbr={match.awayAbbr}
            international={match.isInternational}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: winH ? C.iceDim : C.ice,
              textAlign: "right",
              lineHeight: 1.2,
            }}
          >
            {match.away}
          </span>
        </div>
      </div>

      {/* Goal events strip below score (for live/final) */}
      {matchEvents(match).length > 0 && (
        <div
          style={{
            padding: "4px 12px 6px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {matchEvents(match).map((e, i) => {
            const icon =
              e.type === "goal"
                ? "⚽"
                : e.type === "card"
                ? "🟨"
                : e.type === "sub"
                ? "↔"
                : "•";
            const label =
              e.label ||
              e.text ||
              (e.type === "sub"
                ? e.playerName
                : `${e.playerName || "Event"}${e.min ? ` ${e.min}'` : ""}`);
            return (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  color: e.team === "home" ? C.cyan : C.blue,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {icon}{" "}
                <span style={{ color: C.iceDim }}>{label}</span>
              </span>
            );
          })}
        </div>
      )}

      {expanded && (
        <MatchExpanded
          match={match}
          cache={tabCache}
          onLoadTab={loadTab}
        />
      )}
    </div>
  );
}

// ─── Scores panel ──────────────────────────────────────────────────────────────
function ScoresPanel() {
  const dates = buildDates();
  const todayKey =
    dates.find((d) => d.isToday)?.key ||
    new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const PRIORITY = [
    "world cup",
    "premier league",
    "champions league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "mls",
    "primera division",
    "eredivisie",
  ];

  useEffect(() => {
    let active = true;
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const res = await fetch(`/api/matches?date=${selectedDate}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (active && payload.matches) {
          const sorted = payload.matches.sort(
            (
              a: { leagueName: string; league: string; status: string },
              b: { leagueName: string; league: string; status: string }
            ) => {
              const aP = PRIORITY.findIndex((l) =>
                (a.leagueName || a.league || "").toLowerCase().includes(l)
              );
              const bP = PRIORITY.findIndex((l) =>
                (b.leagueName || b.league || "").toLowerCase().includes(l)
              );
              const aScore = aP === -1 ? 999 : aP;
              const bScore = bP === -1 ? 999 : bP;
              if (aScore !== bScore) return aScore - bScore;
              if (a.status === "live" && b.status !== "live") return -1;
              if (b.status === "live" && a.status !== "live") return 1;
              return 0;
            }
          );
          setMatches(sorted);
        }
      } catch {
        /* silent */
      }
      if (initial) setLoading(false);
    }
    load(true);
    const interval = setInterval(() => load(false), 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byLeague: Record<string, any[]> = {};
  matches.forEach((m) => {
    const key = m.leagueName || m.league || "Other";
    if (!byLeague[key]) byLeague[key] = [];
    byLeague[key].push(m);
  });

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div>
      {/* Date nav */}
      <div
        style={{
          background: C.charcoal,
          borderBottom: `1px solid ${C.border}`,
          padding: "8px 12px",
          display: "flex",
          gap: 5,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {dates.map((d) => (
          <button
            key={d.key}
            onClick={() => setSelectedDate(d.key)}
            style={{
              flexShrink: 0,
              padding: "5px 11px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: d.isToday ? 600 : 400,
              fontFamily: "'Space Grotesk',sans-serif",
              color:
                selectedDate === d.key ? "#0B0C10" : C.iceDim,
              background:
                selectedDate === d.key ? C.cyan : "transparent",
              border: `1px solid ${
                selectedDate === d.key ? C.cyan : C.border2
              }`,
              cursor: "pointer",
              transition: "all .12s",
              whiteSpace: "nowrap",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Live indicator */}
      {liveCount > 0 && (
        <div
          style={{
            background: "rgba(239,68,68,0.07)",
            borderBottom: `1px solid rgba(239,68,68,0.18)`,
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              background: C.red,
              borderRadius: "50%",
              animation: "live-pulse 1.5s infinite",
            }}
          />
          <span
            style={{ fontSize: 12, color: C.red, fontWeight: 600 }}
          >
            {liveCount} match{liveCount > 1 ? "es" : ""} live now —
            refreshing every 10s
          </span>
        </div>
      )}

      <div style={{ padding: "6px 12px 24px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: C.iceDim,
              fontSize: 13,
            }}
          >
            <Dots /> Loading matches…
          </div>
        ) : !matches.length ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: C.iceDim,
              fontSize: 13,
            }}
          >
            No matches found for this date.
          </div>
        ) : (
          Object.entries(byLeague).map(([lg, ms]) => (
            <div key={lg} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0 6px",
                }}
              >
                {ms[0].leagueLogo ? (
                  <img
                    src={ms[0].leagueLogo}
                    alt=""
                    style={{ width: 18, height: 18, objectFit: "contain" }}
                    onError={(e) =>
                      (e.currentTarget.style.display = "none")
                    }
                  />
                ) : (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: C.c4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 6,
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {lg.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.iceDim,
                  }}
                >
                  {lg}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: C.iceDim,
                    marginLeft: "auto",
                  }}
                >
                  {ms.length} game{ms.length > 1 ? "s" : ""}
                </span>
              </div>
              {ms.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── News panel ────────────────────────────────────────────────────────────────
function NewsPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => {
        if (d.news) setNews(d.news);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 16px",
            color: C.iceDim,
          }}
        >
          <Dots /> Fetching news…
        </div>
      )}
      {!loading && !news.length && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 16px",
            color: C.iceDim,
            fontSize: 13,
          }}
        >
          No news available right now.
        </div>
      )}
      {news.map((n, i) => (
        <div
          key={i}
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${C.border}`,
            background: n.confirmed
              ? "rgba(102,252,241,0.03)"
              : "transparent",
            borderLeft: n.confirmed
              ? `3px solid ${C.cyan}`
              : "3px solid transparent",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.cyan,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                }}
              >
                {n.source}
              </span>
              {n.tag === "done" && (
                <Tag
                  label="Done Deal"
                  color={C.cyan}
                  bg="rgba(102,252,241,0.12)"
                />
              )}
              {n.tag === "rumor" && (
                <Tag
                  label="Rumor"
                  color={C.amber}
                  bg="rgba(245,158,11,0.1)"
                />
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 10, color: C.iceDim }}>
                {n.time}
              </span>
              <a
                href={
                  n.url ||
                  `https://www.google.com/search?q=${encodeURIComponent(n.headline)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: C.cyan,
                  fontSize: 12,
                  textDecoration: "none",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                ↗
              </a>
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: C.ice,
              lineHeight: 1.4,
              marginBottom: 4,
            }}
          >
            {n.headline}
          </div>
          {n.snippet && (
            <div
              style={{
                fontSize: 12,
                color: C.iceDim,
                lineHeight: 1.55,
              }}
            >
              {n.snippet}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Scout panel ───────────────────────────────────────────────────────────────
function ScoutPanel() {
  const [input, setInput] = useState("");
  const [simInput, setSimInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");

  const gems = [
    "Rayan Cherki",
    "Sverre Nypan",
    "Yankuba Minteh",
    "Mikautadze",
    "Enzo Millot",
    "Cyril Ngonge",
  ];
  const stars = [
    "Erling Haaland",
    "Lamine Yamal",
    "Pedri",
    "Vinicius Jr",
    "Mohamed Salah",
  ];

  const STAT_KEYS = [
    ["pace", "Pace"],
    ["technical", "Tech"],
    ["physical", "Phys"],
    ["mental", "Mental"],
    ["defending", "Def"],
    ["shooting", "Shot"],
  ] as const;

  const scout = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setReport(null);
    setError("");
    setInput(name);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const payload = await res.json();
      if (payload.report) {
        setReport(payload.report);
      } else {
        setError(payload.error || "Could not generate scouting report. Try again.");
      }
    } catch {
      setError("Scout engine timed out or failed. Please try again.");
    }
    setLoading(false);
  };

  const findSimilar = async () => {
    if (!simInput.trim()) return;
    setSimLoading(true);
    setSimResult("");
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: simInput }),
      });
      const payload = await res.json();
      setSimResult(
        payload.result || "No results found. Try a different description."
      );
    } catch {
      setSimResult("Could not complete similarity check. Try again.");
    }
    setSimLoading(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: C.ice,
            marginBottom: 3,
          }}
        >
          Scout AI
        </div>
        <div style={{ fontSize: 12, color: C.iceDim }}>
          Stars, hidden gems, wonderkids — grounded in TheSportsDB +
          Claude AI
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scout(input)}
          placeholder="Search any player worldwide…"
          style={{
            flex: 1,
            background: C.charcoal,
            border: `1px solid ${C.border2}`,
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: C.ice,
            outline: "none",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        />
        <button
          onClick={() => scout(input)}
          disabled={loading}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: `1px solid ${C.cyan}`,
            background: loading ? C.c3 : C.cyanDim,
            color: C.cyan,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          {loading ? <Dots /> : "Scout"}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 10,
            color: C.iceDim,
            textTransform: "uppercase",
            letterSpacing: ".5px",
            marginBottom: 5,
          }}
        >
          Hidden Gems 💎
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}
        >
          {gems.map((g) => (
            <button
              key={g}
              onClick={() => scout(g)}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 14,
                border: `1px solid rgba(102,252,241,0.28)`,
                background: "rgba(102,252,241,0.06)",
                color: C.cyan,
                cursor: "pointer",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: 10,
            color: C.iceDim,
            textTransform: "uppercase",
            letterSpacing: ".5px",
            marginBottom: 5,
          }}
        >
          World Class
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {stars.map((s) => (
            <button
              key={s}
              onClick={() => scout(s)}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 14,
                border: `1px solid ${C.border2}`,
                background: C.c3,
                color: C.ice,
                cursor: "pointer",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Similarity search */}
      <div
        style={{
          background: C.charcoal,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.blue,
            textTransform: "uppercase",
            letterSpacing: ".5px",
            marginBottom: 6,
          }}
        >
          Find me a player like…
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={simInput}
            onChange={(e) => setSimInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && findSimilar()}
            placeholder="e.g. a younger Pirlo, budget Haaland…"
            style={{
              flex: 1,
              background: C.c3,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 12,
              color: C.ice,
              outline: "none",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          />
          <button
            onClick={findSimilar}
            disabled={simLoading}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid rgba(96,165,250,0.3)`,
              background: "rgba(96,165,250,0.1)",
              color: C.blue,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            {simLoading ? <Dots /> : "Find"}
          </button>
        </div>
        {simResult && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: C.ice,
              lineHeight: 1.7,
              borderLeft: `2px solid ${C.blue}`,
              paddingLeft: 10,
            }}
          >
            {simResult}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            background: C.charcoal,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            padding: 20,
            textAlign: "center",
            color: C.iceDim,
            fontSize: 13,
          }}
        >
          <Dots />
          <span style={{ marginLeft: 8 }}>
            Fetching player profile and AI analysis…
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: `1px solid rgba(239,68,68,0.2)`,
            borderRadius: 8,
            padding: "10px 14px",
            color: C.red,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div
          className="animate-in"
          style={{
            background: C.charcoal,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px",
              background: "linear-gradient(135deg,#0a1e12,#0f2e1c)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: `1px solid ${C.cyanBorder}`,
            }}
          >
            {report.playerThumb || report.playerCutout ? (
              <img
                src={report.playerThumb || report.playerCutout}
                alt={report.name}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${C.cyanBorder}`,
                  flexShrink: 0,
                }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(102,252,241,0.12)",
                  border: `2px solid ${C.cyanBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 700,
                  color: C.cyan,
                  flexShrink: 0,
                }}
              >
                {String(report.name || "")
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.ice,
                }}
              >
                {report.name}
              </div>
              <div style={{ fontSize: 11, color: C.iceDim }}>
                {report.position} · {report.club} · {report.nationality}
                {report.age ? ` · Age ${report.age}` : ""}
              </div>
              {(report.height || report.weight || report.preferredFoot) && (
                <div style={{ fontSize: 10, color: C.iceDim, marginTop: 2 }}>
                  {[report.height, report.weight, report.preferredFoot !== "—" ? `${report.preferredFoot} foot` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
              {Boolean(report.hidden_gem) && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "#fef08a",
                    color: "#713f12",
                    padding: "2px 7px",
                    borderRadius: 3,
                    display: "inline-block",
                    marginTop: 3,
                  }}
                >
                  💎 Hidden Gem
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: C.cyan,
                fontFamily: "'JetBrains Mono',monospace",
                flexShrink: 0,
              }}
            >
              {report.overall}
            </div>
          </div>

          {/* Attribute grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 1,
              background: C.border,
            }}
          >
            {STAT_KEYS.map(([key, label]) => {
              const v = (
                report.ratings as Record<string, number>
              )?.[key] ?? 0;
              return (
                <div
                  key={key}
                  style={{
                    padding: "9px 4px",
                    background: C.charcoal,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: attrColor(v),
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                      marginTop: 1,
                    }}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Season stats */}
          {report.seasonStats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 1,
                background: C.border,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {(
                [
                  ["Goals", report.seasonStats.goals],
                  ["Assists", report.seasonStats.assists],
                  ["Apps", report.seasonStats.apps],
                  ["Rating", report.seasonStats.avgRating],
                ] as [string, string | number][]
              ).map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    padding: "7px 4px",
                    background: C.c2,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.ice,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".3px",
                      marginTop: 1,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: 14 }}>
            {/* Past season history */}
            {report.pastSeasonStats && report.pastSeasonStats.length > 0 && (
              <>
                <SLabel>Historical Stats</SLabel>
                <div style={{ marginBottom: 12 }}>
                  {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                  report.pastSeasonStats.map((sh: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: C.ice,
                        padding: "5px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <span style={{ color: C.iceDim }}>
                        {sh.year} · {sh.club}
                      </span>
                      <span style={{ color: C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>
                        {sh.goals}G / {sh.assists}A ({sh.apps} apps)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Strengths */}
            {report.strengths?.length > 0 && (
              <>
                <SLabel>Strengths</SLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    marginBottom: 12,
                  }}
                >
                  {(report.strengths as string[]).map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 10,
                        background: "rgba(34,197,94,0.1)",
                        color: C.green,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Weaknesses */}
            {report.weaknesses?.length > 0 && (
              <>
                <SLabel>Weaknesses</SLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    marginBottom: 12,
                  }}
                >
                  {(report.weaknesses as string[]).map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 10,
                        background: "rgba(239,68,68,0.08)",
                        color: C.red,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Style */}
            {report.style && (
              <>
                <SLabel>Playing Style</SLabel>
                <p
                  style={{
                    fontSize: 13,
                    color: C.ice,
                    lineHeight: 1.7,
                    marginBottom: 12,
                  }}
                >
                  {report.style}
                </p>
              </>
            )}

            {/* Verdict */}
            {report.verdict && (
              <>
                <SLabel>Scout Verdict</SLabel>
                <p
                  style={{
                    fontSize: 13,
                    color: C.ice,
                    lineHeight: 1.7,
                    marginBottom: 14,
                  }}
                >
                  {report.verdict}
                </p>
              </>
            )}

            {/* YouTube highlight — real link or clean fallback */}
            {report.hasHighlight && report.ytLink ? (
              <div>
                <SLabel>Highlight Reel</SLabel>
                <a
                  href={report.ytLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    color: C.ice,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: "#ef4444", fontSize: 20 }}>▶</span>
                  <div>
                    <div style={{ color: C.ice, fontWeight: 600 }}>
                      Watch on YouTube
                    </div>
                    {report.ytTitle && (
                      <div
                        style={{
                          fontSize: 11,
                          color: C.iceDim,
                          marginTop: 1,
                        }}
                      >
                        {report.ytTitle}
                      </div>
                    )}
                  </div>
                </a>
              </div>
            ) : (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  color: C.red,
                  fontSize: 12,
                }}
              >
                No highlight video found for this player right now.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Search result card ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SearchResult({ entity }: { entity: any }) {
  const [aiDetail, setAiDetail] = useState<Record<string, unknown> | null>(
    null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const d = entity.detail || {};
  const typeColor = entity.type === "player" ? C.cyan : C.amber;
  const typeBg =
    entity.type === "player"
      ? C.cyanDim
      : "rgba(245,158,11,0.1)";

  const loadAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entity.name }),
      });
      const { report } = await res.json();
      setAiDetail(report || { _error: true });
    } catch {
      setAiDetail({ _error: true });
    }
    setAiLoading(false);
  };

  return (
    <div
      className="animate-in"
      style={{
        background: C.charcoal,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {entity.logo ? (
          <img
            src={entity.logo}
            alt=""
            style={{
              width: 42,
              height: 42,
              objectFit: "contain",
              flexShrink: 0,
              borderRadius: 6,
            }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: C.c3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: typeColor,
              flexShrink: 0,
            }}
          >
            {entity.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: C.ice,
              }}
            >
              {entity.name}
            </span>
            <Tag label={entity.type} color={typeColor} bg={typeBg} />
          </div>
          <div style={{ fontSize: 12, color: C.iceDim }}>
            {entity.sub}
          </div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {/* Description from TSDB */}
        {d.description && (
          <p
            style={{
              fontSize: 12,
              color: C.iceDim,
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {d.description}
          </p>
        )}

        {/* Club details */}
        {entity.type === "club" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {[
              ["Stadium", d.stadium],
              ["Manager", d.manager],
              ["Founded", d.founded],
              ["Country", d.country],
              ["Capacity", d.capacity],
              ["League", d.league],
            ]
              .filter(([, v]) => v && v !== "—")
              .map(([l, v]) => (
                <div
                  key={l as string}
                  style={{
                    background: C.c3,
                    borderRadius: 8,
                    padding: "8px 10px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                      marginBottom: 2,
                    }}
                  >
                    {l as string}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.ice,
                    }}
                  >
                    {v as string}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Player details from TSDB */}
        {entity.type === "player" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {[
              ["Position", d.position],
              ["Age", d.age],
              ["Nationality", d.nationality],
              ["Height", d.height],
              ["Weight", d.weight],
              ["Club", d.club],
            ]
              .filter(([, v]) => v && v !== "—")
              .map(([l, v]) => (
                <div
                  key={l as string}
                  style={{
                    background: C.c3,
                    borderRadius: 8,
                    padding: "8px 10px",
                    textAlign: "center",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.ice,
                    }}
                  >
                    {v as string}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.iceDim,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                      marginTop: 2,
                    }}
                  >
                    {l as string}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* AI scout button */}
        {entity.type === "player" && !aiDetail && !aiLoading && (
          <button
            onClick={loadAI}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: `1px solid ${C.cyanBorder}`,
              background: C.cyanDim,
              color: C.cyan,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            ✦ Load Full AI Scout Report
          </button>
        )}
        {aiLoading && (
          <div
            style={{
              textAlign: "center",
              color: C.iceDim,
              fontSize: 13,
            }}
          >
            <Dots /> Generating AI analysis…
          </div>
        )}

        {/* AI scout result */}
        {aiDetail && !aiLoading && !(aiDetail._error) && (
          <div>
            <Divider />
            <SLabel>AI Scout Report</SLabel>
            {(aiDetail.ratings as Record<string, number>) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 4,
                  marginBottom: 12,
                  background: C.border,
                }}
              >
                {Object.entries(
                  aiDetail.ratings as Record<string, number>
                ).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      background: C.c3,
                      padding: "7px 4px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: attrColor(v),
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                    >
                      {v}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: C.iceDim,
                        textTransform: "uppercase",
                        letterSpacing: ".3px",
                        marginTop: 1,
                      }}
                    >
                      {k.slice(0, 5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7, marginBottom: 8 }}>
              {aiDetail.style as string}
            </div>
            <div style={{ fontSize: 13, color: C.ice, lineHeight: 1.7 }}>
              {aiDetail.verdict as string}
            </div>
            {/* YouTube link from scout */}
            {(aiDetail.hasHighlight && aiDetail.ytLink) ? (
              <a
                href={aiDetail.ytLink as string}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  borderRadius: 8,
                  color: C.ice,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  marginTop: 10,
                }}
              >
                <span style={{ color: "#ef4444" }}>▶</span> Watch highlights
              </a>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: C.c3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.iceDim,
                  fontSize: 11,
                }}
              >
                No highlight video found for this player right now.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────────
type MainTab = "scores" | "news" | "scout";

export default function PitchIQ() {
  const [mainTab, setMainTab] = useState<MainTab>("scores");
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — won't freeze UI
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/global-search?q=${encodeURIComponent(searchQuery)}`
        );
        const payload = await res.json();
        if (payload.results?.length) {
          setSearchResults(payload.results);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } catch {
        /* silent */
      }
      setSearchLoading(false);
    }, 380);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectResult = (entity: any) => {
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
    <div
      style={{
        minHeight: "100vh",
        background: C.obsidian,
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes live-pulse {
          0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(239,68,68,.4)}
          50%{opacity:.7;box-shadow:0 0 0 5px rgba(239,68,68,0)}
        }
        @keyframes fade-up {
          from{opacity:0;transform:translateY(6px)}
          to{opacity:1;transform:translateY(0)}
        }
        .animate-in { animation: fade-up .18s ease-out both; }
        .dots { display:inline-flex; gap:3px; }
        .dots span {
          display:inline-block; width:5px; height:5px;
          border-radius:50%; background:#66FCF1;
          animation:db 1.2s infinite;
        }
        .dots span:nth-child(2){animation-delay:.18s}
        .dots span:nth-child(3){animation-delay:.36s}
        @keyframes db {
          0%,80%,100%{transform:scale(.5);opacity:.3}
          40%{transform:scale(1);opacity:1}
        }
        .form-dot {
          width:22px;height:22px;border-radius:50%;
          display:inline-flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;
          font-family:'Space Grotesk',sans-serif;
        }
        .form-w{background:rgba(34,197,94,.18);color:#22c55e;border:1px solid rgba(34,197,94,.35)}
        .form-d{background:rgba(197,198,199,.1);color:rgba(197,198,199,.55);border:1px solid rgba(197,198,199,.2)}
        .form-l{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.28)}
        input::placeholder{color:rgba(197,198,199,0.32)}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#26303d;border-radius:2px}
      `}</style>

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.charcoal,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 14px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 50,
            gap: 12,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: C.cyan,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: C.obsidian,
                letterSpacing: "-1px",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              IQ
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.ice,
                letterSpacing: "-.3px",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              PitchIQ
            </span>
          </div>

          {/* Search bar */}
          <div
            ref={searchRef}
            style={{ flex: 1, position: "relative" }}
          >
            <span
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.iceDim,
                fontSize: 14,
                pointerEvents: "none",
              }}
            >
              {searchLoading ? "…" : "⌕"}
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchResults.length > 0 && setShowDropdown(true)
              }
              placeholder="Search players, clubs…"
              style={{
                width: "100%",
                background: C.c3,
                border: `1px solid ${C.border2}`,
                borderRadius: 8,
                padding: "7px 10px 7px 28px",
                fontSize: 12,
                color: C.ice,
                outline: "none",
                fontFamily: "'Space Grotesk',sans-serif",
                transition: "border .12s",
              }}
            />
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: C.charcoal,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  zIndex: 200,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => selectResult(r)}
                    style={{
                      padding: "9px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {r.logo ? (
                      <img
                        src={r.logo}
                        alt=""
                        style={{
                          width: 26,
                          height: 26,
                          objectFit: "contain",
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 4,
                          background: C.c3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: C.iceDim,
                          flexShrink: 0,
                        }}
                      >
                        {r.type === "player" ? "P" : "C"}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: C.ice,
                          fontWeight: 500,
                        }}
                      >
                        {r.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.iceDim,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main tabs */}
        <div
          style={{ display: "flex", borderTop: `1px solid ${C.border}` }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setMainTab(t.id);
                setShowSearch(false);
                setSearchQuery("");
              }}
              style={{
                flex: 1,
                padding: "9px 8px",
                fontSize: 13,
                fontWeight:
                  mainTab === t.id && !showSearch ? 600 : 400,
                fontFamily: "'Space Grotesk',sans-serif",
                color:
                  mainTab === t.id && !showSearch
                    ? C.cyan
                    : C.iceDim,
                background: "none",
                border: "none",
                borderBottom: `2px solid ${
                  mainTab === t.id && !showSearch
                    ? C.cyan
                    : "transparent"
                }`,
                cursor: "pointer",
                transition: "all .12s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {showSearch ? (
        <div style={{ padding: "10px 14px" }}>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
            style={{
              fontSize: 12,
              color: C.cyan,
              background: "none",
              border: "none",
              cursor: "pointer",
              marginBottom: 12,
              fontFamily: "'Space Grotesk',sans-serif",
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
          {searchResults.map((r, i) => (
            <SearchResult key={i} entity={r} />
          ))}
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