import { NextResponse } from "next/server";
import {
  MatchEvent,
  detectCardColor,
  estDateKey,
  fetchEventsForDate,
  fetchLiveEvents,
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
  const lower = goalStr.toLowerCase();
  const match = goalStr.match(/([a-zA-ZÀ-ÿ\s.\-']+?)(?:\s+(\d+)(?:'|\+)?)?$/);
  const name = match ? match[1].trim() : goalStr.replace(/'/g, "").trim();
  const min = match?.[2] || "";

  // Ruled-out / missed attempts sometimes appear inside the goal-details string
  if (/disallow|ruled out|cancell|canceled|var/i.test(lower)) {
    return {
      type: "var",
      team,
      min,
      playerName: name,
      label: `VAR — Goal disallowed (${name})`,
    };
  }
  if (/missed pen|penalty missed/i.test(lower)) {
    return {
      type: "other",
      team,
      min,
      playerName: name,
      label: `Penalty missed — ${name}`,
    };
  }
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
  const red = isRed || /red|second yellow/i.test(cardStr);
  return {
    type: "card",
    team,
    min,
    playerName: name,
    cardColor: red ? "red" : "yellow",
    label: `${red ? "Red" : "Yellow"} card — ${name}`,
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

  // TSDB detail strings occasionally repeat the same entry — dedupe on
  // type+team+player+minute so a scorer is never shown more times than real.
  const seen = new Set<string>();
  const deduped = events.filter((e) => {
    const key = `${e.type}|${e.team}|${e.playerName.toLowerCase()}|${e.min}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort(
    (a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0)
  );
}

function mapApiTimeline(rows: Array<Record<string, unknown>>): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const row of rows) {
    const team: "home" | "away" = row.strHome === "Yes" ? "home" : "away";
    const min = String(row.intTime ?? "");
    const kind = String(row.strTimeline || "").toLowerCase();
    const detailRaw = String(row.strTimelineDetail || "").trim();
    const detail = detailRaw.toLowerCase();
    const comment = String(row.strComment || "").trim();
    const player = String(row.strPlayer || "").trim();
    const type = normalizeEventType(kind, detail);

    if (type === "goal") {
      const assist = String(row.strAssist || "").trim();
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
    } else if (type === "var") {
      // Ruled-out goals / VAR reviews must be labelled, never counted as goals
      const reason = detailRaw || comment || "Decision reviewed";
      events.push({
        type: "var",
        team,
        min,
        playerName: player,
        label: player ? `VAR — ${reason} (${player})` : `VAR — ${reason}`,
      });
    } else if (type === "card") {
      const cardColor = detectCardColor(detail, comment);
      events.push({
        type: "card",
        team,
        min,
        playerName: player,
        cardColor,
        label: `${cardColor === "red" ? "Red" : "Yellow"} card — ${player || "Unknown"}`,
      });
    } else if (type === "sub") {
      const onPlayer =
        String(row.strAssist || "").trim() || detailRaw || "";
      events.push({
        type: "sub",
        team,
        min,
        playerName: player,
        label: onPlayer
          ? `Sub: ${player} → ${onPlayer}`
          : `Sub: ${player || "Unknown"}`,
      });
    } else if (type === "other") {
      // e.g. missed penalties — shown in the timeline, excluded from scorers
      const reason = detailRaw || comment || "Match incident";
      events.push({
        type: "other",
        team,
        min,
        playerName: player,
        label: player ? `${reason} — ${player}` : reason,
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
    const [rawEvents, liveEvents] = await Promise.all([
      fetchEventsForDate(dateStr),
      fetchLiveEvents(),
    ]);

    // The livescore feed carries the freshest strStatus / strProgress / scores,
    // so overlay it onto the (often stale) eventsday.php rows.
    const liveById = new Map<string, Record<string, unknown>>();
    for (const le of liveEvents) {
      const id = String(le.idEvent || le.id || "");
      if (id) liveById.set(id, le);
    }
    const liveIds = new Set(liveById.keys());

    const mergedEvents = rawEvents.map((f) => {
      const live = liveById.get(String(f.idEvent || f.id || ""));
      if (!live) return f;
      return {
        ...f,
        strStatus: live.strStatus ?? f.strStatus,
        strProgress: live.strProgress ?? f.strProgress,
        intHomeScore: live.intHomeScore ?? f.intHomeScore,
        intAwayScore: live.intAwayScore ?? f.intAwayScore,
      };
    });

    const cleanMatches = mergedEvents.map((f) => {
      const leagueName = String(f.strLeague || "");
      const status = resolveMatchStatus(f, liveIds);

      const homeScore =
        f.intHomeScore !== null &&
        f.intHomeScore !== undefined &&
        f.intHomeScore !== ""
          ? Number(f.intHomeScore)
          : null;
      const awayScore =
        f.intAwayScore !== null &&
        f.intAwayScore !== undefined &&
        f.intAwayScore !== ""
          ? Number(f.intAwayScore)
          : null;

      const events = parseEventFields(f as Record<string, string | null | undefined>);

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

    // Re-fetch the official timeline when string-parsed events are missing or
    // clearly wrong (more goal events than the actual score — the "phantom
    // scorer" bug where disallowed goals inflate the tally).
    const looksInconsistent = (m: (typeof cleanMatches)[number]) => {
      const homeGoals = m.events.filter(
        (e) => e.type === "goal" && e.team === "home"
      ).length;
      const awayGoals = m.events.filter(
        (e) => e.type === "goal" && e.team === "away"
      ).length;
      return (
        m.hasScore &&
        (homeGoals > m.score.home || awayGoals > m.score.away)
      );
    };

    const enrichTargets = cleanMatches.filter(
      (m) =>
        (m.status === "live" || m.status === "final") &&
        (m.events.length === 0 || m.status === "live" || looksInconsistent(m))
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
