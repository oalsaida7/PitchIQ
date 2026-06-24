import { NextResponse } from "next/server";

interface TimelineEvent {
  type: string;
  team: string;
  playerName: string;
  min: string;
  text?: string;
}

interface TSDBTimelineRow {
  strTimeline?: string;
  strTimelineDetail?: string;
  strHome?: string;
  strPlayer?: string;
  strAssist?: string;
  intTime?: string | number;
}

function tsdbBase(): string {
  const apiKey = process.env.THESPORTSDB_KEY;
  if (!apiKey) throw new Error("THESPORTSDB_KEY not configured");
  return `https://www.thesportsdb.com/api/v1/json/${apiKey}`;
}

function parseGoalString(goalStr: string, team: string): TimelineEvent {
  const match = goalStr.match(/([a-zA-ZÀ-ÿ\s.\-']+?)(?:\s+(\d+)(?:'|\+)?)?$/);
  if (match) {
    return {
      type: "goal",
      team,
      playerName: match[1].trim(),
      min: match[2] || "",
      text: `Goal — ${match[1].trim()}`,
    };
  }
  return {
    type: "goal",
    team,
    playerName: goalStr.replace(/'/g, "").replace(/:/g, "").trim(),
    min: "",
    text: `Goal — ${goalStr.trim()}`,
  };
}

function parseCardString(cardStr: string, team: string, isRed: boolean): TimelineEvent {
  const match = cardStr.match(/([a-zA-ZÀ-ÿ\s.\-']+?)(?:\s+(\d+)(?:'|\+)?)?$/);
  const name = match ? match[1].trim() : cardStr.trim();
  const min = match?.[2] || "";
  return {
    type: isRed ? "red" : "yellow",
    team,
    playerName: name,
    min,
    text: `${isRed ? "Red" : "Yellow"} card — ${name}`,
  };
}

function parseSubString(subStr: string, team: string): TimelineEvent {
  const parts = subStr.split("|").map((s) => s.trim());
  const match = subStr.match(/(\d+)(?:'|\+)?/);
  const min = match?.[1] || "";
  const off = parts[0] || subStr;
  const on = parts[1] || "";
  return {
    type: "subst",
    team,
    playerName: off,
    min,
    text: on ? `Sub: ${off} → ${on}` : `Sub: ${off}`,
  };
}

function parseEventTimelineFields(event: Record<string, string | null | undefined>): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  const pushSplit = (
    raw: string | null | undefined,
    team: string,
    parser: (s: string, t: string) => TimelineEvent
  ) => {
    if (!raw) return;
    raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((entry) => timeline.push(parser(entry, team)));
  };

  pushSplit(event.strHomeGoalDetails, "home", parseGoalString);
  pushSplit(event.strAwayGoalDetails, "away", parseGoalString);
  pushSplit(event.strHomeYellowCards, "home", (s, t) => parseCardString(s, t, false));
  pushSplit(event.strAwayYellowCards, "away", (s, t) => parseCardString(s, t, false));
  pushSplit(event.strHomeRedCards, "home", (s, t) => parseCardString(s, t, true));
  pushSplit(event.strAwayRedCards, "away", (s, t) => parseCardString(s, t, true));
  pushSplit(event.strHomeSubstitutes, "home", parseSubString);
  pushSplit(event.strAwaySubstitutes, "away", parseSubString);

  return timeline.sort((a, b) => {
    const am = parseInt(a.min, 10) || 0;
    const bm = parseInt(b.min, 10) || 0;
    return am - bm;
  });
}

function mapApiTimeline(rows: TSDBTimelineRow[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const row of rows) {
    const team = row.strHome === "Yes" ? "home" : "away";
    const min = String(row.intTime ?? "");
    const kind = (row.strTimeline || "").toLowerCase();
    const detail = (row.strTimelineDetail || "").toLowerCase();

    if (kind === "goal") {
      const isPen = detail.includes("penalty");
      const isOg = detail.includes("own");
      const type = isPen ? "penalty" : isOg ? "og" : "goal";
      const assist = row.strAssist?.trim();
      events.push({
        type,
        team,
        playerName: row.strPlayer || "",
        min,
        text: assist
          ? `Goal — ${row.strPlayer} (assist: ${assist})`
          : `Goal — ${row.strPlayer || "Unknown"}`,
      });
    } else if (kind === "card") {
      const isRed = detail.includes("red");
      events.push({
        type: isRed ? "red" : "yellow",
        team,
        playerName: row.strPlayer || "",
        min,
        text: `${isRed ? "Red" : "Yellow"} card — ${row.strPlayer || "Unknown"}`,
      });
    } else if (kind === "subst" || kind === "substitution") {
      const onPlayer = row.strAssist?.trim() || row.strTimelineDetail?.trim() || "";
      events.push({
        type: "subst",
        team,
        playerName: row.strPlayer || "",
        min,
        text: onPlayer
          ? `Sub: ${row.strPlayer} → ${onPlayer}`
          : `Sub: ${row.strPlayer || "Unknown"}`,
      });
    }
  }

  return events.sort((a, b) => {
    const am = parseInt(a.min, 10) || 0;
    const bm = parseInt(b.min, 10) || 0;
    return am - bm;
  });
}

async function fetchTimelineForEvent(eventId: string): Promise<TimelineEvent[]> {
  try {
    const res = await fetch(`${tsdbBase()}/lookuptimeline.php?id=${eventId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.timeline?.length) return [];
    return mapApiTimeline(data.timeline);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(
      `${tsdbBase()}/eventsday.php?d=${dateStr}&s=Soccer`,
      { next: { revalidate: 30 } }
    );

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const rawData = await res.json();

    if (!rawData.events) {
      return NextResponse.json({ matches: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanMatches = rawData.events.map((f: any) => {
      const strStatus = String(f.strStatus || "");
      const strProgress = String(f.strProgress || "");

      let status = "scheduled";
      if (
        strStatus === "Match Finished" ||
        strStatus === "FT" ||
        strStatus === "AET" ||
        strStatus === "PEN"
      ) {
        status = "final";
      } else if (
        strStatus === "In Progress" ||
        strStatus === "HT" ||
        strStatus === "1H" ||
        strStatus === "2H" ||
        (strProgress && strProgress !== "0" && strProgress !== "")
      ) {
        status = "live";
      }

      let liveMin = "";
      if (status === "live") {
        if (strStatus === "HT") liveMin = "HT";
        else if (strProgress && strProgress !== "0") liveMin = `${strProgress}'`;
        else if (strStatus === "1H" || strStatus === "2H") liveMin = strStatus;
        else liveMin = "LIVE";
      }

      const homeScore =
        f.intHomeScore !== null && f.intHomeScore !== ""
          ? Number(f.intHomeScore)
          : null;
      const awayScore =
        f.intAwayScore !== null && f.intAwayScore !== ""
          ? Number(f.intAwayScore)
          : null;

      const timeline = parseEventTimelineFields(f);

      return {
        id: f.idEvent,
        status,
        liveMin,
        kick: f.strTime ? String(f.strTime).substring(0, 5) : "TBD",
        league: f.strLeague,
        leagueId: f.idLeague,
        leagueName: f.strLeague,
        leagueLogo: f.strLeagueBadge || "",
        home: f.strHomeTeam,
        homeAbbr: String(f.strHomeTeam || "").slice(0, 3).toUpperCase(),
        homeLogo: f.strHomeTeamBadge || "",
        away: f.strAwayTeam,
        awayAbbr: String(f.strAwayTeam || "").slice(0, 3).toUpperCase(),
        awayLogo: f.strAwayTeamBadge || "",
        score: { home: homeScore ?? 0, away: awayScore ?? 0 },
        hasScore: homeScore !== null && awayScore !== null,
        venue: f.strVenue || "",
        timeline,
      };
    });

    const enrichTargets = cleanMatches.filter(
      (m: { status: string; timeline: TimelineEvent[] }) =>
        (m.status === "live" || m.status === "final") && m.timeline.length === 0
    );

    if (enrichTargets.length > 0) {
      const batchSize = 8;
      for (let i = 0; i < enrichTargets.length; i += batchSize) {
        const batch = enrichTargets.slice(i, i + batchSize);
        const timelines = await Promise.all(
          batch.map((m: { id: string }) => fetchTimelineForEvent(m.id))
        );
        batch.forEach((m: { timeline: TimelineEvent[] }, idx: number) => {
          if (timelines[idx].length > 0) {
            m.timeline = timelines[idx];
          }
        });
      }
    }

    return NextResponse.json({ matches: cleanMatches });
  } catch (err) {
    console.error("Match fetch error:", err);
    return NextResponse.json({ matches: [] });
  }
}
