import { NextResponse } from "next/server";

// Raw shape coming from TheSportsDB
interface TSDBEvent {
  idEvent: string;
  strEvent: string;
  strLeague: string;
  idLeague: string;
  strSeason: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  strLeagueBadge?: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string;
  strProgress: string;
  strTime: string;
  strVenue?: string;
  strVideo?: string;
  strCountry?: string;
  strHomeGoalDetails?: string;
  strAwayGoalDetails?: string;
  strHomeLineupGoalkeeper?: string;
  strHomeLineupDefense?: string;
  strHomeLineupMidfield?: string;
  strHomeLineupForward?: string;
  strHomeLineupSubstitutes?: string;
  strAwayLineupGoalkeeper?: string;
  strAwayLineupDefense?: string;
  strAwayLineupMidfield?: string;
  strAwayLineupForward?: string;
  strAwayLineupSubstitutes?: string;
  strHomeFormation?: string;
  strAwayFormation?: string;
  strHomeYellowCards?: string;
  strAwayYellowCards?: string;
  strHomeRedCards?: string;
  strAwayRedCards?: string;
  strHomeSubstitutes?: string;
  strAwaySubstitutes?: string;
  strStatHomeGoalKeeperSaves?: string;
  strStatAwayGoalKeeperSaves?: string;
  strStatHomeBallPossession?: string;
  strStatAwayBallPossession?: string;
  strStatHomeGoalAttempts?: string;
  strStatAwayGoalAttempts?: string;
  strStatHomeShotsOnGoal?: string;
  strStatAwayShotsOnGoal?: string;
  strStatHomeShotsOffGoal?: string;
  strStatAwayShotsOffGoal?: string;
  strStatHomeCornerKicks?: string;
  strStatAwayCornerKicks?: string;
  strStatHomeFouls?: string;
  strStatAwayFouls?: string;
  strStatHomeOffsides?: string;
  strStatAwayOffsides?: string;
  strStatHomeYellowCards?: string;
  strStatAwayYellowCards?: string;
  strStatHomeRedCards?: string;
  strStatAwayRedCards?: string;
  strStatHomeTotalPasses?: string;
  strStatAwayTotalPasses?: string;
}

function parseStatus(raw: TSDBEvent): "scheduled" | "live" | "final" {
  const s = (raw.strStatus || "").trim();
  const p = (raw.strProgress || "").trim();
  if (["Match Finished", "FT", "AET", "PEN", "After Extra Time", "After Penalties"].includes(s)) return "final";
  if (["In Progress", "HT", "1H", "2H", "ET", "PEN Live"].includes(s)) return "live";
  if (p && p !== "" && p !== "0" && p !== "null") return "live";
  return "scheduled";
}

function parseLiveMin(raw: TSDBEvent): string {
  const s = (raw.strStatus || "").trim();
  const p = (raw.strProgress || "").trim();
  if (s === "HT") return "HT";
  if (p && p !== "" && p !== "0" && p !== "null") return `${p}'`;
  if (s === "In Progress" || s === "1H" || s === "2H") return "LIVE";
  return "";
}

// Parse "PlayerName (minute);PlayerName2 (minute2)" style strings from TSDB
function parseGoalDetail(raw: string | undefined | null): Array<{ name: string; minute: string; type: string }> {
  if (!raw || raw.trim() === "") return [];
  return raw.split(";").map(s => s.trim()).filter(Boolean).map(entry => {
    const m = entry.match(/^(.+?)\s*\((\d+(?:\+\d+)?)\)(\s*\(OG\))?(\s*\(Pen\))?/);
    if (m) {
      return {
        name: m[1].trim(),
        minute: m[2],
        type: m[4] ? "Penalty" : m[3] ? "Own Goal" : "Goal",
      };
    }
    return { name: entry, minute: "?", type: "Goal" };
  });
}

function parseCardDetail(raw: string | undefined | null): Array<{ name: string; minute: string }> {
  if (!raw || raw.trim() === "") return [];
  return raw.split(";").map(s => s.trim()).filter(Boolean).map(entry => {
    const m = entry.match(/^(.+?)\s*\((\d+(?:\+\d+)?)\)/);
    return m ? { name: m[1].trim(), minute: m[2] } : { name: entry, minute: "?" };
  });
}

function parseLineupSection(str: string | undefined | null): string[] {
  if (!str || str.trim() === "") return [];
  return str.split(";").map(s => s.trim()).filter(Boolean);
}

function buildTimelineEvents(raw: TSDBEvent, homeTeam: string, awayTeam: string) {
  const events: Array<{ min: string; team: string | null; type: string; text: string; playerName?: string }> = [];

  const homeGoals = parseGoalDetail(raw.strHomeGoalDetails);
  homeGoals.forEach(g => events.push({ min: g.minute, team: "home", type: g.type === "Goal" ? "goal" : g.type === "Penalty" ? "penalty" : "og", text: `${g.type === "Penalty" ? "PENALTY GOAL!" : g.type === "Own Goal" ? "OWN GOAL!" : "GOAL!"} ${g.name} puts ${homeTeam} ahead!`, playerName: g.name }));

  const awayGoals = parseGoalDetail(raw.strAwayGoalDetails);
  awayGoals.forEach(g => events.push({ min: g.minute, team: "away", type: g.type === "Goal" ? "goal" : g.type === "Penalty" ? "penalty" : "og", text: `${g.type === "Penalty" ? "PENALTY GOAL!" : g.type === "Own Goal" ? "OWN GOAL!" : "GOAL!"} ${g.name} scores for ${awayTeam}!`, playerName: g.name }));

  const homeYellows = parseCardDetail(raw.strHomeYellowCards || raw.strStatHomeYellowCards);
  homeYellows.forEach(c => events.push({ min: c.minute, team: "home", type: "yellow", text: `Yellow card — ${c.name} (${homeTeam})`, playerName: c.name }));

  const awayYellows = parseCardDetail(raw.strAwayYellowCards || raw.strStatAwayYellowCards);
  awayYellows.forEach(c => events.push({ min: c.minute, team: "away", type: "yellow", text: `Yellow card — ${c.name} (${awayTeam})`, playerName: c.name }));

  const homeReds = parseCardDetail(raw.strHomeRedCards || raw.strStatHomeRedCards);
  homeReds.forEach(c => events.push({ min: c.minute, team: "home", type: "red", text: `RED CARD — ${c.name} (${homeTeam}) is sent off!`, playerName: c.name }));

  const awayReds = parseCardDetail(raw.strAwayRedCards || raw.strStatAwayRedCards);
  awayReds.forEach(c => events.push({ min: c.minute, team: "away", type: "red", text: `RED CARD — ${c.name} (${awayTeam}) is sent off!`, playerName: c.name }));

  // Sort by minute
  events.sort((a, b) => {
    const mA = parseInt(a.min.replace("+", "").replace("?", "999")) || 999;
    const mB = parseInt(b.min.replace("+", "").replace("?", "999")) || 999;
    return mA - mB;
  });

  return events;
}

function buildLineupData(raw: TSDBEvent) {
  const homeGk = parseLineupSection(raw.strHomeLineupGoalkeeper);
  const homeDef = parseLineupSection(raw.strHomeLineupDefense);
  const homeMid = parseLineupSection(raw.strHomeLineupMidfield);
  const homeFwd = parseLineupSection(raw.strHomeLineupForward);
  const homeSubs = parseLineupSection(raw.strHomeLineupSubstitutes);

  const awayGk = parseLineupSection(raw.strAwayLineupGoalkeeper);
  const awayDef = parseLineupSection(raw.strAwayLineupDefense);
  const awayMid = parseLineupSection(raw.strAwayLineupMidfield);
  const awayFwd = parseLineupSection(raw.strAwayLineupForward);
  const awaySubs = parseLineupSection(raw.strAwayLineupSubstitutes);

  const hasLineup = homeGk.length > 0 || awayGk.length > 0;

  // Assign grid positions: line:col (1=GK row, 2=DEF, 3=MID, 4=FWD)
  function assignGrid(players: string[], line: number): Array<{ num: number; name: string; role: string; grid: string }> {
    const total = players.length;
    return players.map((name, i) => ({
      num: i + 1,
      name,
      role: line === 1 ? "GK" : line === 2 ? "DEF" : line === 3 ? "MID" : "FWD",
      grid: `${line}:${total === 1 ? 3 : Math.round(1 + (i / Math.max(total - 1, 1)) * 4)}`,
    }));
  }

  return {
    hasLineup,
    homeFormation: raw.strHomeFormation || "",
    awayFormation: raw.strAwayFormation || "",
    homeLineup: [
      ...assignGrid(homeGk, 1),
      ...assignGrid(homeDef, 2),
      ...assignGrid(homeMid, 3),
      ...assignGrid(homeFwd, 4),
    ],
    awayLineup: [
      ...assignGrid(awayGk, 1),
      ...assignGrid(awayDef, 2),
      ...assignGrid(awayMid, 3),
      ...assignGrid(awayFwd, 4),
    ],
    homeSubs,
    awaySubs,
  };
}

function buildStatsData(raw: TSDBEvent) {
  const hp = parseInt(raw.strStatHomeBallPossession || "0") || null;
  const ap = parseInt(raw.strStatAwayBallPossession || "0") || null;
  return {
    possession: { home: hp ?? 50, away: ap ?? 50 },
    shots: { home: parseInt(raw.strStatHomeGoalAttempts || "0") || 0, away: parseInt(raw.strStatAwayGoalAttempts || "0") || 0 },
    shotsOnTarget: { home: parseInt(raw.strStatHomeShotsOnGoal || "0") || 0, away: parseInt(raw.strStatAwayShotsOnGoal || "0") || 0 },
    shotsOffTarget: { home: parseInt(raw.strStatHomeShotsOffGoal || "0") || 0, away: parseInt(raw.strStatAwayShotsOffGoal || "0") || 0 },
    corners: { home: parseInt(raw.strStatHomeCornerKicks || "0") || 0, away: parseInt(raw.strStatAwayCornerKicks || "0") || 0 },
    fouls: { home: parseInt(raw.strStatHomeFouls || "0") || 0, away: parseInt(raw.strStatAwayFouls || "0") || 0 },
    offsides: { home: parseInt(raw.strStatHomeOffsides || "0") || 0, away: parseInt(raw.strStatAwayOffsides || "0") || 0 },
    yellowCards: { home: parseInt(raw.strStatHomeYellowCards || "0") || 0, away: parseInt(raw.strStatAwayYellowCards || "0") || 0 },
    redCards: { home: parseInt(raw.strStatHomeRedCards || "0") || 0, away: parseInt(raw.strStatAwayRedCards || "0") || 0 },
    gkSaves: { home: parseInt(raw.strStatHomeGoalKeeperSaves || "0") || 0, away: parseInt(raw.strStatAwayGoalKeeperSaves || "0") || 0 },
    passes: { home: parseInt(raw.strStatHomeTotalPasses || "0") || 0, away: parseInt(raw.strStatAwayTotalPasses || "0") || 0 },
    hasStats: !!(raw.strStatHomeBallPossession || raw.strStatHomeGoalAttempts),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const apiKey = process.env.THESPORTSDB_KEY;

  try {
    // Fetch both the day's schedule and the live endpoint in parallel
    const [dayRes, liveRes] = await Promise.all([
      fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${dateStr}&s=Soccer`, {
        next: { revalidate: 30 },
      }),
      fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslive.php`, {
        next: { revalidate: 10 },
      }),
    ]);

    const [dayData, liveData] = await Promise.all([dayRes.json(), liveRes.json()]);

    // Build a map of live event data keyed by event ID so we can merge real-time data
    const liveMap = new Map<string, TSDBEvent>();
    if (liveData.events) {
      for (const ev of liveData.events as TSDBEvent[]) {
        liveMap.set(ev.idEvent, ev);
      }
    }

    if (!dayData.events) {
      return NextResponse.json({ matches: [] });
    }

    const matches = (dayData.events as TSDBEvent[]).map((raw) => {
      // If we have live data for this event, merge it in (live data has stats/lineup/cards)
      const live = liveMap.get(raw.idEvent);
      const merged: TSDBEvent = live ? { ...raw, ...live } : raw;

      const status = parseStatus(merged);
      const liveMin = status === "live" ? parseLiveMin(merged) : "";
      const homeScore = merged.intHomeScore !== null && merged.intHomeScore !== "" ? Number(merged.intHomeScore) : null;
      const awayScore = merged.intAwayScore !== null && merged.intAwayScore !== "" ? Number(merged.intAwayScore) : null;

      const timeline = buildTimelineEvents(merged, merged.strHomeTeam, merged.strAwayTeam);
      const lineup = buildLineupData(merged);
      const stats = buildStatsData(merged);

      return {
        id: merged.idEvent,
        status,
        liveMin,
        kick: merged.strTime ? merged.strTime.substring(0, 5) : "TBD",
        league: merged.strLeague,
        leagueId: merged.idLeague,
        leagueName: merged.strLeague,
        leagueLogo: merged.strLeagueBadge || "",
        leagueCountry: merged.strCountry || "",
        home: merged.strHomeTeam,
        homeAbbr: merged.strHomeTeam.slice(0, 3).toUpperCase(),
        homeLogo: merged.strHomeTeamBadge || "",
        away: merged.strAwayTeam,
        awayAbbr: merged.strAwayTeam.slice(0, 3).toUpperCase(),
        awayLogo: merged.strAwayTeamBadge || "",
        score: { home: homeScore ?? 0, away: awayScore ?? 0 },
        hasScore: homeScore !== null && awayScore !== null,
        venue: merged.strVenue || "",
        ytLink: merged.strVideo || null,
        // Real data payloads embedded directly in the match object
        timeline,    // goal/card/sub events with real player names + minutes
        lineup,      // real starting 11 when available
        stats,       // real possession/shots/fouls etc when available
      };
    });

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("matches route error:", err);
    return NextResponse.json({ error: "Failed fetching match data" }, { status: 500 });
  }
}