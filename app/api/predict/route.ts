import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

// All AI-only tabs: Claude Haiku only — no fabricated data for tabs that have real data
export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();
    const { home, away, leagueName, status, score, venue } = match;
    const isFinal = status === "final";

    // ── COMMENTARY / EVENTS: real data already embedded in match object ───────
    // The frontend sends the real timeline from TSDB; we just re-wrap it.
    if (type === "commentary") {
      const realTimeline: Array<{ min: string; team: string | null; type: string; text: string }> =
        match.timeline || [];

      if (realTimeline.length > 0) {
        // Real events exist — return them directly, no AI needed
        return NextResponse.json({
          data: {
            events: realTimeline.map((e) => ({
              min: e.min,
              text: e.text,
              type: e.type === "goal" || e.type === "penalty" || e.type === "og" ? "goal" : e.type === "yellow" ? "card" : e.type === "red" ? "redcard" : "normal",
              team: e.team,
            })),
            isReal: true,
          },
        });
      }

      // No real events yet — generate AI commentary
      const prompt = `Generate match commentary for: ${home} vs ${away} (${leagueName}).${isFinal ? ` Final: ${score?.home}-${score?.away}` : " Match in progress."}
Respond ONLY with valid JSON, no backticks:
{"events":[{"min":"4","text":"${home} looking bright early, winning the first corner of the game.","type":"normal"},{"min":"17","text":"GOAL! ${home} take the lead! Clinical finish into the bottom corner.","type":"goal","team":"home"},{"min":"33","text":"Yellow card shown to the ${away} captain for a reckless challenge.","type":"card"},{"min":"45+1","text":"Half time. ${home} lead 1-0. Disciplined performance so far.","type":"normal"},{"min":"52","text":"GOAL! ${away} equalize! A sweeping team move finished brilliantly.","type":"goal","team":"away"},{"min":"68","text":"Huge chance for ${home} — header crashes off the bar!","type":"chance"},{"min":"81","text":"GOAL! ${home} retake the lead with a stunning long-range effort!","type":"goal","team":"home"},{"min":"90+3","text":"Full time! ${home} win ${isFinal && score ? score.home : 2}-${isFinal && score ? score.away : 1}. A deserved three points.","type":"normal"}],"isReal":false}`;

      const msg = await client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json({ data: m ? JSON.parse(m[0]) : { events: [], isReal: false } });
    }

    // ── LINEUP: real data already embedded in match object ────────────────────
    if (type === "lineup") {
      const realLineup = match.lineup;
      if (realLineup?.hasLineup) {
        return NextResponse.json({ data: { ...realLineup, isReal: true } });
      }
      // Fall through to AI prediction
      const prompt = `Predict starting lineups: ${home} vs ${away} (${leagueName}).
ONLY valid JSON no backticks:
{"homeFormation":"4-3-3","awayFormation":"4-2-3-1","homeLineup":[{"num":1,"name":"GK Name","role":"GK","grid":"1:3"},{"num":2,"name":"RB Name","role":"DEF","grid":"2:5"},{"num":5,"name":"CB Name","role":"DEF","grid":"2:4"},{"num":6,"name":"CB Name","role":"DEF","grid":"2:2"},{"num":3,"name":"LB Name","role":"DEF","grid":"2:1"},{"num":8,"name":"CM Name","role":"MID","grid":"3:4"},{"num":10,"name":"CAM Name","role":"MID","grid":"3:3"},{"num":4,"name":"CM Name","role":"MID","grid":"3:2"},{"num":7,"name":"RW Name","role":"FWD","grid":"4:5"},{"num":9,"name":"ST Name","role":"FWD","grid":"4:3"},{"num":11,"name":"LW Name","role":"FWD","grid":"4:1"}],"awayLineup":[{"num":1,"name":"GK","role":"GK","grid":"1:3"},{"num":2,"name":"RB","role":"DEF","grid":"2:5"},{"num":5,"name":"CB","role":"DEF","grid":"2:4"},{"num":6,"name":"CB","role":"DEF","grid":"2:2"},{"num":3,"name":"LB","role":"DEF","grid":"2:1"},{"num":4,"name":"DM","role":"MID","grid":"3:4"},{"num":8,"name":"DM","role":"MID","grid":"3:2"},{"num":7,"name":"RM","role":"MID","grid":"3:5"},{"num":10,"name":"CAM","role":"MID","grid":"4:3"},{"num":11,"name":"LM","role":"MID","grid":"3:1"},{"num":9,"name":"ST","role":"FWD","grid":"4:3"}],"lineupNote":"Key tactical matchup to watch.","isReal":false}`;
      const msg = await client.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 900, messages: [{ role: "user", content: prompt }] });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json({ data: m ? JSON.parse(m[0]) : {} });
    }

    // ── STATS: real data already embedded in match object ─────────────────────
    if (type === "stats") {
      const realStats = match.stats;
      if (realStats?.hasStats) {
        return NextResponse.json({ data: { ...realStats, isReal: true } });
      }
      const prompt = `Generate realistic match stats for ${home} vs ${away}${isFinal ? `. Score: ${score?.home}-${score?.away}` : ""}.
ONLY valid JSON no backticks:
{"possession":{"home":54,"away":46},"shots":{"home":14,"away":8},"shotsOnTarget":{"home":6,"away":3},"shotsOffTarget":{"home":5,"away":4},"corners":{"home":6,"away":4},"fouls":{"home":11,"away":14},"offsides":{"home":2,"away":3},"yellowCards":{"home":1,"away":2},"redCards":{"home":0,"away":0},"gkSaves":{"home":3,"away":6},"passes":{"home":487,"away":364},"isReal":false}`;
      const msg = await client.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 400, messages: [{ role: "user", content: prompt }] });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json({ data: m ? JSON.parse(m[0]) : {} });
    }

    // ── PREVIEW: pure AI prediction ────────────────────────────────────────────
    if (type === "preview") {
      const prompt = `Elite football analyst. Pre-match preview: ${home} vs ${away} (${leagueName}). Venue: ${venue || "TBD"}.
Respond ONLY valid JSON no backticks:
{"prediction":"2-1","homeWin":55,"draw":25,"awayWin":20,"keyBattle":"One sentence on the key tactical battle.","homeScorerPred":"Likely scorer name (min') — header/penalty/open play","awayScorerPred":"Likely scorer name (min') — open play","homeForm":["W","W","D","L","W"],"awayForm":["L","W","W","W","D"],"h2h":[{"date":"May 2025","result":"${home} 2-1 ${away}","winner":"home"},{"date":"Dec 2024","result":"${away} 1-0 ${home}","winner":"away"},{"date":"Apr 2024","result":"Draw 1-1","winner":"draw"}],"venue":"${venue || "Stadium Name, City"}","referee":"Referee Name","competition":"${leagueName}","homeTactic":"2 sentences on ${home} expected tactical setup.","awayTactic":"2 sentences on ${away} expected approach.","reasoning":"3 sentences of analytical reasoning supporting the prediction."}`;
      const msg = await client.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 700, messages: [{ role: "user", content: prompt }] });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json({ data: m ? JSON.parse(m[0]) : {} });
    }

    // ── REVIEW: post-match AI analysis using real score ────────────────────────
    if (type === "review") {
      const realTimeline: Array<{ min: string; team: string | null; type: string; text: string; playerName?: string }> = match.timeline || [];
      const realGoals = realTimeline.filter((e) => ["goal", "penalty", "og"].includes(e.type));
      const scorersContext = realGoals.length > 0
        ? `Real goals: ${realGoals.map((g) => `${g.playerName || "Unknown"} (${g.min}') for ${g.team === "home" ? home : away}`).join(", ")}`
        : "Goal scorer details not available.";

      const prompt = `Football match analyst. Post-match review: ${home} ${score?.home ?? 0}–${score?.away ?? 0} ${away} (${leagueName}).
${scorersContext}
Respond ONLY valid JSON no backticks:
{"manOfMatch":"Player Full Name","homeReview":"2 sentences on how ${home} played tactically.","awayReview":"2 sentences on how ${away} played.","homeImprove":"1 sentence what ${home} could improve.","awayImprove":"1 sentence what ${away} could improve.","ratings":[{"name":"Player Name","pos":"GK","team":"${home}","rating":7.4},{"name":"Player Name","pos":"CB","team":"${home}","rating":7.1},{"name":"Player Name","pos":"CM","team":"${home}","rating":8.2},{"name":"Player Name","pos":"ST","team":"${home}","rating":7.9},{"name":"Player Name","pos":"GK","team":"${away}","rating":6.2},{"name":"Player Name","pos":"CB","team":"${away}","rating":6.8},{"name":"Player Name","pos":"CM","team":"${away}","rating":6.5},{"name":"Player Name","pos":"ST","team":"${away}","rating":6.3}]}`;
      const msg = await client.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 700, messages: [{ role: "user", content: prompt }] });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      const reviewData = m ? JSON.parse(m[0]) : {};
      // Inject real goal scorer events from TSDB
      reviewData.scorers = realGoals.map((g) => ({
        name: g.playerName || "Unknown",
        team: g.team === "home" ? home : away,
        minute: g.min,
        type: g.type === "penalty" ? "Penalty" : g.type === "og" ? "Own Goal" : "Goal",
        assist: "",
      }));
      return NextResponse.json({ data: reviewData });
    }

    // ── TABLE: AI with World Cup awareness ────────────────────────────────────
    if (type === "table") {
      const isWC = (leagueName || "").toLowerCase().includes("world cup");
      const prompt = isWC
        ? `FIFA World Cup 2026 group stage table. ${home} and ${away} are in the same group. Return a 4-team group table.
ONLY valid JSON no backticks:
{"teams":[{"pos":1,"name":"${home}","played":2,"won":2,"drawn":0,"lost":0,"gd":"+4","pts":6},{"pos":2,"name":"Top Team B","played":2,"won":1,"drawn":0,"lost":1,"gd":"+1","pts":3},{"pos":3,"name":"${away}","played":2,"won":0,"drawn":1,"lost":1,"gd":"-2","pts":1},{"pos":4,"name":"Bottom Team","played":2,"won":0,"drawn":1,"lost":1,"gd":"-3","pts":1}]}`
        : `Current ${leagueName} table featuring ${home} and ${away} near the top. Show 8 teams.
ONLY valid JSON no backticks:
{"teams":[{"pos":1,"name":"League Leader","played":30,"won":22,"drawn":5,"lost":3,"gd":"+45","pts":71},{"pos":2,"name":"${home}","played":30,"won":18,"drawn":6,"lost":6,"gd":"+28","pts":60},{"pos":3,"name":"Third Place","played":30,"won":17,"drawn":4,"lost":9,"gd":"+18","pts":55},{"pos":4,"name":"${away}","played":30,"won":15,"drawn":6,"lost":9,"gd":"+12","pts":51},{"pos":5,"name":"Fifth Club","played":30,"won":13,"drawn":8,"lost":9,"gd":"+5","pts":47},{"pos":6,"name":"Sixth Club","played":30,"won":12,"drawn":7,"lost":11,"gd":"+2","pts":43},{"pos":7,"name":"Seventh Club","played":30,"won":9,"drawn":8,"lost":13,"gd":"-8","pts":35},{"pos":8,"name":"Eighth Club","played":30,"won":7,"drawn":5,"lost":18,"gd":"-22","pts":26}]}`;
      const msg = await client.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 500, messages: [{ role: "user", content: prompt }] });
      const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      const m = raw.match(/\{[\s\S]*\}/);
      return NextResponse.json({ data: m ? JSON.parse(m[0]) : { teams: [] } });
    }

    return NextResponse.json({ data: {} });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json({ data: { _error: true } });
  }
}