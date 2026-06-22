import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const prompt = `Act as an elite football scout. Scout the player: ${name}. Provide a JSON response with exactly these keys: name, club, position, age, overall (number 1-99), ratings (object with keys: pace, technical, physical, mental, defending, shooting, all out of 99), strengths (array of 2 strings), weaknesses (array of 2 strings), style (string, 2 sentences), verdict (string). Respond ONLY in raw valid JSON.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }]
        })
      });

    const aiJson = await anthropicRes.json();
    const aiText = aiJson.content?.[0]?.text || "{}";
    
    // Safely extract JSON from Claude
    const cleanJsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
    const report = JSON.parse(cleanJsonStr);

    // Auto-generate the direct YouTube highlight search link for the frontend
    report.ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(report.name + ' football skills highlights')}`;

    return NextResponse.json({ report });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}