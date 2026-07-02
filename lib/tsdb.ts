// claude-3-haiku-20240307 was retired by Anthropic on 2026-04-20; Haiku 4.5 replaces it
export const CLAUDE_MODEL =
  process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
export const EST_TZ = "America/New_York";

export interface MatchEvent {
  type: "goal" | "card" | "sub" | "var" | "other";
  team: "home" | "away";
  min: string;
  label: string;
  playerName: string;
  cardColor?: "yellow" | "red";
}

const FINISHED_STATUSES = new Set([
  "ft",
  "aet",
  "pen",
  "ap",
  "match finished",
  "finished",
  "full time",
  "full-time",
  "after penalties",
  "after extra time",
  "ended",
  "final",
]);

const SCHEDULED_STATUSES = new Set([
  "ns",
  "not started",
  "tbd",
  "scheduled",
  "postponed",
  "cancelled",
  "canceled",
  "abandoned",
  "delayed",
  "susp",
  "suspended",
  "",
]);

const LIVE_STATUSES = new Set([
  "in progress",
  "1h",
  "2h",
  "ht",
  "half time",
  "halftime",
  "half-time",
  "et",
  "extra time",
  "bt",
  "break time",
  "p",
  "penalty shootout",
  "live",
  "playing",
  "var",
  "kick off",
]);

export function isFinishedStatus(strStatus: string): boolean {
  const s = strStatus.trim().toLowerCase();
  if (!s) return false;
  return FINISHED_STATUSES.has(s) || s.includes("finished");
}

export function isScheduledStatus(strStatus: string): boolean {
  return SCHEDULED_STATUSES.has(strStatus.trim().toLowerCase());
}

export function isLiveStatus(strStatus: string): boolean {
  const s = strStatus.trim().toLowerCase();
  if (!s) return false;
  return LIVE_STATUSES.has(s) || s.includes("progress") || s.includes("var");
}

/** Matches "67", "45+2", "90+4'" — a real in-play minute from strProgress. */
export function parseProgressMinute(raw: unknown): string | null {
  const s = String(raw ?? "").trim().replace(/['′]/g, "");
  if (!s || s === "0" || s === "-") return null;
  const m = s.match(/^(\d{1,3})(\+\d{1,2})?$/);
  if (!m) return null;
  const base = Number(m[1]);
  if (base < 1 || base > 130) return null;
  return `${m[1]}${m[2] || ""}`;
}

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

export function getApiKey(): string {
  // Premium key — full v2 access. Never fall back to the free "123" key.
  return process.env.THESPORTSDB_KEY || "5956232335";
}

export function tsdbHeaders(): HeadersInit {
  return { "X-API-KEY": getApiKey(), Accept: "application/json" };
}

export const TSDB_FETCH: RequestInit = { cache: "no-store" };

export function tsdbV2Url(path: string): string {
  const clean = path.replace(/^\//, "");
  return `https://www.thesportsdb.com/api/v2/json/${clean}`;
}

export function tsdbV1Url(path: string): string {
  const clean = path.replace(/^\//, "");
  // v1 authenticates via the key embedded in the URL path, not the X-API-KEY header
  return `https://www.thesportsdb.com/api/v1/json/${getApiKey()}/${clean}`;
}

/** @deprecated use tsdbV2Url / tsdbFetchV2 */
export function tsdbBase(): string {
  return `https://www.thesportsdb.com/api/v1/json/${getApiKey()}`;
}

export function slugifySearch(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function estDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return estDateKey(anchor);
}

export function estRelativeLabel(dateKey: string, todayKey: string): string {
  const diff =
    (new Date(`${dateKey}T12:00:00Z`).getTime() -
      new Date(`${todayKey}T12:00:00Z`).getTime()) /
    86400000;
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff === -2) return "−2 days";
  if (diff === -3) return "−3 days";
  if (diff === 2) return "+2 days";
  if (diff === 3) return "+3 days";
  if (diff === 4) return "+4 days";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatEstDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatKickoffEst(dateEvent: string, strTime: string): string {
  const kick = parseKickoffUtc(dateEvent, strTime);
  if (!kick) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(kick);
}

export function parseKickoffUtc(dateEvent: string, strTime: string): Date | null {
  if (!dateEvent) return null;
  const timeRaw = strTime ? String(strTime).substring(0, 8) : "19:00:00";
  const utc = new Date(`${dateEvent}T${timeRaw}Z`);
  if (!isNaN(utc.getTime())) return utc;
  const local = new Date(`${dateEvent}T${timeRaw}`);
  return isNaN(local.getTime()) ? null : local;
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

export function unwrapList(
  data: Record<string, unknown> | unknown[],
  keys: string[]
): unknown[] {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    const val = (data as Record<string, unknown>)[k];
    if (Array.isArray(val)) return val;
  }
  return [];
}

export async function fetchJsonSafe(
  url: string,
  headers?: HeadersInit
): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, {
      ...TSDB_FETCH,
      headers: { ...tsdbHeaders(), ...headers },
    });
    if (!res.ok) return {};
    const text = await res.text();
    if (!text.trim()) return {};
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { list: parsed };
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function tsdbFetchV2(path: string): Promise<Record<string, unknown>> {
  return fetchJsonSafe(tsdbV2Url(path));
}

export async function tsdbFetchV1(path: string): Promise<Record<string, unknown>> {
  return fetchJsonSafe(tsdbV1Url(path));
}

export async function fetchLiveEvents(): Promise<
  Array<Record<string, unknown>>
> {
  const data = await tsdbFetchV2("livescore/soccer");
  return unwrapList(data, [
    "livescore",
    "events",
    "results",
    "list",
  ]) as Array<Record<string, unknown>>;
}

export async function fetchLiveEventIds(): Promise<Set<string>> {
  const events = await fetchLiveEvents();
  return new Set(
    events
      .map((e) => String(e.idEvent || e.id || ""))
      .filter(Boolean)
  );
}

export async function fetchEventsForDate(dateStr: string): Promise<
  Array<Record<string, unknown>>
> {
  const data = await tsdbFetchV1(
    `eventsday.php?d=${dateStr}&s=Soccer`
  );
  const events = unwrapList(data, ["events", "results"]) as Array<
    Record<string, unknown>
  >;
  if (events.length) return events;

  const live = await fetchLiveEvents();
  return live.filter((e) => String(e.dateEvent || "") === dateStr);
}

export function resolveMatchStatus(
  event: Record<string, unknown>,
  liveIds: Set<string>,
  now: Date = new Date()
): "scheduled" | "live" | "final" {
  const id = String(event.idEvent || event.id || "");
  const strStatus = String(event.strStatus || "").trim();
  const progressMinute = parseProgressMinute(event.strProgress);
  const homeScore = event.intHomeScore;
  const awayScore = event.intAwayScore;
  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    homeScore !== "" &&
    awayScore !== null &&
    awayScore !== undefined &&
    awayScore !== "";

  // Explicit terminal statuses win over everything (FT, AET, PEN, Match Finished…)
  if (isFinishedStatus(strStatus)) return "final";

  // Currently reported by the live feed
  if (liveIds.has(id)) return "live";

  // strStatus says in play (In Progress, 1H, HT, ET, VAR…) or a real minute is ticking
  if (isLiveStatus(strStatus)) return "live";
  if (progressMinute) return "live";

  if (isScheduledStatus(strStatus)) return "scheduled";

  // Unknown status string: fall back to kickoff-time heuristics
  const kickoff = parseKickoffUtc(
    String(event.dateEvent || ""),
    String(event.strTime || "")
  );
  const minutesSinceKick = kickoff
    ? (now.getTime() - kickoff.getTime()) / 60000
    : -9999;

  if (kickoff && minutesSinceKick > 130) {
    return hasScore ? "final" : "scheduled";
  }
  if (hasScore && kickoff && minutesSinceKick > 0) return "live";
  return "scheduled";
}

export function resolveLiveMinute(
  event: Record<string, unknown>,
  status: string
): string {
  if (status !== "live") return "";

  const strStatus = String(event.strStatus || "").trim().toLowerCase();
  if (
    strStatus === "ht" ||
    strStatus === "half time" ||
    strStatus === "halftime" ||
    strStatus === "half-time"
  ) {
    return "HT";
  }
  if (strStatus === "bt" || strStatus === "break time") return "BT";
  if (strStatus === "p" || strStatus === "penalty shootout") return "PEN";

  // strProgress carries the exact live minute (e.g. "67" or "45+2")
  const progressMinute = parseProgressMinute(
    event.strProgress ?? event.intProgress ?? event.strElapsed
  );
  if (progressMinute) return `${progressMinute}'`;

  if (strStatus === "et" || strStatus === "extra time") return "ET";
  if (strStatus === "var") return "VAR";
  if (strStatus === "1h") return "1H";
  if (strStatus === "2h") return "2H";

  // Last resort: estimate from kickoff time
  const kickoff = parseKickoffUtc(
    String(event.dateEvent || ""),
    String(event.strTime || "")
  );
  if (kickoff) {
    const elapsed = (Date.now() - kickoff.getTime()) / 60000;
    if (elapsed >= 0 && elapsed <= 45) return `${Math.floor(elapsed)}'`;
    if (elapsed > 45 && elapsed <= 60) return "HT";
    if (elapsed > 60 && elapsed <= 120) {
      return `${Math.min(90, Math.floor(elapsed - 15))}'`;
    }
  }

  return "LIVE";
}

export function normalizeEventType(raw: string, detail: string): MatchEvent["type"] {
  const kind = raw.toLowerCase();
  const det = detail.toLowerCase();

  // VAR reviews and disallowed goals must never be counted as goals
  if (kind === "var" || kind.includes("var")) return "var";
  if (det.includes("disallowed") || det.includes("cancelled") || det.includes("canceled"))
    return "var";
  if (det.includes("missed penalty") || det.includes("penalty missed")) return "other";

  if (kind === "card" || det.includes("card")) return "card";
  if (kind === "subst" || kind === "substitution") return "sub";
  if (kind === "goal" || kind === "penalty" || det.includes("goal")) return "goal";
  return "other";
}

export function detectCardColor(detail: string, comment = ""): "yellow" | "red" {
  const text = `${detail} ${comment}`.toLowerCase();
  if (text.includes("red") || text.includes("second yellow")) return "red";
  return "yellow";
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
