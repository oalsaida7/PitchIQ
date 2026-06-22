import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const prompt = `Global football scout. Someone wants: "${query}". Suggest 3 real players — include at least one from a smaller or less-known league. For each: name, club, league, why they match, one key stat. Under 130 words total. Be specific.`;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
    return NextResponse.json({ result: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
