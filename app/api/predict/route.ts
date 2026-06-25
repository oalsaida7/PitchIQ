import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CLAUDE_MODEL,
  fetchJsonSafe,
  gridForPlayer,
  mapRole,
  positionToRow,
  tsdbBase,
} from "@/lib/tsdb";

const client = new Anthropic();

interface LineupPlayer {
  num: number;
  name: string;
  role: string;
  grid: string;
  side: "home" | "away";
}

async function askHaikuJSON(
  prompt: string,
  maxTokens = 700
): Promise<Record<string, unknown>> {
  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const rawText = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Haiku JSON error:", err);
    return {};
  }
}

function inferFormationFromLineup(lineup: LineupPlayer[]): string {
  const counts = { def: 0, mid: 0, fwd: 0 };
  lineup.forEach((p) => {
    if (p.role === "DEF") counts.def++;
    else if (p.role === "MID") counts.mid++;
    else if (p.role === "FWD") counts.fwd++;
  });
  if (!counts.def && !counts.mid && !counts.fwd) return "";
  return `${counts.def || 4}-${counts.mid || 3}-${counts.fwd || 3}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLineupSide(players: any[], side: "home" | "away"): LineupPlayer[] {
  const isHome = side === "home";
  const starters = players.filter(
    (p) => (p.strHome === "Yes") === isHome && p.strSubstitute === "No"
  );

  const rowBuckets: Record<number, typeof starters> = { 1: [], 2: [], 3: [], 4: [] };
  starters.forEach((p) => {
    rowBuckets[positionToRow(p.strPosition)].push(p);
  });

  return starters.map((p) => {
    const row = positionToRow(p.strPosition);
    const rowPlayers = rowBuckets[row];
    const idx = rowPlayers.indexOf(p);
    return {
      num: Number(p.intSquadNumber) || 0,
      name: p.strPlayer || "Unknown",
      role: mapRole(p.strPosition),
      grid: gridForPlayer(row, idx, rowPlayers.length, side),
      side,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubs(players: any[], side: "home" | "away"): string[] {
  const isHome = side === "home";
  return players
    .filter((p) => (p.strHome === "Yes") === isHome && p.strSubstitute === "Yes")
    .map((p) => p.strPlayer || "Unknown");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEventLineupStrings(ev: any): any[] {
  const players: Array<Record<string, string>> = [];
  const sides = [
    {
      isHome: true,
      groups: [
        { pos: "Goalkeeper", raw: ev.strHomeLineupGoalkeeper },
        { pos: "Defender", raw: ev.strHomeLineupDefense },
        { pos: "Midfielder", raw: ev.strHomeLineupMidfield },
        { pos: "Forward", raw: ev.strHomeLineupForward },
      ],
      subs: ev.strHomeLineupSubstitutes,
    },
    {
      isHome: false,
      groups: [
        { pos: "Goalkeeper", raw: ev.strAwayLineupGoalkeeper },
        { pos: "Defender", raw: ev.strAwayLineupDefense },
        { pos: "Midfielder", raw: ev.strAwayLineupMidfield },
        { pos: "Forward", raw: ev.strAwayLineupForward },
      ],
      subs: ev.strAwayLineupSubstitutes,
    },
  ];

  for (const side of sides) {
    let num = side.isHome ? 1 : 12;
    for (const group of side.groups) {
      if (!group.raw) continue;
      String(group.raw)
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((name) => {
          players.push({
            strHome: side.isHome ? "Yes" : "No",
            strSubstitute: "No",
            strPosition: group.pos,
            strPlayer: name,
            intSquadNumber: String(num++),
          });
        });
    }
    if (side.subs) {
      String(side.subs)
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((name) => {
          players.push({
            strHome: side.isHome ? "Yes" : "No",
            strSubstitute: "Yes",
            strPosition: "Substitute",
            strPlayer: name,
            intSquadNumber: String(num++),
          });
        });
    }
  }

  return players;
}

async function fetchLineup(matchId: string) {
  const data = await fetchJsonSafe(`${tsdbBase()}/lookuplineup.php?id=${matchId}`);
  let players = (data.lineup as unknown[]) || [];

  if (!players.length) {
    const evData = await fetchJsonSafe(`${tsdbBase()}/lookupevent.php?id=${matchId}`);
    const ev = (evData.events as unknown[])?.[0];
    if (ev) {
      players = parseEventLineupStrings(ev);
    }
  }

  if (!players.length) {
    return {
      homeLineup: [],
      awayLineup: [],
      homeSubs: [],
      awaySubs: [],
      hasLineup: false,
      isReal: true,
      _loaded: true,
    };
  }

  const homeLineup = mapLineupSide(players, "home");
  const awayLineup = mapLineupSide(players, "away");

  return {
    homeFormation: inferFormationFromLineup(homeLineup),
    awayFormation: inferFormationFromLineup(awayLineup),
    homeLineup,
    awayLineup,
    homeSubs: mapSubs(players, "home"),
    awaySubs: mapSubs(players, "away"),
    hasLineup: homeLineup.length > 0 || awayLineup.length > 0,
    isReal: true,
    _loaded: true,
  };
}

async function fetchStats(matchId: string) {
  const data = await fetchJsonSafe(
    `${tsdbBase()}/lookupeventstats.php?id=${matchId}`
  );
  const eventstats = (data.eventstats as Array<Record<string, string>>) || [];

  if (!eventstats.length) {
    return { hasStats: false, isReal: true, _loaded: true };
  }

  const get = (statName: string) => {
    const row = eventstats.find((s) => s.strStat === statName);
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
    _loaded: true,
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
    : ["2025", "2025-2026", "2024-2025", "2024"];

  for (const season of seasons) {
    const data = await fetchJsonSafe(
      `${tsdbBase()}/lookuptable.php?l=${leagueId}&s=${season}`
    );
    const table = (data.table as Array<Record<string, string>>) || [];
    if (!table.length) continue;

    let rows = table;

    if (isWC) {
      const homeGroup = rows.find((t) => t.strTeam === home)?.strGroup;
      const awayGroup = rows.find((t) => t.strTeam === away)?.strGroup;
      const group = homeGroup || awayGroup;
      if (group) {
        rows = rows.filter((t) => t.strGroup === group);
      } else {
        rows = rows.filter((t) => t.strGroup).slice(0, 4);
      }
    }

    return {
      teams: rows
        .map((t) => ({
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
        .sort((a, b) => a.pos - b.pos),
      isReal: true,
      hasTable: true,
      isWorldCup: isWC,
      groupName: isWC ? rows[0]?.strGroup : undefined,
      _loaded: true,
    };
  }

  return { teams: [], isReal: true, hasTable: false, _loaded: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEventsToCommentary(events: any[]) {
  return events.map((e) => {
    let uiType = "normal";
    if (e.type === "goal") uiType = "goal";
    else if (e.type === "card") uiType = "card";
    else if (e.type === "sub") uiType = "normal";

    return {
      min: e.min || "—",
      text: e.label || e.text || e.playerName || "Match event",
      type: uiType,
      team: e.team || null,
    };
  });
}

async function fetchCommentary(
  matchId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingEvents: any[]
) {
  const source =
    existingEvents?.length > 0
      ? existingEvents
      : mapApiTimelineRaw(
          ((await fetchJsonSafe(`${tsdbBase()}/lookuptimeline.php?id=${matchId}`))
            .timeline as unknown[]) || []
        );

  return {
    events: mapEventsToCommentary(source),
    isReal: true,
    _loaded: true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiTimelineRaw(rows: any[]) {
  return rows.map((t) => {
    const team = t.strHome === "Yes" ? "home" : "away";
    const min = String(t.intTime ?? "");
    const kind = (t.strTimeline || "").toLowerCase();
    const detail = (t.strTimelineDetail || "").toLowerCase();

    if (kind === "goal") {
      const assist = t.strAssist?.trim();
      return {
        type: "goal",
        team,
        min,
        playerName: t.strPlayer || "",
        label: assist
          ? `Goal — ${t.strPlayer} (assist: ${assist})`
          : `Goal — ${t.strPlayer || "Unknown"}`,
      };
    }
    if (kind === "card") {
      const isRed = detail.includes("red");
      return {
        type: "card",
        team,
        min,
        playerName: t.strPlayer || "",
        label: `${isRed ? "Red" : "Yellow"} card — ${t.strPlayer || "Unknown"}`,
      };
    }
    if (kind === "subst" || kind === "substitution") {
      const onPlayer = t.strAssist?.trim() || t.strTimelineDetail?.trim() || "";
      return {
        type: "sub",
        team,
        min,
        playerName: t.strPlayer || "",
        label: onPlayer
          ? `Sub: ${t.strPlayer} → ${onPlayer}`
          : `Sub: ${t.strPlayer || "Unknown"}`,
      };
    }
    return {
      type: "goal",
      team,
      min,
      playerName: t.strPlayer || "",
      label: t.strPlayer || "Event",
    };
  });
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
      const data = await fetchCommentary(
        String(id),
        match.events || match.timeline || []
      );
      return NextResponse.json({ data });
    }

    if (type === "preview") {
      const prompt = `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). Venue: ${venue || "TBD"}.
Respond ONLY valid JSON no backticks:
{"prediction":"2-1","homeWin":55,"draw":25,"awayWin":20,"keyBattle":"One sentence on the key tactical battle.","homeScorerPred":"Likely scorer name (min') — header/penalty/open play","awayScorerPred":"Likely scorer name (min') — open play","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"${venue || "Stadium Name, City"}","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences on ${home} expected tactical setup.","awayTactic":"2 sentences on ${away} expected approach.","reasoning":"3 sentences of analytical reasoning supporting the prediction."}`;
      const data = await askHaikuJSON(prompt, 700);
      return NextResponse.json({ data: { ...data, _loaded: true } });
    }

    if (type === "review") {
      const realEvents: Array<{
        min: string;
        team: string | null;
        type: string;
        label?: string;
        text?: string;
        playerName?: string;
      }> = match.events || match.timeline || [];
      const realGoals = realEvents.filter((e) => e.type === "goal");
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
        type: "Goal",
        assist: "",
      }));
      return NextResponse.json({ data: { ...reviewData, _loaded: true } });
    }

    return NextResponse.json({ data: { _loaded: true } });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json({ data: { _error: true, _loaded: true } });
  }
}
