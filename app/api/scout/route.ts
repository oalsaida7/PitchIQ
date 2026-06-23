import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      temperature: 0.3,
      system: "You are an elite football scout AI. Return ONLY valid JSON. No markdown.",
      messages: [
        {
          role: "user",
          content: `Scout player: ${name}. Return JSON format: 
          { "name": "...", "position": "...", "club": "...", "age": 22, "overall": 85, "style": "...", "verdict": "...", "ytQuery": "..." }`
        }
      ]
    });

    const textContent = response.content.find(c => c.type === 'text')?.text || "{}";
    const report = JSON.parse(textContent);

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: "Scout API Failed" }, { status: 500 });
  }
}