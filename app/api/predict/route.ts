import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { match, type } = await req.json();
  const { home, away, leagueName, status, score, prob } = match;
  const ph = prob?.home ?? 50, pd = prob?.draw ?? 25, pa = prob?.away ?? 25;
  const ctx = status === "final"
    ? `Final score: ${home} ${score.home}–${score.away} ${away}.`
    : `Win probabilities: ${home} ${ph}%, Draw ${pd}%, ${away} ${pa}%.`;

  const prompts: Record<string, string> = {
    preview: `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). ${ctx}
Respond ONLY valid JSON no backticks:
{"prediction":"2-1","homeWin":${ph},"draw":${pd},"awayWin":${pa},"keyBattle":"One sentence on key tactical battle.","homeScorerPred":"Player (min') — type","awayScorerPred":"Player (min') — type","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"Stadium Name, City","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences.","awayTactic":"2 sentences.","reasoning":"3 sentences on prediction reasoning."}`,

    lineup: `Predict starting lineups: ${home} vs ${away} (${leagueName}).
ONLY valid JSON no backticks:
{"homeFormation":"4-3-3","awayFormation":"4-2-3-1","homeLineup":[{"num":1,"name":"GK Name","role":"Goalkeeper","pred":"7.2"},{"num":2,"name":"RB Name","role":"Right back","pred":"7.0"},{"num":5,"name":"CB Name","role":"Center back","pred":"7.1"},{"num":6,"name":"CB Name","role":"Center back","pred":"7.0"},{"num":3,"name":"LB Name","role":"Left back","pred":"6.9"},{"num":8,"name":"CM Name","role":"Midfield anchor","pred":"7.3"},{"num":10,"name":"CAM Name","role":"Playmaker","pred":"7.5"},{"num":4,"name":"CM Name","role":"Box-to-box","pred":"7.2"},{"num":7,"name":"RW Name","role":"Right winger","pred":"7.3"},{"num":9,"name":"ST Name","role":"Striker","pred":"7.6"},{"num":11,"name":"LW Name","role":"Left winger","pred":"7.1"}],"awayLineup":[{"num":1,"name":"GK","role":"Goalkeeper","pred":"7.0"},{"num":2,"name":"RB","role":"Right back","pred":"6.9"},{"num":5,"name":"CB","role":"Center back","pred":"7.1"},{"num":6,"name":"CB","role":"Center back","pred":"7.0"},{"num":3,"name":"LB","role":"Left back","pred":"6.8"},{"num":4,"name":"DM","role":"Defensive mid","pred":"7.2"},{"num":8,"name":"DM","role":"Defensive mid","pred":"7.1"},{"num":7,"name":"RM","role":"Right mid","pred":"7.0"},{"num":10,"name":"CAM","role":"Attacking mid","pred":"7.3"},{"num":11,"name":"LM","role":"Left mid","pred":"6.9"},{"num":9,"name":"ST","role":"Striker","pred":"7.4"}],"lineupNote":"Key tactical matchup to watch."}`,

    review: `Match analyst. Review: ${home} ${score?.home}–${score?.away} ${away} (${leagueName}).
ONLY valid JSON no backticks:
{"manOfMatch":"Player Name","ratings":[{"name":"Player","pos":"GK","team":"${home}","rating":7.4},{"name":"Player","pos":"CB","team":"${home}","rating":7.1},{"name":"Player","pos":"CM","team":"${home}","rating":8.2},{"name":"Player","pos":"ST","team":"${home}","rating":7.9},{"name":"Player","pos":"GK","team":"${away}","rating":6.2},{"name":"Player","pos":"CB","team":"${away}","rating":6.8},{"name":"Player","pos":"CM","team":"${away}","rating":6.5},{"name":"Player","pos":"ST","team":"${away}","rating":6.3}],"homeReview":"2 sentences how ${home} played.","awayReview":"2 sentences how ${away} played.","homeImprove":"What ${home} could do better.","awayImprove":"What ${away} could do better.","scorers":[{"name":"Player Name","team":"${home}","minute":"23","type":"header","assist":"Player Name"}]}`,

    commentary: `Match commentary for ${home} vs ${away}${status==="final"?` (Final: ${score.home}-${score.away})`:""}. Make it realistic and exciting.
ONLY valid JSON no backticks:
{"events":[{"min":"3","text":"${home} win an early corner, keeper claims it comfortably.","type":"normal"},{"min":"12","text":"GOAL! ${home} take the lead! Brilliant header from the corner — the crowd goes wild!","type":"goal","team":"home"},{"min":"28","text":"Yellow card shown to ${away} midfielder for cynical foul on the break.","type":"card"},{"min":"38","text":"Huge chance for ${away} — the striker fires wide from 8 yards out!","type":"chance"},{"min":"45+2","text":"Half time. ${home} lead 1-0. A largely controlled opening 45 from the home side.","type":"normal"},{"min":"58","text":"GOAL! ${away} equalize through a clinical counter-attack. Right into the bottom corner.","type":"goal","team":"away"},{"min":"71","text":"${home} pushing hard. Header clips the top of the crossbar — so close!","type":"chance"},{"min":"79","text":"GOAL! ${home} retake the lead with a stunning 25-yard free kick!","type":"goal","team":"home"},{"min":"90+4","text":"Full time! ${home} win ${score.home}-${score.away}. A gritty, deserved three points.","type":"normal"}]}`,

    stats: `Realistic match stats for ${home} vs ${away}${status==="final"?`. Score: ${score.home}-${score.away}`:""}.
ONLY valid JSON no backticks:
{"possession":{"home":54,"away":46},"shots":{"home":14,"away":8},"shotsOnTarget":{"home":6,"away":3},"shotsOffTarget":{"home":5,"away":4},"bigChances":{"home":4,"away":2},"bigChancesMissed":{"home":2,"away":1},"passes":{"home":487,"away":364},"passAccuracy":{"home":87,"away":81},"fouls":{"home":11,"away":14},"offsides":{"home":2,"away":3},"corners":{"home":6,"away":4},"yellowCards":{"home":1,"away":2},"redCards":{"home":0,"away":0},"xG":{"home":1.8,"away":0.9}}`,

    table: `Current league table for ${leagueName} featuring ${home} and ${away}.
ONLY valid JSON no backticks:
{"teams":[{"pos":1,"name":"Leader FC","played":6,"won":5,"drawn":1,"lost":0,"gd":"+12","pts":16},{"pos":2,"name":"${home}","played":6,"won":3,"drawn":2,"lost":1,"gd":"+5","pts":11},{"pos":3,"name":"Contender FC","played":6,"won":3,"drawn":1,"lost":2,"gd":"+3","pts":10},{"pos":4,"name":"${away}","played":6,"won":2,"drawn":2,"lost":2,"gd":"-1","pts":8},{"pos":5,"name":"Midtable FC","played":6,"won":2,"drawn":1,"lost":3,"gd":"-4","pts":7},{"pos":6,"name":"Struggling FC","played":6,"won":0,"drawn":2,"lost":4,"gd":"-8","pts":2}]}`,
  };

  if (!prompts[type]) return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompts[type] }],
    });
    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const data = JSON.parse(raw);
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
