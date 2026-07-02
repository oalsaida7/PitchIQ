import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CLAUDE_MODEL,
  gridForPlayer,
  mapRole,
  positionToRow,
  tsdbFetchV1,
  tsdbFetchV2,
  unwrapList,
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

function mapLineupSide(
  players: Array<Record<string, unknown>>,
  side: "home" | "away"
): LineupPlayer[] {
  const isHome = side === "home";
  const starters = players.filter(
    (p) => (p.strHome === "Yes") === isHome && p.strSubstitute === "No"
  );

  const rowBuckets: Record<number, typeof starters> = { 1: [], 2: [], 3: [], 4: [] };
  starters.forEach((p) => {
    rowBuckets[positionToRow(String(p.strPosition || ""))].push(p);
  });

  return starters.map((p) => {
    const row = positionToRow(String(p.strPosition || ""));
    const rowPlayers = rowBuckets[row];
    const idx = rowPlayers.indexOf(p);
    return {
      num: Number(p.intSquadNumber) || 0,
      name: String(p.strPlayer || "Unknown"),
      role: mapRole(String(p.strPosition || "")),
      grid: gridForPlayer(row, idx, rowPlayers.length, side),
      side,
    };
  });
}

function mapSubs(
  players: Array<Record<string, unknown>>,
  side: "home" | "away"
): string[] {
  const isHome = side === "home";
  return players
    .filter((p) => (p.strHome === "Yes") === isHome && p.strSubstitute === "Yes")
    .map((p) => String(p.strPlayer || "Unknown"));
}

function parseEventLineupStrings(ev: Record<string, unknown>): Array<Record<string, string>> {
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
  const data = await tsdbFetchV2(`lookup/event_lineup/${matchId}`);
  let players = unwrapList(data, ["lineup", "lookup", "list"]) as Array<
    Record<string, unknown>
  >;

  if (!players.length) {
    const evData = await tsdbFetchV2(`lookup/event/${matchId}`);
    const ev = unwrapList(evData, ["events", "lookup", "list"])[0] as
      | Record<string, unknown>
      | undefined;
    if (ev) players = parseEventLineupStrings(ev);
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
  const data = await tsdbFetchV2(`lookup/event_stats/${matchId}`);
  const eventstats = unwrapList(data, ["eventstats", "stats", "lookup", "list"]) as Array<
    Record<string, string>
  >;

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

function candidateSeasons(isWorldCup: boolean): string[] {
  const now = new Date();
  const year = now.getFullYear();
  // European seasons roll over mid-year: Aug–Dec belongs to "year-year+1",
  // Jan–Jul belongs to "year-1-year".
  const crossYear =
    now.getMonth() >= 7
      ? [`${year}-${year + 1}`, `${year - 1}-${year}`]
      : [`${year - 1}-${year}`, `${year}-${year + 1}`];

  if (isWorldCup) {
    return [String(year), String(year - 1), "2026", "2022"].filter(
      (s, i, arr) => arr.indexOf(s) === i
    );
  }
  // Calendar-year leagues (MLS, Brasileirão, Nordic leagues) use plain years
  return [...crossYear, String(year), String(year - 1)];
}

async function fetchTable(
  leagueId: string,
  leagueName: string,
  home: string,
  away: string
) {
  if (!leagueId) {
    return { teams: [], isReal: true, hasTable: false, _loaded: true };
  }

  const isWC = (leagueName || "").toLowerCase().includes("world cup");

  for (const season of candidateSeasons(isWC)) {
    const data = await tsdbFetchV1(
      `lookuptable.php?l=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`
    );
    const table = unwrapList(data, ["table", "standings", "list"]) as Array<
      Record<string, string>
    >;
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
        .map((t, i) => {
          const gd = Number(t.intGoalDifference ?? 0);
          return {
            pos: Number(t.intRank) || i + 1,
            name: t.strTeam || "Unknown",
            badge: t.strBadge || t.strTeamBadge || "",
            played: Number(t.intPlayed) || 0,
            won: Number(t.intWin) || 0,
            drawn: Number(t.intDraw) || 0,
            lost: Number(t.intLoss) || 0,
            gd: gd >= 0 ? `+${gd}` : String(gd),
            pts: Number(t.intPoints) || 0,
            group: t.strGroup || undefined,
          };
        })
        .sort((a, b) => a.pos - b.pos),
      season,
      isReal: true,
      hasTable: true,
      isWorldCup: isWC,
      groupName: isWC ? rows[0]?.strGroup : undefined,
      _loaded: true,
    };
  }

  return { teams: [], isReal: true, hasTable: false, _loaded: true };
}

interface TimelineEvent {
  type: "goal" | "card" | "sub" | "var" | "other";
  team: "home" | "away";
  min: string;
  label: string;
  playerName: string;
  cardColor?: "yellow" | "red";
}

async function fetchRealTimeline(matchId: string): Promise<TimelineEvent[]> {
  const data = await tsdbFetchV2(`lookup/event_timeline/${matchId}`);
  const rows = unwrapList(data, ["timeline", "lookup", "list"]) as Array<
    Record<string, unknown>
  >;

  const events: TimelineEvent[] = [];
  for (const t of rows) {
    const team: "home" | "away" = t.strHome === "Yes" ? "home" : "away";
    const min = String(t.intTime ?? "");
    const kind = String(t.strTimeline || "").toLowerCase();
    const detailRaw = String(t.strTimelineDetail || "").trim();
    const detail = detailRaw.toLowerCase();
    const comment = String(t.strComment || "").trim();
    const player = String(t.strPlayer || "").trim();

    const isVar =
      kind.includes("var") ||
      detail.includes("disallowed") ||
      detail.includes("cancelled") ||
      detail.includes("canceled");
    const isMissedPen =
      detail.includes("missed penalty") || detail.includes("penalty missed");

    if (isVar) {
      const reason = detailRaw || comment || "Decision reviewed";
      events.push({
        type: "var",
        team,
        min,
        playerName: player,
        label: player ? `VAR — ${reason} (${player})` : `VAR — ${reason}`,
      });
    } else if (isMissedPen) {
      events.push({
        type: "other",
        team,
        min,
        playerName: player,
        label: `Penalty missed — ${player || "Unknown"}`,
      });
    } else if (kind === "goal") {
      const assist = String(t.strAssist || "").trim();
      const isPen = detail.includes("penalty");
      const isOG = detail.includes("own goal");
      const suffix = isPen ? " (pen)" : isOG ? " (OG)" : "";
      events.push({
        type: "goal",
        team,
        min,
        playerName: player,
        label: assist
          ? `Goal — ${player || "Unknown"}${suffix} (assist: ${assist})`
          : `Goal — ${player || "Unknown"}${suffix}`,
      });
    } else if (kind === "card") {
      const cardColor: "yellow" | "red" =
        /red|second yellow/.test(`${detail} ${comment}`.toLowerCase())
          ? "red"
          : "yellow";
      events.push({
        type: "card",
        team,
        min,
        playerName: player,
        cardColor,
        label: `${cardColor === "red" ? "Red" : "Yellow"} card — ${player || "Unknown"}`,
      });
    } else if (kind === "subst" || kind === "substitution") {
      const onPlayer = String(t.strAssist || "").trim() || detailRaw || "";
      events.push({
        type: "sub",
        team,
        min,
        playerName: player,
        label: onPlayer
          ? `Sub: ${player} → ${onPlayer}`
          : `Sub: ${player || "Unknown"}`,
      });
    }
  }

  return events.sort(
    (a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0)
  );
}

function toCommentaryUiType(e: {
  type?: unknown;
  cardColor?: unknown;
  label?: unknown;
}): string {
  if (e.type === "goal") return "goal";
  if (e.type === "var") return "var";
  if (e.type === "card") {
    const red =
      e.cardColor === "red" || /red card/i.test(String(e.label || ""));
    return red ? "red" : "yellow";
  }
  return "normal";
}

function mapEventsToCommentary(events: Array<Record<string, unknown>>) {
  return events.map((e) => ({
    min: e.min || "—",
    text: e.label || e.text || e.playerName || "Match event",
    type: toCommentaryUiType(e),
    team: e.team || null,
  }));
}

async function fetchCommentary(
  matchId: string,
  existingEvents: Array<Record<string, unknown>>
) {
  // The official timeline is the source of truth (has VAR rows and correct
  // card colors); the string-parsed events are only a fallback.
  const timeline = await fetchRealTimeline(matchId);
  if (timeline.length) {
    return {
      events: mapEventsToCommentary(timeline as unknown as Array<Record<string, unknown>>),
      isReal: true,
      _loaded: true,
    };
  }

  if (existingEvents?.length) {
    return {
      events: mapEventsToCommentary(existingEvents),
      isReal: true,
      _loaded: true,
    };
  }

  return { events: [], isReal: true, _loaded: true };
}

export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();
    const { home, away, leagueName, score, venue, id, leagueId } = match;

    if (type === "lineup") {
      return NextResponse.json({ data: await fetchLineup(String(id)) });
    }
    if (type === "stats") {
      return NextResponse.json({ data: await fetchStats(String(id)) });
    }
    if (type === "table") {
      return NextResponse.json({
        data: await fetchTable(
          String(leagueId || ""),
          leagueName || match.league || "",
          home,
          away
        ),
      });
    }
    if (type === "commentary") {
      return NextResponse.json({
        data: await fetchCommentary(
          String(id),
          match.events || match.timeline || []
        ),
      });
    }

    if (type === "preview") {
      const prompt = `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). Venue: ${venue || "TBD"}.
Be SPECIFIC: name real current players from each squad, give an exact scoreline, and justify every claim.
Respond ONLY valid JSON no backticks:
{"prediction":"2-1","homeWin":55,"draw":25,"awayWin":20,"confidence":"high|medium|low","keyBattle":"One sentence naming the two specific players whose duel decides this match.","homeScorerPred":"Real player name (min') — header/penalty/open play","awayScorerPred":"Real player name (min') — open play","firstGoal":"Which team scores first and roughly when","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"${venue || "Stadium Name, City"}","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences on ${home} expected tactical setup with formation.","awayTactic":"2 sentences on ${away} expected approach with formation.","reasoning":"3-4 sentences of specific analytical reasoning: cite form, key player availability, tactical matchup, and why the scoreline follows from them."}`;
      const data = await askHaikuJSON(prompt, 900);
      return NextResponse.json({ data: { ...data, _loaded: true } });
    }

    if (type === "review") {
      // Pull the official timeline server-side so scorers, VAR decisions and
      // red cards are accurate — never trust the client-passed parsed strings.
      let realEvents: Array<Record<string, unknown>> = [];
      try {
        realEvents = (await fetchRealTimeline(String(id))) as unknown as Array<
          Record<string, unknown>
        >;
      } catch {
        realEvents = [];
      }
      if (!realEvents.length) {
        realEvents = match.events || match.timeline || [];
      }

      const realGoals = realEvents.filter((e) => e.type === "goal");
      const varIncidents = realEvents.filter((e) => e.type === "var");
      const redCards = realEvents.filter(
        (e) =>
          e.type === "card" &&
          (e.cardColor === "red" || /red card/i.test(String(e.label || "")))
      );

      const contextLines: string[] = [];
      contextLines.push(
        realGoals.length
          ? `Confirmed goals: ${realGoals
              .map(
                (g) =>
                  `${g.playerName || "Unknown"} (${g.min}') for ${
                    g.team === "home" ? home : away
                  }`
              )
              .join(", ")}`
          : "Goal scorer details not available — do NOT invent scorers."
      );
      if (varIncidents.length) {
        contextLines.push(
          `VAR/disallowed incidents (these did NOT count as goals): ${varIncidents
            .map((v) => `${v.label} (${v.min}')`)
            .join(", ")}`
        );
      }
      if (redCards.length) {
        contextLines.push(
          `Red cards: ${redCards
            .map(
              (r) =>
                `${r.playerName || "Unknown"} (${r.min}') — ${
                  r.team === "home" ? home : away
                }`
            )
            .join(", ")}`
        );
      }

      const prompt = `Football match analyst. Post-match review: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away} (${leagueName}).
FACTS (ground truth — repeat them exactly, never contradict or invent goals/cards):
${contextLines.join("\n")}
Respond ONLY valid JSON no backticks:
{"manOfMatch":"Player Full Name","analysis":"4-5 sentences of in-depth AI analysis: what decided the match tactically, the key moments (reference the confirmed goals/VAR/red cards above by minute), and what the result means for both sides.","nextMatchPrediction":{"scoreline":"e.g. ${home} 2-1 in their next match","reasoning":"2-3 sentences: based on this performance, predict how each team fares in their next fixture and why."},"homeReview":"2 sentences on how ${home} played tactically.","awayReview":"2 sentences on how ${away} played.","homeImprove":"1 sentence what ${home} could improve.","awayImprove":"1 sentence what ${away} could improve.","ratings":[{"name":"Player Name","pos":"GK","team":"${home}","rating":7.4},{"name":"Player Name","pos":"CB","team":"${home}","rating":7.1},{"name":"Player Name","pos":"CM","team":"${home}","rating":8.2},{"name":"Player Name","pos":"ST","team":"${home}","rating":7.9},{"name":"Player Name","pos":"GK","team":"${away}","rating":6.2},{"name":"Player Name","pos":"CB","team":"${away}","rating":6.8},{"name":"Player Name","pos":"CM","team":"${away}","rating":6.5},{"name":"Player Name","pos":"ST","team":"${away}","rating":6.3}]}`;
      const reviewData = await askHaikuJSON(prompt, 1200);

      // If the AI call failed, still return a factual review so the tab
      // renders real data instead of empty sections.
      if (!Object.keys(reviewData).length) {
        reviewData._aiUnavailable = true;
        reviewData.analysis = `Final score: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away}. AI analysis is temporarily unavailable — the confirmed match events are shown below.`;
        reviewData.homeReview = `${home} ${
          (score?.home ?? 0) > (score?.away ?? 0)
            ? "won this fixture"
            : (score?.home ?? 0) === (score?.away ?? 0)
            ? "drew this fixture"
            : "lost this fixture"
        } ${score?.home ?? 0}–${score?.away ?? 0}.`;
        reviewData.awayReview = `${away} ${
          (score?.away ?? 0) > (score?.home ?? 0)
            ? "took the points away from home"
            : (score?.away ?? 0) === (score?.home ?? 0)
            ? "earned a share of the points"
            : "came away with nothing"
        }.`;
      }

      reviewData.scorers = realGoals.map((g) => {
        const label = String(g.label || "");
        const assistMatch = label.match(/assist:\s*([^)]+)\)/i);
        return {
          name: g.playerName || "Unknown",
          team: g.team === "home" ? home : away,
          minute: g.min,
          type: /\(pen\)/i.test(label)
            ? "Penalty"
            : /\(OG\)/i.test(label)
            ? "Own Goal"
            : "Goal",
          assist: assistMatch ? assistMatch[1].trim() : "",
        };
      });
      reviewData.varIncidents = varIncidents.map((v) => ({
        minute: v.min,
        label: v.label,
        team: v.team === "home" ? home : away,
      }));
      reviewData.redCards = redCards.map((r) => ({
        minute: r.min,
        name: r.playerName || "Unknown",
        team: r.team === "home" ? home : away,
      }));
      return NextResponse.json({ data: { ...reviewData, _loaded: true } });
    }

    return NextResponse.json({ data: { _loaded: true } });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json({ data: { _error: true, _loaded: true } });
  }
}
