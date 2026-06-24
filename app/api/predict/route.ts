import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

interface LineupPlayer {
  num: number;
  name: string;
  role: string;
  grid: string;
}

function tsdbBase(): string {
  const apiKey = process.env.THESPORTSDB_KEY;
  if (!apiKey) throw new Error("THESPORTSDB_KEY not configured");
  return `https://www.thesportsdb.com/api/v1/json/${apiKey}`;
}

async function askHaikuJSON(prompt: string, maxTokens = 700): Promise<Record<string, unknown>> {
  const msg = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const rawText = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  const m = rawText.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

function positionToRow(pos: string): number {
  const p = (pos || "").toLowerCase();
  if (p.includes("goalkeeper") || p === "gk") return 1;
  if (p.includes("defender") || p.includes("back")) return 2;
  if (p.includes("mid")) return 3;
  return 4;
}

function mapRole(pos: string): string {
  const p = (pos || "").toLowerCase();
  if (p.includes("goalkeeper")) return "GK";
  if (p.includes("defender") || p.includes("back")) return "DEF";
  if (p.includes("mid")) return "MID";
  return "FWD";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLineupSide(players: any[], isHome: boolean): LineupPlayer[] {
  const starters = players.filter(
    (p) => (p.strHome === "Yes") === isHome && p.strSubstitute === "No"
  );

  const rowBuckets: Record<number, typeof starters> = { 1: [], 2: [], 3: [], 4: [] };
  starters.forEach((p) => {
    const row = positionToRow(p.strPosition);
    rowBuckets[row].push(p);
  });

  return starters.map((p) => {
    const row = positionToRow(p.strPosition);
    const rowPlayers = rowBuckets[row];
    const idx = rowPlayers.indexOf(p);
    const colCount = rowPlayers.length;
    const col =
      colCount <= 1 ? 3 : Math.min(5, Math.max(1, Math.round((idx / (colCount - 1)) * 4) + 1));

    return {
      num: Number(p.intSquadNumber) || 0,
      name: p.strPlayer || "Unknown",
      role: mapRole(p.strPosition),
      grid: `${row}:${col}`,
    };
  });
}

function inferFormation(lineup: LineupPlayer[]): string {
  const counts = { def: 0, mid: 0, fwd: 0 };
  lineup.forEach((p) => {
    if (p.role === "DEF") counts.def++;
    else if (p.role === "MID") counts.mid++;
    else if (p.role === "FWD") counts.fwd++;
  });
  if (!counts.def && !counts.mid && !counts.fwd) return "";
  return `${counts.def || 4}-${counts.mid || 3}-${counts.fwd || 3}`;
}

async function fetchLineup(matchId: string) {
  const res = await fetch(`${tsdbBase()}/lookuplineup.php?id=${matchId}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { homeLineup: [], awayLineup: [], hasLineup: false, isReal: true };
  const data = await res.json();
  if (!data.lineup?.length) {
    return { homeLineup: [], awayLineup: [], hasLineup: false, isReal: true };
  }

  const homeLineup = mapLineupSide(data.lineup, true);
  const awayLineup = mapLineupSide(data.lineup, false);

  return {
    homeFormation: inferFormation(homeLineup),
    awayFormation: inferFormation(awayLineup),
    homeLineup,
    awayLineup,
    hasLineup: homeLineup.length > 0 || awayLineup.length > 0,
    isReal: true,
  };
}

async function fetchStats(matchId: string) {
  const res = await fetch(`${tsdbBase()}/lookupeventstats.php?id=${matchId}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return { hasStats: false, isReal: true };
  const data = await res.json();
  if (!data.eventstats?.length) return { hasStats: false, isReal: true };

  const get = (statName: string) => {
    const row = data.eventstats.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.strStat === statName
    );
    return {
      home: Number(row?.intHome ?? 0),
      away: Number(row?.intAway ?? 0),
    };
  };

  return {
    possession: get("Ball Possession"),
    shots: get("Total Shots"),
    shotsOnTarget: get("Shots on Goal"),
    shotsOffTarget: get("Shots off Goal"),
    corners: get("Corner Kicks"),
    fouls: get("Fouls"),
    offsides: get("Offsides"),
    yellowCards: get("Yellow Cards"),
    redCards: get("Red Cards"),
    gkSaves: get("Goalkeeper Saves"),
    passes: get("Total passes"),
    hasStats: true,
    isReal: true,
  };
}

async function fetchTable(
  leagueId: string,
  leagueName: string,
  home: string,
  away: string
) {
  const isWC = (leagueName || "").toLowerCase().includes("world cup");
  const seasons = isWC
    ? ["2026", "2025", "2022"]
    : ["2025-2026", "2025", "2024-2025", "2024"];

  for (const season of seasons) {
    try {
      const res = await fetch(
        `${tsdbBase()}/lookuptable.php?l=${leagueId}&s=${season}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim()) continue;
      const data = JSON.parse(text);
      if (!data.table?.length) continue;

      let rows = data.table;

      if (isWC) {
        const homeGroup = rows.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.strTeam === home
        )?.strGroup;
        const awayGroup = rows.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.strTeam === away
        )?.strGroup;
        const group = homeGroup || awayGroup;
        if (group) {
          rows = rows.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.strGroup === group
          );
        } else {
          rows = rows
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((t: any) => t.strGroup)
            .slice(0, 4);
        }
      }

      return {
        teams: rows
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((t: any) => ({
            pos: Number(t.intRank),
            name: t.strTeam,
            played: Number(t.intPlayed),
            won: Number(t.intWin),
            drawn: Number(t.intDraw),
            lost: Number(t.intLoss),
            gd:
              Number(t.intGoalDifference) >= 0
                ? `+${t.intGoalDifference}`
                : String(t.intGoalDifference),
            pts: Number(t.intPoints),
            group: t.strGroup || undefined,
          }))
          .sort(
            (
              a: { pos: number; group?: string },
              b: { pos: number; group?: string }
            ) => a.pos - b.pos
          ),
        isReal: true,
        hasTable: true,
        isWorldCup: isWC,
        groupName: isWC ? rows[0]?.strGroup : undefined,
      };
    } catch {
      continue;
    }
  }

  return { teams: [], isReal: true, hasTable: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTimelineToCommentary(timeline: any[]) {
  return timeline.map((e) => {
    let type = "normal";
    if (["goal", "penalty", "og"].includes(e.type)) type = "goal";
    else if (e.type === "yellow" || e.type === "card") type = "card";
    else if (e.type === "red" || e.type === "redcard") type = "redcard";
    else if (e.type === "subst") type = "normal";

    return {
      min: e.min || "—",
      text:
        e.text ||
        (e.type === "goal"
          ? `Goal — ${e.playerName || "Unknown"}`
          : e.playerName || "Match event"),
      type,
      team: e.team || null,
    };
  });
}

async function fetchCommentary(
  matchId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingTimeline: any[]
) {
  if (existingTimeline?.length) {
    return {
      events: mapTimelineToCommentary(existingTimeline),
      isReal: true,
    };
  }

  const res = await fetch(`${tsdbBase()}/lookuptimeline.php?id=${matchId}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return { events: [], isReal: true };
  const data = await res.json();
  if (!data.timeline?.length) return { events: [], isReal: true };

  const events = data.timeline.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => {
      const team = t.strHome === "Yes" ? "home" : "away";
      const min = String(t.intTime ?? "");
      const kind = (t.strTimeline || "").toLowerCase();
      const detail = (t.strTimelineDetail || "").toLowerCase();

      if (kind === "goal") {
        const assist = t.strAssist?.trim();
        return {
          min,
          text: assist
            ? `Goal — ${t.strPlayer} (assist: ${assist})`
            : `Goal — ${t.strPlayer || "Unknown"}`,
          type: "goal",
          team,
        };
      }
      if (kind === "card") {
        const isRed = detail.includes("red");
        return {
          min,
          text: `${isRed ? "Red" : "Yellow"} card — ${t.strPlayer || "Unknown"}`,
          type: isRed ? "redcard" : "card",
          team,
        };
      }
      if (kind === "subst" || kind === "substitution") {
        const onPlayer = t.strAssist?.trim() || t.strTimelineDetail?.trim() || "";
        return {
          min,
          text: onPlayer
            ? `Sub: ${t.strPlayer} → ${onPlayer}`
            : `Sub: ${t.strPlayer || "Unknown"}`,
          type: "normal",
          team,
        };
      }
      return {
        min,
        text: t.strPlayer || t.strTimeline || "Match event",
        type: "normal",
        team,
      };
    }
  );

  return { events, isReal: true };
}

export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();
    const { home, away, leagueName, score, venue, id, leagueId } = match;

    if (type === "lineup") {
      const data = await fetchLineup(String(id));
      return NextResponse.json({ data });
    }

    if (type === "stats") {
      const data = await fetchStats(String(id));
      return NextResponse.json({ data });
    }

    if (type === "table") {
      const data = await fetchTable(
        String(leagueId || ""),
        leagueName || match.league || "",
        home,
        away
      );
      return NextResponse.json({ data });
    }

    if (type === "commentary") {
      const data = await fetchCommentary(String(id), match.timeline || []);
      return NextResponse.json({ data });
    }

    if (type === "preview") {
      const prompt = `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). Venue: ${venue || "TBD"}.
Respond ONLY valid JSON no backticks:
{"prediction":"2-1","homeWin":55,"draw":25,"awayWin":20,"keyBattle":"One sentence on the key tactical battle.","homeScorerPred":"Likely scorer name (min') — header/penalty/open play","awayScorerPred":"Likely scorer name (min') — open play","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"${venue || "Stadium Name, City"}","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences on ${home} expected tactical setup.","awayTactic":"2 sentences on ${away} expected approach.","reasoning":"3 sentences of analytical reasoning supporting the prediction."}`;
      const data = await askHaikuJSON(prompt, 700);
      return NextResponse.json({ data });
    }

    if (type === "review") {
      const realTimeline: Array<{
        min: string;
        team: string | null;
        type: string;
        text?: string;
        playerName?: string;
      }> = match.timeline || [];
      const realGoals = realTimeline.filter((e) =>
        ["goal", "penalty", "og"].includes(e.type)
      );
      const scorersContext =
        realGoals.length > 0
          ? `Real goals: ${realGoals
              .map(
                (g) =>
                  `${g.playerName || "Unknown"} (${g.min}') for ${
                    g.team === "home" ? home : away
                  }`
              )
              .join(", ")}`
          : "Goal scorer details not available.";

      const prompt = `Football match analyst. Post-match review: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away} (${leagueName}).
${scorersContext}
Respond ONLY valid JSON no backticks:
{"manOfMatch":"Player Full Name","homeReview":"2 sentences on how ${home} played tactically.","awayReview":"2 sentences on how ${away} played.","homeImprove":"1 sentence what ${home} could improve.","awayImprove":"1 sentence what ${away} could improve.","ratings":[{"name":"Player Name","pos":"GK","team":"${home}","rating":7.4},{"name":"Player Name","pos":"CB","team":"${home}","rating":7.1},{"name":"Player Name","pos":"CM","team":"${home}","rating":8.2},{"name":"Player Name","pos":"ST","team":"${home}","rating":7.9},{"name":"Player Name","pos":"GK","team":"${away}","rating":6.2},{"name":"Player Name","pos":"CB","team":"${away}","rating":6.8},{"name":"Player Name","pos":"CM","team":"${away}","rating":6.5},{"name":"Player Name","pos":"ST","team":"${away}","rating":6.3}]}`;
      const reviewData = await askHaikuJSON(prompt, 700);
      reviewData.scorers = realGoals.map((g) => ({
        name: g.playerName || "Unknown",
        team: g.team === "home" ? home : away,
        minute: g.min,
        type:
          g.type === "penalty"
            ? "Penalty"
            : g.type === "og"
            ? "Own Goal"
            : "Goal",
        assist: "",
      }));
      return NextResponse.json({ data: reviewData });
    }

    return NextResponse.json({ data: {} });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json({ data: { _error: true } });
  }
}
