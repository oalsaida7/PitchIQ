import { NextResponse } from "next/server";
import {
  MatchEvent,
  estDateKey,
  fetchEventsForDate,
  fetchLiveEventIds,
  formatKickoffEst,
  isInternationalLeague,
  normalizeEventType,
  resolveLiveMinute,
  resolveMatchStatus,
  teamIconUrl,
  tsdbFetchV2,
  unwrapList,
} from "@/lib/tsdb";

function parseGoalString(goalStr: string, team: "home" | "away"): MatchEvent {
  const match = goalStr.match(/([a-zA-ZÀ-ÿ\s.\-']+?)(?:\s+(\d+)(?:'|\+)?)?$/);
  const name = match ? match[1].trim() : goalStr.replace(/'/g, "").trim();
  const min = match?.[2] || "";
  return { type: "goal", team, min, playerName: name, label: `Goal — ${name}` };
}

function parseCardString(
  cardStr: string,
  team: "home" | "away",
  isRed: boolean
): MatchEvent {
  const match = cardStr.match(/([a-zA-ZÀ-ÿ\s.\-']+?)(?:\s+(\d+)(?:'|\+)?)?$/);
  const name = match ? match[1].trim() : cardStr.trim();
  const min = match?.[2] || "";
  return {
    type: "card",
    team,
    min,
    playerName: name,
    label: `${isRed ? "Red" : "Yellow"} card — ${name}`,
  };
}

function parseSubString(subStr: string, team: "home" | "away"): MatchEvent {
  const parts = subStr.split("|").map((s) => s.trim());
  const minMatch = subStr.match(/(\d+)(?:'|\+)?/);
  const min = minMatch?.[1] || "";
  const off = parts[0] || subStr;
  const on = parts[1] || "";
  return {
    type: "sub",
    team,
    min,
    playerName: off,
    label: on ? `Sub: ${off} → ${on}` : `Sub: ${off}`,
  };
}

function parseEventFields(
  event: Record<string, string | null | undefined>
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const pushSplit = (
    raw: string | null | undefined,
    team: "home" | "away",
    parser: (s: string, t: "home" | "away") => MatchEvent
  ) => {
    if (!raw) return;
    raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((entry) => events.push(parser(entry, team)));
  };

  pushSplit(event.strHomeGoalDetails, "home", parseGoalString);
  pushSplit(event.strAwayGoalDetails, "away", parseGoalString);
  pushSplit(event.strHomeYellowCards, "home", (s, t) => parseCardString(s, t, false));
  pushSplit(event.strAwayYellowCards, "away", (s, t) => parseCardString(s, t, false));
  pushSplit(event.strHomeRedCards, "home", (s, t) => parseCardString(s, t, true));
  pushSplit(event.strAwayRedCards, "away", (s, t) => parseCardString(s, t, true));
  pushSplit(event.strHomeSubstitutes, "home", parseSubString);
  pushSplit(event.strAwaySubstitutes, "away", parseSubString);

  return events.sort(
    (a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0)
  );
}

function mapApiTimeline(rows: Array<Record<string, unknown>>): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const row of rows) {
    const team: "home" | "away" = row.strHome === "Yes" ? "home" : "away";
    const min = String(row.intTime ?? "");
    const kind = String(row.strTimeline || "").toLowerCase();
    const detail = String(row.strTimelineDetail || "").toLowerCase();
    const type = normalizeEventType(kind, detail);

    if (type === "goal") {
      const assist = String(row.strAssist || "").trim();
      events.push({
        type: "goal",
        team,
        min,
        playerName: String(row.strPlayer || ""),
        label: assist
          ? `Goal — ${row.strPlayer} (assist: ${assist})`
          : `Goal — ${row.strPlayer || "Unknown"}`,
      });
    } else if (type === "card") {
      const isRed = detail.includes("red");
      events.push({
        type: "card",
        team,
        min,
        playerName: String(row.strPlayer || ""),
        label: `${isRed ? "Red" : "Yellow"} card — ${row.strPlayer || "Unknown"}`,
      });
    } else if (type === "sub") {
      const onPlayer =
        String(row.strAssist || "").trim() ||
        String(row.strTimelineDetail || "").trim() ||
        "";
      events.push({
        type: "sub",
        team,
        min,
        playerName: String(row.strPlayer || ""),
        label: onPlayer
          ? `Sub: ${row.strPlayer} → ${onPlayer}`
          : `Sub: ${row.strPlayer || "Unknown"}`,
      });
    }
  }
  return events.sort(
    (a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0)
  );
}

async function fetchTimelineForEvent(eventId: string): Promise<MatchEvent[]> {
  const data = await tsdbFetchV2(`lookup/event_timeline/${eventId}`);
  const rows = unwrapList(data, ["timeline", "lookup", "list"]) as Array<
    Record<string, unknown>
  >;
  if (!rows.length) return [];
  return mapApiTimeline(rows);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || estDateKey();

  try {
    const [rawEvents, liveIds] = await Promise.all([
      fetchEventsForDate(dateStr),
      fetchLiveEventIds(),
    ]);

    const cleanMatches = rawEvents.map((f) => {
      const strStatus = String(f.strStatus || "");
      const leagueName = String(f.strLeague || "");
      const status = resolveMatchStatus(f, liveIds);

      const homeScore =
        f.intHomeScore !== null && f.intHomeScore !== ""
          ? Number(f.intHomeScore)
          : null;
      const awayScore =
        f.intAwayScore !== null && f.intAwayScore !== ""
          ? Number(f.intAwayScore)
          : null;

      let events = parseEventFields(f as Record<string, string | null | undefined>);

      return {
        id: f.idEvent || f.id,
        status,
        liveMin: resolveLiveMinute(f, status),
        kick: formatKickoffEst(
          String(f.dateEvent || dateStr),
          String(f.strTime || "")
        ),
        kickRaw: f.strTime ? String(f.strTime).substring(0, 5) : "TBD",
        dateEvent: f.dateEvent || dateStr,
        league: leagueName,
        leagueId: f.idLeague,
        leagueName,
        leagueLogo: f.strLeagueBadge || "",
        isInternational: isInternationalLeague(leagueName),
        home: f.strHomeTeam,
        homeAbbr: String(f.strHomeTeam || "").slice(0, 3).toUpperCase(),
        homeLogo: teamIconUrl(
          String(f.strHomeTeam || ""),
          String(f.strHomeTeamBadge || ""),
          leagueName
        ),
        homeFlag: teamIconUrl(
          String(f.strHomeTeam || ""),
          String(f.strHomeTeamBadge || ""),
          leagueName
        ),
        away: f.strAwayTeam,
        awayAbbr: String(f.strAwayTeam || "").slice(0, 3).toUpperCase(),
        awayLogo: teamIconUrl(
          String(f.strAwayTeam || ""),
          String(f.strAwayTeamBadge || ""),
          leagueName
        ),
        awayFlag: teamIconUrl(
          String(f.strAwayTeam || ""),
          String(f.strAwayTeamBadge || ""),
          leagueName
        ),
        score: { home: homeScore ?? 0, away: awayScore ?? 0 },
        hasScore: homeScore !== null && awayScore !== null,
        venue: f.strVenue || "",
        events,
        timeline: events,
      };
    });

    const enrichTargets = cleanMatches.filter(
      (m) => (m.status === "live" || m.status === "final") && m.events.length === 0
    );

    if (enrichTargets.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < enrichTargets.length; i += batchSize) {
        const batch = enrichTargets.slice(i, i + batchSize);
        const timelines = await Promise.all(
          batch.map((m) => fetchTimelineForEvent(String(m.id)))
        );
        batch.forEach((m, idx) => {
          if (timelines[idx].length > 0) {
            m.events = timelines[idx];
            m.timeline = timelines[idx];
          }
        });
      }
    }

    return NextResponse.json({
      matches: cleanMatches,
      date: dateStr,
      timezone: "America/New_York",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Match fetch error:", err);
    return NextResponse.json({
      matches: [],
      date: dateStr,
      timezone: "America/New_York",
      fetchedAt: new Date().toISOString(),
    });
  }
}
