import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { match, type } = await req.json();
  const { home, away, league, status, score, prob } = match;
  const ph = prob ? Math.round(prob.home) : 50;
  const pd = prob ? Math.round(prob.draw) : 25;
  const pa = prob ? 100 - ph - pd : 25;

  const prompts: Record<string, string> = {
    predict: `You are an elite football analyst. Predict: ${home} vs ${away} (${league}). Win probabilities: ${home} ${ph}%, Draw ${pd}%, ${away} ${pa}%. Respond ONLY in JSON no backticks: {"score":"2-1","homeWin":${ph},"draw":${pd},"awayWin":${pa},"scorers":[{"name":"Player Name","team":"${home}","minute":"34","type":"header","assist":"Player Name"},{"name":"Player Name","team":"${away}","minute":"78","type":"penalty","assist":""}],"homeTactic":"2-sentence tactical approach.","awayTactic":"2-sentence tactical approach.","reasoning":"3-sentence reasoning covering form, head-to-head and key matchups."}`,
    lineup: `Predict starting lineups for ${home} vs ${away} (${league}). ONLY JSON no backticks: {"homeFormation":"4-3-3","awayFormation":"4-2-3-1","homeLineup":[{"name":"GK Name","role":"Goalkeeper — organize defense","pred":"7.2"},{"name":"RB Name","role":"Right back","pred":"7.0"},{"name":"CB Name","role":"Center back","pred":"7.1"},{"name":"CB Name","role":"Center back","pred":"7.0"},{"name":"LB Name","role":"Left back","pred":"6.9"},{"name":"CM Name","role":"Midfield anchor","pred":"7.3"},{"name":"CM Name","role":"Box-to-box","pred":"7.2"},{"name":"CAM Name","role":"Playmaker","pred":"7.5"},{"name":"RW Name","role":"Right winger","pred":"7.3"},{"name":"ST Name","role":"Striker","pred":"7.6"},{"name":"LW Name","role":"Left winger","pred":"7.1"}],"awayLineup":[{"name":"GK Name","role":"Goalkeeper","pred":"7.0"},{"name":"RB Name","role":"Right back","pred":"6.9"},{"name":"CB Name","role":"Center back","pred":"7.1"},{"name":"CB Name","role":"Center back","pred":"7.0"},{"name":"LB Name","role":"Left back","pred":"6.8"},{"name":"DM Name","role":"Defensive mid","pred":"7.2"},{"name":"DM Name","role":"Defensive mid","pred":"7.1"},{"name":"RM Name","role":"Right mid","pred":"7.0"},{"name":"CAM Name","role":"Attacking mid","pred":"7.3"},{"name":"LM Name","role":"Left mid","pred":"6.9"},{"name":"ST Name","role":"Striker","pred":"7.4"}],"lineupNote":"Key tactical matchup to watch."}`,
    review: `Review finished match: ${home} ${score?.home}–${score?.away} ${away} (${league}). ONLY JSON no backticks: {"ratings":[{"name":"Player Name","pos":"GK","team":"${home}","rating":7.4},{"name":"Player Name","pos":"CM","team":"${home}","rating":8.1},{"name":"Player Name","pos":"ST","team":"${home}","rating":7.9},{"name":"Player Name","pos":"GK","team":"${away}","rating":6.2},{"name":"Player Name","pos":"CM","team":"${away}","rating":6.5},{"name":"Player Name","pos":"ST","team":"${away}","rating":6.8}],"homeReview":"2 sentences on how ${home} played.","awayReview":"2 sentences on how ${away} played.","homeImprove":"What ${home} could improve.","awayImprove":"What ${away} could improve."}`,
    analysis: `Sharp football pundit, 4 sentences: ${home} vs ${away} (${league}). ${status === "final" ? `Score: ${score?.home}–${score?.away}.` : `Probabilities: ${home} ${ph}%, Draw ${pd}%, ${away} ${pa}%.`} Cover tactics, main threats, verdict.`,
  };

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompts[type] || prompts.analysis }],
    });
    const raw = message.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("").replace(/```json|```/g, "").trim();
    const data = type === "analysis" ? { text: raw } : JSON.parse(raw);
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 });
  }
}
