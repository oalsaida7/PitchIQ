import { NextResponse } from "next/server";
import { decodeHtmlEntities, formatEstDateTime } from "@/lib/tsdb";

export type NewsCategory =
  | "all"
  | "transfers"
  | "players"
  | "international"
  | "managers"
  | "general";

interface FeedConfig {
  id: NewsCategory;
  label: string;
  url: string;
}

const FEEDS: FeedConfig[] = [
  {
    id: "transfers",
    label: "Transfers",
    url: "https://www.skysports.com/rss/12040",
  },
  {
    id: "players",
    label: "Player News",
    url: "https://www.bbc.co.uk/sport/football/rss.xml",
  },
  {
    id: "international",
    label: "International",
    url: "https://www.theguardian.com/football/international/rss",
  },
  {
    id: "managers",
    label: "Managers",
    url: "https://www.skysports.com/rss/12040",
  },
  {
    id: "general",
    label: "General",
    url: "https://www.skysports.com/rss/12040",
  },
];

interface NewsItem {
  id: string;
  category: NewsCategory;
  categoryLabel: string;
  source: string;
  headline: string;
  snippet: string;
  url: string;
  time: string;
  timestamp: number;
  tag: "done" | "rumor" | "breaking" | "news";
  confirmed: boolean;
}

function parseRssDate(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

function extractTag(title: string): NewsItem["tag"] {
  const t = title.toLowerCase();
  if (t.includes("here we go") || t.includes("official") || t.includes("done deal"))
    return "done";
  if (t.includes("breaking")) return "breaking";
  if (
    t.includes("linked") ||
    t.includes("interest") ||
    t.includes("target") ||
    t.includes("rumour") ||
    t.includes("rumor")
  )
    return "rumor";
  return "news";
}

function classifyItem(title: string, description: string, feedId: NewsCategory): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (feedId !== "general" && feedId !== "all") return feedId;
  if (/transfer|sign|deal|fee|contract|here we go|loan/.test(text)) return "transfers";
  if (/manager|coach|sacked|appointed|tactics/.test(text)) return "managers";
  if (/world cup|nations league|international|qualifier|euro 20/.test(text))
    return "international";
  if (/injury|return|fitness|suspension|player/.test(text)) return "players";
  return "general";
}

function parseRssXml(xml: string, feed: FeedConfig): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const block of blocks) {
    const titleRaw =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
      "";
    const descRaw =
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ||
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ||
      "";
    const pubDateRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "";
    const linkRaw =
      block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1] ||
      block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ||
      "";

    if (!titleRaw.trim()) continue;

    const headline = decodeHtmlEntities(titleRaw.replace(/<[^>]*>/g, "").trim());
    const snippet = decodeHtmlEntities(
      descRaw.replace(/<[^>]*>/g, "").trim().slice(0, 280)
    );
    const parsedDate = parseRssDate(pubDateRaw);
    const tag = extractTag(headline);
    const category = classifyItem(headline, snippet, feed.id);

    items.push({
      id: `${feed.id}-${Buffer.from(headline).toString("base64url").slice(0, 16)}`,
      category,
      categoryLabel:
        FEEDS.find((f) => f.id === category)?.label || feed.label,
      source: headline.toLowerCase().includes("romano")
        ? "Fabrizio Romano"
        : feed.url.includes("bbc")
        ? "BBC Sport"
        : feed.url.includes("guardian")
        ? "The Guardian"
        : "Sky Sports",
      headline,
      snippet,
      url: linkRaw.trim() || `https://www.google.com/search?q=${encodeURIComponent(headline)}`,
      time: parsedDate ? formatEstDateTime(parsedDate) : "Recently",
      timestamp: parsedDate?.getTime() || Date.now(),
      tag,
      confirmed: tag === "done",
    });
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") || "all") as NewsCategory;

  try {
    const uniqueFeeds = FEEDS.filter(
      (f, i, arr) => arr.findIndex((x) => x.url === f.url) === i
    );

    const results = await Promise.all(
      uniqueFeeds.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            cache: "no-store",
            headers: { "User-Agent": "PitchIQ/1.0" },
          });
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRssXml(xml, feed);
        } catch {
          return [];
        }
      })
    );

    let news = results.flat().sort((a, b) => b.timestamp - a.timestamp);

    const seen = new Set<string>();
    news = news.filter((n) => {
      const key = n.headline.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (category !== "all") {
      news = news.filter((n) => n.category === category);
    }

    return NextResponse.json({
      news: news.slice(0, 30),
      categories: [
        { id: "all", label: "All News" },
        ...FEEDS.map((f) => ({ id: f.id, label: f.label })),
      ],
    });
  } catch (err) {
    console.error("news error:", err);
    return NextResponse.json({ news: [], categories: [] });
  }
}
