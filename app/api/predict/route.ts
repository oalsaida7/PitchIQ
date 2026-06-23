import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { match, type } = await req.json();

    // System prompt forces Claude to act as a data-driven football analyst returning strict JSON
    const systemPrompt = `You are PitchIQ, an elite football tactical AI. Output ONLY valid JSON. No markdown formatting, no preamble. 
    Analyze the match between ${match.home} and ${match.away}. Type requested: ${type}.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a JSON response for the '${type}' tab. 
          If type="preview": { "prediction": "2-1", "homeWin": 55, "draw": 25, "awayWin": 20, "homeScorerPred": "...", "awayScorerPred": "...", "reasoning": "..." }
          If type="lineup": { "homeFormation": "4-3-3", "awayFormation": "4-2-3-1", "homeLineup": [{ "name": "Player", "num": 10, "grid": "4:2", "rating": 7.5 }], "awayLineup": [...] }
          If type="review": { "manOfMatch": "...", "scorers": [...], "ratings": [...], "reviewText": "..." }`
        }
      ]
    });

    // Parse the JSON securely
    const textContent = response.content.find(c => c.type === 'text')?.text || "{}";
    const data = JSON.parse(textContent);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Claude API Error:", error);
    return NextResponse.json({ error: "AI Analysis Failed" }, { status: 500 });
  }
}