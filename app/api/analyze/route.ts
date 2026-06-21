import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { home, away, status, score, prob } = await req.json();

    const ctx =
      status === "final"
        ? `Final score: ${home} ${score.home}–${score.away} ${away}`
        : `Upcoming fixture. Win probabilities: ${home} ${prob?.home ?? "?"}%, Draw ${prob?.draw ?? "?"}%, ${away} ${prob?.away ?? "?"}%`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a sharp football pundit. Analyze this fixture in 3–4 punchy sentences: ${home} vs ${away}. ${ctx}. Cover the key tactical battle, standout performers or threats, and a verdict. Sound like a real analyst — confident and specific. No bullet points.`,
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to analyze match" }, { status: 500 });
  }
}
