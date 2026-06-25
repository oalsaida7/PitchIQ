export const CLAUDE_MODEL = "claude-3-haiku-20240307";

export const TSDB_FETCH: RequestInit = { cache: "no-store" };

export interface MatchEvent {
  type: "goal" | "card" | "sub";
  team: "home" | "away";
  min: string;
  label: string;
  playerName: string;
}

const FINISHED_STATUSES = new Set([
  "Match Finished",
  "FT",
  "AET",
  "PEN",
  "Finished",
  "After Penalties",
  "After Extra Time",
]);

const SCHEDULED_STATUSES = new Set([
  "NS",
  "Not Started",
  "TBD",
  "Scheduled",
  "Postponed",
  "Cancelled",
  "Abandoned",
  "Delayed",
  "",
]);

const LIVE_STATUSES = new Set([
  "In Progress",
  "HT",
  "1H",
  "2H",
  "ET",
  "BT",
  "P",
  "LIVE",
  "Half Time",
  "Extra Time",
]);

const COUNTRY_ISO: Record<string, string> = {
  Morocco: "ma",
  Haiti: "ht",
  Scotland: "gb-sct",
  Brazil: "br",
  Switzerland: "ch",
  Canada: "ca",
  Colombia: "co",
  "DR Congo": "cd",
  "Bosnia-Herzegovina": "ba",
  "Bosnia and Herzegovina": "ba",
  Qatar: "qa",
  Mexico: "mx",
  "South Korea": "kr",
  "Korea Republic": "kr",
  Germany: "de",
  France: "fr",
  Spain: "es",
  England: "gb-eng",
  Argentina: "ar",
  Portugal: "pt",
  Netherlands: "nl",
  Belgium: "be",
  Italy: "it",
  Croatia: "hr",
  Japan: "jp",
  USA: "us",
  "United States": "us",
  Australia: "au",
  Uruguay: "uy",
  Ecuador: "ec",
  Senegal: "sn",
  Tunisia: "tn",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  "South Africa": "za",
  Sweden: "se",
  Poland: "pl",
  Austria: "at",
  Turkey: "tr",
  Turkiye: "tr",
  "Czech Republic": "cz",
  "Costa Rica": "cr",
  "Saudi Arabia": "sa",
  Iran: "ir",
  "IR Iran": "ir",
  Ghana: "gh",
  Cameroon: "cm",
  Serbia: "rs",
  Denmark: "dk",
  Wales: "gb-wls",
  Ukraine: "ua",
  Chile: "cl",
  Peru: "pe",
  Paraguay: "py",
  Nigeria: "ng",
  Egypt: "eg",
  Algeria: "dz",
  Norway: "no",
  Finland: "fi",
  Greece: "gr",
  Romania: "ro",
  Hungary: "hu",
  "New Zealand": "nz",
  Panama: "pa",
  Jordan: "jo",
  Iraq: "iq",
  Uzbekistan: "uz",
  Curacao: "cw",
  "Curaçao": "cw",
  "Cape Verde": "cv",
};

export function tsdbBase(): string {
  const apiKey = process.env.THESPORTSDB_KEY;
  if (!apiKey) throw new Error("THESPORTSDB_KEY not configured");
  return `https://www.thesportsdb.com/api/v1/json/${apiKey}`;
}

export function isInternationalLeague(leagueName: string): boolean {
  const l = (leagueName || "").toLowerCase();
  return (
    l.includes("world cup") ||
    l.includes("euro 20") ||
    l.includes("copa america") ||
    l.includes("nations league") ||
    l.includes("afcon") ||
    l.includes("asian cup")
  );
}

export function countryFlagUrl(teamName: string): string | null {
  const code = COUNTRY_ISO[teamName];
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}

export function teamIconUrl(
  teamName: string,
  badgeUrl: string,
  leagueName: string
): string {
  if (isInternationalLeague(leagueName)) {
    return countryFlagUrl(teamName) || badgeUrl || "";
  }
  return badgeUrl || countryFlagUrl(teamName) || "";
}

export function parseKickoff(dateEvent: string, strTime: string): Date | null {
  if (!dateEvent) return null;
  const timeRaw = strTime ? String(strTime).substring(0, 8) : "15:00:00";
  const iso = `${dateEvent}T${timeRaw}`;
  const local = new Date(iso);
  if (!isNaN(local.getTime())) return local;
  const utc = new Date(`${iso}Z`);
  return isNaN(utc.getTime()) ? null : utc;
}

export function resolveMatchStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
  liveIds: Set<string>,
  now: Date = new Date()
): "scheduled" | "live" | "final" {
  const id = String(event.idEvent || "");
  const strStatus = String(event.strStatus || "").trim();
  const homeScore = event.intHomeScore;
  const awayScore = event.intAwayScore;
  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    homeScore !== "" &&
    awayScore !== null &&
    awayScore !== undefined &&
    awayScore !== "";

  if (FINISHED_STATUSES.has(strStatus)) return "final";
  if (SCHEDULED_STATUSES.has(strStatus)) return "scheduled";

  const kickoff = parseKickoff(event.dateEvent, event.strTime);
  let minutesSinceKick = -9999;
  if (kickoff) {
    minutesSinceKick = (now.getTime() - kickoff.getTime()) / 60000;
  }

  if (liveIds.has(id)) return "live";

  if (kickoff && minutesSinceKick > 105) {
    return hasScore ? "final" : "scheduled";
  }

  if (LIVE_STATUSES.has(strStatus)) {
    if (kickoff && minutesSinceKick >= -10 && minutesSinceKick <= 105) {
      return "live";
    }
    return hasScore ? "final" : "scheduled";
  }

  if (hasScore && kickoff && minutesSinceKick > 0) return "final";
  return "scheduled";
}

export function resolveLiveMinute(
  status: string,
  strStatus: string,
  strProgress: string
): string {
  if (status !== "live") return "";
  if (strStatus === "HT" || strStatus === "Half Time") return "HT";
  if (strProgress && strProgress !== "0") return `${strProgress}'`;
  if (strStatus === "1H" || strStatus === "2H" || strStatus === "ET") return strStatus;
  return "LIVE";
}

export function normalizeEventType(raw: string, detail: string): MatchEvent["type"] {
  const kind = raw.toLowerCase();
  const det = detail.toLowerCase();
  if (kind === "goal" || kind === "penalty" || det.includes("goal")) return "goal";
  if (kind === "card" || det.includes("card")) return "card";
  if (kind === "subst" || kind === "substitution") return "sub";
  return "goal";
}

export function positionToRow(pos: string): number {
  const p = (pos || "").toLowerCase();
  if (p.includes("goalkeeper") || p === "gk") return 1;
  if (p.includes("defender") || p.includes("back")) return 2;
  if (p.includes("mid") || p.includes("wing")) return 3;
  return 4;
}

export function mapRole(pos: string): string {
  const p = (pos || "").toLowerCase();
  if (p.includes("goalkeeper")) return "GK";
  if (p.includes("defender") || p.includes("back")) return "DEF";
  if (p.includes("mid") || p.includes("wing")) return "MID";
  return "FWD";
}

export function gridForPlayer(
  row: number,
  indexInRow: number,
  countInRow: number,
  side: "home" | "away"
): string {
  const col =
    countInRow <= 1
      ? 3
      : Math.min(5, Math.max(1, Math.round((indexInRow / (countInRow - 1)) * 4) + 1));
  const sideRow = side === "home" ? row : row + 4;
  return `${sideRow}:${col}`;
}

export function pitchPositionFromGrid(
  gridStr: string,
  side: "home" | "away"
): { top: string; left: string } {
  if (!gridStr) return { top: side === "home" ? "25%" : "75%", left: "50%" };

  const [rawRow, col] = gridStr.split(":").map(Number);
  const row = side === "home" ? rawRow : rawRow > 4 ? rawRow - 4 : rawRow;
  const maxCol = 5;
  const leftPct = maxCol <= 1 ? 50 : ((col - 1) / (maxCol - 1)) * 70 + 15;

  if (side === "home") {
    const topPct = 6 + ((row - 1) / 3) * 36;
    return { top: `${topPct}%`, left: `${leftPct}%` };
  }

  const topPct = 94 - ((row - 1) / 3) * 36;
  return { top: `${topPct}%`, left: `${leftPct}%` };
}

export async function fetchJsonSafe(url: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, TSDB_FETCH);
    if (!res.ok) return {};
    const text = await res.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function fetchLiveEventIds(): Promise<Set<string>> {
  try {
    const data = await fetchJsonSafe(`${tsdbBase()}/livescore.php?s=Soccer`);
    const events = (data.events as Array<{ idEvent?: string }>) || [];
    return new Set(events.map((e) => String(e.idEvent || "")).filter(Boolean));
  } catch {
    return new Set();
  }
}
