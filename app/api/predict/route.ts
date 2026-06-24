import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();
    const { home, away, leagueName, status, score, venue } = match;
    const isFinal = status === "final";
    const ctx = isFinal
      ? `Final score: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away}.`
      : `Upcoming fixture. No score yet.`;

    const prompts: Record<string, string> = {
      preview: `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). Venue: ${venue || "TBD"}.Respond ONLY valid JSON no backticks:{"prediction":"2-1","homeWin":55,"draw":25,"awayWin":20,"keyBattle":"One sentence on the key tactical battle.","homeScorerPred":"Player name (min') — type","awayScorerPred":"Player name (min') — type","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"${venue || "Stadium Name, City"}","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences on expected approach.","awayTactic":"2 sentences on expected approach.","reasoning":"3 sentences on why this result."}`,
      lineup: `Predict starting lineups: ${home} vs ${away} (${leagueName}).ONLY valid JSON no backticks:{"homeFormation":"4-3-3","awayFormation":"4-2-3-1","homeLineup":[{"num":1,"name":"GK Name","role":"Goalkeeper","grid":"1:3","pred":"7.2"},{"num":2,"name":"RB Name","role":"Right back","grid":"2:5","pred":"7.0"},{"num":5,"name":"CB Name","role":"Center back","grid":"2:4","pred":"7.1"},{"num":6,"name":"CB Name","role":"Center back","grid":"2:2","pred":"7.0"},{"num":3,"name":"LB Name","role":"Left back","grid":"2:1","pred":"6.9"},{"num":8,"name":"CM Name","role":"Midfield anchor","grid":"3:4","pred":"7.3"},{"num":10,"name":"CAM Name","role":"Playmaker","grid":"3:3","pred":"7.5"},{"num":4,"name":"CM Name","role":"Box-to-box","grid":"3:2","pred":"7.2"},{"num":7,"name":"RW Name","role":"Right winger","grid":"4:5","pred":"7.3"},{"num":9,"name":"ST Name","role":"Striker","grid":"4:3","pred":"7.6"},{"num":11,"name":"LW Name","role":"Left winger","grid":"4:1","pred":"7.1"}],"awayLineup":[{"num":1,"name":"GK","role":"Goalkeeper","grid":"1:3","pred":"7.0"},{"num":2,"name":"RB","role":"Right back","grid":"2:5","pred":"6.9"},{"num":5,"name":"CB","role":"Center back","grid":"2:4","pred":"7.1"},{"num":6,"name":"CB","role":"Center back","grid":"2:2","pred":"7.0"},{"num":3,"name":"LB","role":"Left back","grid":"2:1","pred":"6.8"},{"num":4,"name":"DM","role":"Defensive mid","grid":"3:4","pred":"7.2"},{"num":8,"name":"DM","role":"Defensive mid","grid":"3:2","pred":"7.1"},{"num":7,"name":"RM","role":"Right mid","grid":"3:5","pred":"7.0"},{"num":10,"name":"CAM","role":"Attacking mid","grid":"4:3","pred":"7.3"},{"num":11,"name":"LM","role":"Left mid","grid":"3:1","pred":"6.9"},{"num":9,"name":"ST","role":"Striker","grid":"4:3","pred":"7.4"}],"lineupNote":"Key tactical matchup to watch."}`,
      review: `Match analyst. Review: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away} (${leagueName}). ${ctx}ONLY valid JSON no backticks:{"manOfMatch":"Player Name","ratings":[{"name":"Player","pos":"GK","team":"${home}","rating":7.4},{"name":"Player","pos":"CB","team":"${home}","rating":7.1},{"name":"Player","pos":"CM","team":"${home}","rating":8.2},{"name":"Player","pos":"ST","team":"${home}","rating":7.9},{"name":"Player","pos":"GK","team":"${away}","rating":6.2},{"name":"Player","pos":"CB","team":"${away}","rating":6.8},{"name":"Player","pos":"CM","team":"${away}","rating":6.5},{"name":"Player","pos":"ST","team":"${away}","rating":6.3}],"homeReview":"2 sentences how ${home} played.","awayReview":"2 sentences how ${away} played.","homeImprove":"What ${home} could do better.","awayImprove":"What ${away} could do better.","scorers":[{"name":"Player Name","team":"${home}","minute":"23","type":"header","assist":"Player Name"}]}`,
      commentary: `Match commentary for ${home} vs ${away}${isFinal ? ` (Final: ${score?.home}-${score?.away})` : ""}. Make it realistic and exciting.ONLY valid JSON no backticks:{"events":[{"min":"3","text":"${home} win an early corner, keeper claims it.","type":"normal"},{"min":"12","text":"GOAL! ${home} take the lead with a header from the corner!","type":"goal","team":"home"},{"min":"28","text":"Yellow card for ${away} midfielder — cynical foul on the break.","type":"card"},{"min":"38","text":"Huge chance for ${away} — the striker fires wide from 8 yards!","type":"chance"},{"min":"45+2","text":"Half time. ${home} lead 1-0. Controlled performance.","type":"normal"},{"min":"58","text":"GOAL! ${away} equalize through a clinical counter-attack.","type":"goal","team":"away"},{"min":"71","text":"${home} hit the crossbar — so close to the winner!","type":"chance"},{"min":"79","text":"GOAL! ${home} retake the lead with a stunning free kick!","type":"goal","team":"home"},{"min":"90+4","text":"Full time! ${home} win ${score?.home ?? 2}-${score?.away ?? 1}.","type":"normal"}]}`,
      stats: `Realistic match stats for ${home} vs ${away}${isFinal ? `. Score: ${score?.home}-${score?.away}` : ""}.ONLY valid JSON no backticks:{"possession":{"home":54,"away":46},"shots":{"home":14,"away":8},"shotsOnTarget":{"home":6,"away":3},"shotsOffTarget":{"home":5,"away":4},"bigChances":{"home":4,"away":2},"bigChancesMissed":{"home":2,"away":1},"passes":{"home":487,"away":364},"passAccuracy":{"home":87,"away":81},"fouls":{"home":11,"away":14},"offsides":{"home":2,"away":3},"corners":{"home":6,"away":4},"yellowCards":{"home":1,"away":2},"redCards":{"home":0,"away":0},"xG":{"home":1.8,"away":0.9}}`,
      table: `Current league table for ${leagueName} featuring ${home} and ${away}. Use realistic real data.ONLY valid JSON no backticks:{"teams":[{"pos":1,"name":"Leader FC","played":6,"won":5,"drawn":1,"lost":0,"gd":"+12","pts":16},{"pos":2,"name":"${home}","played":6,"won":3,"drawn":2,"lost":1,"gd":"+5","pts":11},{"pos":3,"name":"Third Place FC","played":6,"won":3,"drawn":1,"lost":2,"gd":"+3","pts":10},{"pos":4,"name":"${away}","played":6,"won":2,"drawn":2,"lost":2,"gd":"-1","pts":8},{"pos":5,"name":"Fifth FC","played":6,"won":2,"drawn":1,"lost":3,"gd":"-4","pts":7},{"pos":6,"name":"Bottom FC","played":6,"won":0,"drawn":2,"lost":4,"gd":"-8","pts":2}]}`,
    };

    if (!prompts[type]) return NextResponse.json({ data: {} });

    // Force the prompt to return World Cup group format if it's an international game
    let activePrompt = prompts[type];
    if (type === "table" && leagueName?.toLowerCase().includes("world cup")) {
      activePrompt += `\nThis is for the FIFA World Cup. Return a realistic 4-team World Cup Group Stage standings table instead of a club league table.`;
    }

    const message = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1000,
      messages: [{ role: "user", content: activePrompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Regex safety net: extracts text purely between the first { and last }
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON block found");
    
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json({ data: { _error: true } });
  }
}