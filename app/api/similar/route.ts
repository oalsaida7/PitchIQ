import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { CLAUDE_MODEL } from "@/lib/tsdb";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Global football scout. Someone wants: "${query}". Suggest 3 real current players who match — include at least one from a less-known league. For each: name, current club, league, one sentence on why they match, one key real stat. Under 130 words total.`,
      }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("similar error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}