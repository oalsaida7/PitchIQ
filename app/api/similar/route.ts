import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Global football scout. Someone wants: "${query}". Suggest 3 real players — include at least one from a smaller or less-known league. For each: name, club, league, why they match, one key stat. Under 130 words total. Be specific.`,
      }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
      
    return NextResponse.json({ result: text });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}