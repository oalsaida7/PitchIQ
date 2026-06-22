import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch live transfer news from an open RSS stream
    const res = await fetch("https://www.skysports.com/rss/12040", {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    const xmlText = await res.text();

    // Simple regex parser to extract items from the XML feed
    const items: any[] = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const content = match[1];
      const title = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || content.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      const description = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || content.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
      const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";

      if (title) {
        const cleanTitle = title.replace(/&amp;/g, "&").trim();
        const isConfirmed = cleanTitle.toLowerCase().includes("sign") || cleanTitle.toLowerCase().includes("done") || cleanTitle.toLowerCase().includes("official");
        
        items.push({
          id: Math.random().toString(),
          source: cleanTitle.toLowerCase().includes("romano") || cleanTitle.toLowerCase().includes("here we go") ? "Fabrizio Romano" : "Sky Sports",
          headline: cleanTitle,
          snippet: description.replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim(),
          tag: isConfirmed ? "done" : "rumor",
          time: new Date(pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confirmed: isConfirmed
        });
      }
    }

    return NextResponse.json({ news: items.slice(0, 15) });
  } catch (error) {
    return NextResponse.json({ news: [] });
  }
}