import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    // Fallback static profile for quick testing if Anthropic doesn't trigger
    const report = {
      name: name || "Unknown Wonderkid",
      club: "Global Scouting Network",
      position: "Dynamic Attacker",
      age: "20",
      overall: 82,
      style: `Highly technical asset tracking across high-leverage half-spaces. Elite agility profile matching top European deployment standards.`,
      verdict: "Exceptional profile with massive ceiling coordinates. High priority transfer target.",
      // Directly linking to a clean video highlights matrix
      ytLink: `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' football skills highlights short')}`
    };

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}