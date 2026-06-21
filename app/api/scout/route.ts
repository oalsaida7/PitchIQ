import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are an elite football scout. Generate a scouting report for: ${name}. Respond ONLY in this exact JSON (no backticks, no preamble): {"name":"Full Name","position":"Position","club":"Current Club","nationality":"Nationality","age":24,"ratings":{"pace":85,"technical":88,"physical":74,"mental":82,"defending":45,"shooting":78},"overall":87,"strengths":["Dribbling","Pace","Creativity"],"weaknesses":["Defensive work","Aerial duels"],"style":"Two-sentence playing style description.","verdict":"Two-sentence scout verdict on value and potential."}`,
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const report = JSON.parse(text);
    return NextResponse.json({ report });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate scouting report" }, { status: 500 });
  }
}
