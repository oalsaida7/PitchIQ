export interface Match {
  id: string;
  league: string;
  leagueName: string;
  leagueColor: string;
  leagueAbbr: string;
  home: string; away: string;
  homeAbbr: string; awayAbbr: string;
  score: { home: number; away: number };
  status: "scheduled" | "live" | "final";
  kick: string;
  liveMin?: string;
  prob?: { home: number; draw: number; away: number };
}

export interface NewsItem {
  id: string;
  cat: "transfers" | "wc" | "epl" | "general";
  source: string;
  confirmed: boolean;
  headline: string;
  snippet: string;
  time: string;
  tag?: "done" | "rumor" | "breaking";
}

export interface SearchEntity {
  type: "player" | "club" | "country";
  name: string;
  sub: string;
  detail: Record<string, unknown>;
}

const WC = (id: string, home: string, away: string, ha: string, aa: string,
  sh: number, sa: number, status: Match["status"], kick: string,
  prob?: { home: number; draw: number; away: number }): Match => ({
  id, league: "wc", leagueName: "FIFA World Cup 2026",
  leagueColor: "#c9a227", leagueAbbr: "WC",
  home, away, homeAbbr: ha, awayAbbr: aa,
  score: { home: sh, away: sa }, status, kick, prob,
});

export const MATCHES_BY_DATE: Record<string, Match[]> = {
  "2026-06-19": [
    WC("wc1","Mexico","Korea Republic","MEX","KOR",1,0,"final","Jun 19 · 9:00 PM"),
    WC("wc2","USA","Australia","USA","AUS",2,0,"final","Jun 19 · 3:00 PM"),
    WC("wc3","Scotland","Morocco","SCO","MAR",0,1,"final","Jun 19 · 6:00 PM"),
    WC("wc4","Brazil","Haiti","BRA","HTI",3,0,"final","Jun 19 · 8:30 PM"),
    WC("wc5","Turkiye","Paraguay","TUR","PAR",0,1,"final","Jun 19 · 11:00 PM"),
  ],
  "2026-06-20": [
    WC("wc6","Netherlands","Sweden","NED","SWE",5,1,"final","Jun 20 · 1:00 PM"),
    WC("wc7","Germany","Ivory Coast","GER","CIV",2,1,"final","Jun 20 · 4:00 PM"),
    WC("wc8","Ecuador","Curacao","ECU","CUW",0,0,"final","Jun 20 · 8:00 PM"),
    WC("wc9","Japan","Tunisia","JPN","TUN",4,0,"final","Jun 20 · 11:00 PM"),
  ],
  "2026-06-21": [
    WC("wc10","Spain","Saudi Arabia","ESP","KSA",4,0,"final","Jun 21 · 12:00 PM"),
    WC("wc11","Belgium","IR Iran","BEL","IRN",0,0,"scheduled","Jun 21 · 3:00 PM",{home:68,draw:20,away:12}),
    WC("wc12","Uruguay","Cape Verde","URU","CPV",0,0,"scheduled","Jun 21 · 6:00 PM",{home:69,draw:21,away:10}),
    WC("wc13","New Zealand","Egypt","NZL","EGY",0,0,"scheduled","Jun 21 · 9:00 PM",{home:16,draw:23,away:61}),
  ],
  "2026-06-22": [
    WC("wc14","Argentina","Austria","ARG","AUT",0,0,"scheduled","Jun 22 · 1:00 PM",{home:64,draw:22,away:14}),
    WC("wc15","France","Iraq","FRA","IRQ",0,0,"scheduled","Jun 22 · 5:00 PM",{home:91,draw:7,away:2}),
    WC("wc16","Norway","Senegal","NOR","SEN",0,0,"scheduled","Jun 22 · 8:00 PM",{home:42,draw:27,away:31}),
    WC("wc17","Jordan","Algeria","JOR","DZA",0,0,"scheduled","Jun 22 · 11:00 PM",{home:16,draw:23,away:61}),
    WC("wc18","South Korea","Poland","KOR","POL",0,0,"scheduled","Jun 22 · 2:00 PM",{home:38,draw:28,away:34}),
  ],
  "2026-06-23": [
    WC("wc19","Portugal","Uzbekistan","POR","UZB",0,0,"scheduled","Jun 23 · 1:00 PM",{home:81,draw:13,away:6}),
    WC("wc20","England","Ghana","ENG","GHA",0,0,"scheduled","Jun 23 · 4:00 PM",{home:81,draw:13,away:6}),
    WC("wc21","Panama","Croatia","PAN","CRO",0,0,"scheduled","Jun 23 · 7:00 PM",{home:15,draw:23,away:62}),
    WC("wc22","Colombia","Greece","COL","GRE",0,0,"scheduled","Jun 23 · 10:00 PM",{home:52,draw:26,away:22}),
    WC("wc23","Canada","Morocco","CAN","MAR",0,0,"scheduled","Jun 23 · 6:00 PM",{home:28,draw:27,away:45}),
  ],
  "2026-06-24": [
    WC("wc24","Italy","DR Congo","ITA","COD",0,0,"scheduled","Jun 24 · 3:00 PM",{home:74,draw:16,away:10}),
    WC("wc25","Spain","New Zealand","ESP","NZL",0,0,"scheduled","Jun 24 · 6:00 PM",{home:92,draw:6,away:2}),
    WC("wc26","Japan","Belgium","JPN","BEL",0,0,"scheduled","Jun 24 · 9:00 PM",{home:34,draw:26,away:40}),
    WC("wc27","Australia","Morocco","AUS","MAR",0,0,"scheduled","Jun 24 · 12:00 PM",{home:32,draw:28,away:40}),
  ],
  "2026-08-21": [
    { id:"e1", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Arsenal FC", away:"Coventry City", homeAbbr:"ARS", awayAbbr:"COV", score:{home:0,away:0}, status:"scheduled", kick:"Aug 21 · 3:00 PM", prob:{home:83,draw:12,away:5} },
  ],
  "2026-08-22": [
    { id:"e2", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Hull City", away:"Manchester United", homeAbbr:"HUL", awayAbbr:"MUN", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 7:30 AM", prob:{home:14,draw:20,away:66} },
    { id:"e3", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Everton FC", away:"Crystal Palace", homeAbbr:"EVE", awayAbbr:"CRY", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 10:00 AM", prob:{home:46,draw:27,away:27} },
    { id:"e4", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Ipswich Town", away:"Sunderland", homeAbbr:"IPS", awayAbbr:"SUN", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 10:00 AM", prob:{home:35,draw:28,away:37} },
    { id:"e5", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Nottingham Forest", away:"Leeds United", homeAbbr:"NFO", awayAbbr:"LEE", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 10:00 AM", prob:{home:43,draw:27,away:30} },
    { id:"e6", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Brentford", away:"Tottenham Hotspur", homeAbbr:"BRE", awayAbbr:"TOT", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 12:30 PM", prob:{home:37,draw:26,away:37} },
    { id:"e7", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Brighton", away:"Aston Villa", homeAbbr:"BHA", awayAbbr:"AVL", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 3:00 PM", prob:{home:42,draw:26,away:32} },
    { id:"s1", league:"serie_a", leagueName:"Serie A", leagueColor:"#024494", leagueAbbr:"SA", home:"Inter Milano", away:"AC Monza", homeAbbr:"INT", awayAbbr:"MON", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 9:00 AM", prob:{home:81,draw:13,away:6} },
    { id:"s2", league:"serie_a", leagueName:"Serie A", leagueColor:"#024494", leagueAbbr:"SA", home:"AS Roma", away:"Fiorentina", homeAbbr:"ROM", awayAbbr:"FIO", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 9:00 AM", prob:{home:52,draw:26,away:22} },
    { id:"s3", league:"serie_a", leagueName:"Serie A", leagueColor:"#024494", leagueAbbr:"SA", home:"Frosinone", away:"Juventus", homeAbbr:"FRO", awayAbbr:"JUV", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 9:00 AM", prob:{home:14,draw:20,away:66} },
    { id:"s4", league:"serie_a", leagueName:"Serie A", leagueColor:"#024494", leagueAbbr:"SA", home:"Torino FC", away:"AC Milan", homeAbbr:"TOR", awayAbbr:"ACM", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 9:00 AM", prob:{home:21,draw:25,away:54} },
    { id:"s5", league:"serie_a", leagueName:"Serie A", leagueColor:"#024494", leagueAbbr:"SA", home:"Atalanta BC", away:"Sassuolo", homeAbbr:"ATA", awayAbbr:"SAS", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 9:00 AM", prob:{home:62,draw:22,away:16} },
    { id:"f1", league:"ligue_1", leagueName:"Ligue 1", leagueColor:"#091c3e", leagueAbbr:"L1", home:"PSG", away:"Stade Rennais", homeAbbr:"PSG", awayAbbr:"REN", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 3:00 PM", prob:{home:78,draw:14,away:8} },
    { id:"f2", league:"ligue_1", leagueName:"Ligue 1", leagueColor:"#091c3e", leagueAbbr:"L1", home:"Marseille", away:"Strasbourg", homeAbbr:"OM", awayAbbr:"RCS", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 3:00 PM", prob:{home:52,draw:26,away:22} },
    { id:"f3", league:"ligue_1", leagueName:"Ligue 1", leagueColor:"#091c3e", leagueAbbr:"L1", home:"Monaco", away:"Le Havre", homeAbbr:"MON", awayAbbr:"HAC", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 3:00 PM", prob:{home:62,draw:22,away:16} },
    { id:"b1", league:"bundesliga", leagueName:"Bundesliga", leagueColor:"#d20515", leagueAbbr:"BL", home:"Bayern Munich", away:"Borussia Dortmund", homeAbbr:"BAY", awayAbbr:"BVB", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 12:30 PM", prob:{home:54,draw:24,away:22} },
    { id:"b2", league:"bundesliga", leagueName:"Bundesliga", leagueColor:"#d20515", leagueAbbr:"BL", home:"Bayer Leverkusen", away:"RB Leipzig", homeAbbr:"B04", awayAbbr:"RBL", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 12:30 PM", prob:{home:46,draw:26,away:28} },
    { id:"l1", league:"la_liga", leagueName:"La Liga", leagueColor:"#ee8707", leagueAbbr:"LL", home:"Real Madrid", away:"Athletic Bilbao", homeAbbr:"RMA", awayAbbr:"ATH", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 3:00 PM", prob:{home:64,draw:22,away:14} },
    { id:"l2", league:"la_liga", leagueName:"La Liga", leagueColor:"#ee8707", leagueAbbr:"LL", home:"FC Barcelona", away:"Atletico Madrid", homeAbbr:"BAR", awayAbbr:"ATM", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 5:00 PM", prob:{home:52,draw:24,away:24} },
    { id:"m1", league:"mls", leagueName:"MLS", leagueColor:"#012b6b", leagueAbbr:"MLS", home:"Inter Miami CF", away:"Philadelphia Union", homeAbbr:"MIA", awayAbbr:"PHI", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 7:30 PM", prob:{home:52,draw:24,away:24} },
    { id:"m2", league:"mls", leagueName:"MLS", leagueColor:"#012b6b", leagueAbbr:"MLS", home:"LA Galaxy", away:"LAFC", homeAbbr:"LAG", awayAbbr:"LAFC", score:{home:0,away:0}, status:"scheduled", kick:"Aug 22 · 10:30 PM", prob:{home:40,draw:28,away:32} },
  ],
  "2026-08-23": [
    { id:"e8", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Manchester City", away:"Bournemouth", homeAbbr:"MCI", awayAbbr:"BOU", score:{home:0,away:0}, status:"scheduled", kick:"Aug 23 · 9:00 AM", prob:{home:66,draw:18,away:16} },
    { id:"e9", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Newcastle United", away:"Liverpool FC", homeAbbr:"NEW", awayAbbr:"LIV", score:{home:0,away:0}, status:"scheduled", kick:"Aug 23 · 11:30 AM", prob:{home:33,draw:24,away:43} },
    { id:"e10", league:"epl", leagueName:"Premier League", leagueColor:"#3d185b", leagueAbbr:"PL", home:"Fulham FC", away:"Chelsea FC", homeAbbr:"FUL", awayAbbr:"CHE", score:{home:0,away:0}, status:"scheduled", kick:"Aug 23 · 3:00 PM", prob:{home:30,draw:26,away:44} },
    { id:"ucl1", league:"ucl", leagueName:"Champions League", leagueColor:"#072854", leagueAbbr:"UCL", home:"Real Madrid", away:"Manchester City", homeAbbr:"RMA", awayAbbr:"MCI", score:{home:0,away:0}, status:"scheduled", kick:"Aug 23 · 8:00 PM", prob:{home:46,draw:26,away:28} },
    { id:"ucl2", league:"ucl", leagueName:"Champions League", leagueColor:"#072854", leagueAbbr:"UCL", home:"FC Barcelona", away:"Bayern Munich", homeAbbr:"BAR", awayAbbr:"BAY", score:{home:0,away:0}, status:"scheduled", kick:"Aug 23 · 8:00 PM", prob:{home:46,draw:26,away:28} },
  ],
};

export const NEWS: NewsItem[] = [
  { id:"n1", cat:"transfers", source:"Fabrizio Romano", confirmed:true, headline:"Liverpool hijack Newcastle deal — Victor Muñoz signs. Here We Go!", snippet:"Liverpool have agreed a €40m deal with Osasuna, activating Muñoz's release clause. He flies to Merseyside for his medical tomorrow. Newcastle had been in advanced negotiations for weeks.", time:"2h ago", tag:"done" },
  { id:"n2", cat:"transfers", source:"Fabrizio Romano", confirmed:false, headline:"Tottenham making £80m push for Sandro Tonali as Newcastle's stance remains firm", snippet:"Spurs have opened formal talks but Newcastle value the Italian at £100m+. The deal is complicated by both clubs' Champions League ambitions heading into the summer window.", time:"4h ago", tag:"rumor" },
  { id:"n3", cat:"wc", source:"ESPN", confirmed:false, headline:"Spain demolish Saudi Arabia 4–0 — Yamal and Nico Williams dazzle in World Cup opener", snippet:"Lamine Yamal was unplayable from the first whistle in Vancouver. Two assists, a goal, and a performance that reminded the world why he's considered the best player on the planet at 18.", time:"1h ago" },
  { id:"n4", cat:"transfers", source:"Fabrizio Romano", confirmed:false, headline:"Arsenal confident on €85m striker signing as Real Madrid exit the race completely", snippet:"Arsenal have been given a clear run at the France international. Real Madrid have stepped away after refusing to meet the asking price. Gunners expect to conclude talks by end of week.", time:"5h ago", tag:"rumor" },
  { id:"n5", cat:"wc", source:"BBC Sport", confirmed:false, headline:"Japan stun Tunisia 4–0 — Ueda hat-trick fires Asia's flag-bearers to top of Group F", snippet:"Japan were clinical in Dallas. Ueda's hat-trick plus a Doan thunderbolt put Japan in pole position ahead of their Group F decider against France next week.", time:"3h ago" },
  { id:"n6", cat:"transfers", source:"Nicolo Schira", confirmed:false, headline:"Manchester United identify Como midfielder as priority midfield target this summer", snippet:"Ten Hag's successor is pushing hard for the 23-year-old who starred in Serie A. Chelsea have also made contact, but United believe they are ahead in negotiations.", time:"6h ago", tag:"rumor" },
  { id:"n7", cat:"epl", source:"The Athletic", confirmed:false, headline:"Aston Villa make opening move for Ajax winger Ayyoub Bouaddi — €38m bid submitted", snippet:"Villa have formally submitted a bid for the Moroccan wide man, 20, who starred in the Eredivisie last season. Ajax want closer to €50m but talks are progressing.", time:"8h ago" },
  { id:"n8", cat:"transfers", source:"Fabrizio Romano", confirmed:true, headline:"Virgil van Dijk signs new 2-year Liverpool contract — officially confirmed", snippet:"VVD commits to Liverpool until 2028. The announcement came alongside Alisson Becker's extension. Both are central to the new project under Arne Slot.", time:"12h ago", tag:"done" },
  { id:"n9", cat:"wc", source:"Goal", confirmed:false, headline:"Netherlands thrash Sweden 5–1 — van Persie Jr. scores twice on World Cup debut", snippet:"The Dutch were electric at AT&T Stadium. Gakpo orchestrated everything as the Netherlands put up a statement result on Day 2 of the tournament.", time:"5h ago" },
  { id:"n10", cat:"transfers", source:"Sky Sports", confirmed:false, headline:"Chelsea close in on La Liga centre-back as Potter pushes for defensive reinforcement", snippet:"Chelsea are in advanced discussions with the player's camp. The 25-year-old Spanish international is keen on the Premier League move and has told his club he wants to leave this summer.", time:"10h ago", tag:"rumor" },
  { id:"n11", cat:"transfers", source:"Fabrizio Romano", confirmed:true, headline:"DONE DEAL: Kylian Mbappé contract extension at Real Madrid confirmed until 2029", snippet:"Mbappé signs a 3-year extension at the Bernabéu, dismissing all rumours of a departure. The Frenchman says Madrid is home and he wants to break all scoring records there.", time:"1d ago", tag:"done" },
  { id:"n12", cat:"epl", source:"The Guardian", confirmed:false, headline:"Mikel Arteta's Arsenal enter Bundesliga for Premier League-quality striker addition", snippet:"Arsenal have identified two Bundesliga forwards. Their top target has 24 goals in 30 games this season. Arteta wants to ensure depth behind their current first-choice striker heading into next season.", time:"14h ago" },
];

export const SEARCH_DATA: SearchEntity[] = [
  { type:"player", name:"Erling Haaland", sub:"Manchester City · Norway · Centre Forward", detail:{ age:25, club:"Manchester City", pos:"Centre Forward", league:"Premier League", goals:36, assists:8, apps:35, avgRating:8.4, hidden:false, recentGames:[{date:"Jun 17",opp:"vs Chelsea",result:"W 2-0",rating:8.1},{date:"Jun 10",opp:"vs Arsenal",result:"D 1-1",rating:7.4},{date:"Jun 3",opp:"vs Liverpool",result:"L 1-2",rating:6.8}] }},
  { type:"player", name:"Lamine Yamal", sub:"FC Barcelona · Spain · Right Winger", detail:{ age:18, club:"FC Barcelona", pos:"Right Winger", league:"La Liga", goals:19, assists:17, apps:36, avgRating:8.6, hidden:false, recentGames:[{date:"Jun 21",opp:"vs Saudi Arabia",result:"W 4-0",rating:9.2},{date:"Jun 14",opp:"vs Portugal",result:"D 2-2",rating:8.1},{date:"Jun 7",opp:"vs France",result:"W 1-0",rating:8.8}] }},
  { type:"player", name:"Rayan Cherki", sub:"Paris Saint-Germain · France · Attacking Mid", detail:{ age:21, club:"Paris Saint-Germain", pos:"Attacking Midfielder", league:"Ligue 1", goals:14, assists:18, apps:34, avgRating:7.9, hidden:true, recentGames:[{date:"Jun 15",opp:"vs Lyon",result:"W 3-1",rating:8.2},{date:"Jun 8",opp:"vs Monaco",result:"W 2-0",rating:7.8},{date:"Jun 1",opp:"vs Marseille",result:"D 1-1",rating:7.1}] }},
  { type:"player", name:"Sverre Nypan", sub:"Rosenborg BK · Norway · Central Midfielder", detail:{ age:17, club:"Rosenborg BK", pos:"Central Midfielder", league:"Eliteserien", goals:8, assists:11, apps:22, avgRating:7.6, hidden:true, recentGames:[{date:"Jun 18",opp:"vs Brann",result:"W 2-1",rating:8.0},{date:"Jun 11",opp:"vs Vålerenga",result:"D 0-0",rating:7.2},{date:"Jun 4",opp:"vs Molde",result:"W 3-0",rating:7.9}] }},
  { type:"player", name:"Yankuba Minteh", sub:"Brighton & Hove Albion · Gambia · Right Winger", detail:{ age:21, club:"Brighton", pos:"Right Winger", league:"Premier League", goals:11, assists:9, apps:31, avgRating:7.7, hidden:true, recentGames:[{date:"Jun 16",opp:"vs Fulham",result:"W 3-1",rating:8.1},{date:"Jun 9",opp:"vs West Ham",result:"D 1-1",rating:7.5},{date:"Jun 2",opp:"vs Wolves",result:"W 2-0",rating:7.6}] }},
  { type:"player", name:"Pedri", sub:"FC Barcelona · Spain · Central Midfielder", detail:{ age:23, club:"FC Barcelona", pos:"Central Midfielder", league:"La Liga", goals:9, assists:14, apps:33, avgRating:8.1, hidden:false, recentGames:[{date:"Jun 21",opp:"vs Saudi Arabia",result:"W 4-0",rating:8.5},{date:"Jun 14",opp:"vs Portugal",result:"D 2-2",rating:7.9},{date:"Jun 7",opp:"vs France",result:"W 1-0",rating:8.3}] }},
  { type:"club", name:"Arsenal FC", sub:"Premier League · 2nd Place", detail:{ manager:"Mikel Arteta", stadium:"Emirates Stadium, London", founded:1886, position:2, trophies:"FA Cup 2025", squad:["David Raya","Ben White","William Saliba","Gabriel Magalhães","Oleksandr Zinchenko","Thomas Partey","Declan Rice","Martin Ødegaard","Bukayo Saka","Leandro Trossard","Gabriel Martinelli"], recentGames:[{date:"Jun 17",opp:"Man City",result:"D 1-1"},{date:"Jun 10",opp:"Liverpool",result:"W 2-0"},{date:"Jun 3",opp:"Chelsea",result:"W 3-1"}] }},
  { type:"club", name:"Real Madrid", sub:"La Liga · 1st Place", detail:{ manager:"Carlo Ancelotti", stadium:"Estadio Santiago Bernabéu", founded:1902, position:1, trophies:"La Liga 2025-26, UCL 2025", squad:["Thibaut Courtois","Dani Carvajal","Eder Militão","David Alaba","Ferland Mendy","Federico Valverde","Luka Modric","Jude Bellingham","Vinicius Jr","Kylian Mbappé","Rodrygo"], recentGames:[{date:"Jun 16",opp:"Atletico",result:"W 2-1"},{date:"Jun 9",opp:"Barcelona",result:"W 3-2"},{date:"Jun 2",opp:"Sevilla",result:"W 4-0"}] }},
  { type:"country", name:"Brazil", sub:"National Team · World Cup 2026 Group C", detail:{ coach:"Dorival Júnior", ranking:3, group:"Group C", recentForm:["W","W","W","D","W"], squad:["Ederson","Danilo","Marquinhos","Gabriel Magalhães","Guilherme Arana","Casemiro","Lucas Paquetá","Rodrygo","Raphinha","Vinícius Jr","Endrick"], recentGames:[{date:"Jun 19",opp:"Haiti",result:"W 3-0"},{date:"Jun 15",opp:"Argentina",result:"D 1-1"},{date:"Jun 10",opp:"Colombia",result:"W 2-0"}] }},
  { type:"country", name:"Spain", sub:"National Team · World Cup 2026 Group A", detail:{ coach:"Luis de la Fuente", ranking:1, group:"Group A", recentForm:["W","W","W","W","W"], squad:["Unai Simón","Dani Carvajal","Pau Cubarsí","Aymeric Laporte","Alejandro Grimaldo","Rodri","Fabián Ruiz","Pedri","Nico Williams","Álvaro Morata","Lamine Yamal"], recentGames:[{date:"Jun 21",opp:"Saudi Arabia",result:"W 4-0"},{date:"Jun 15",opp:"England",result:"W 2-1"},{date:"Jun 10",opp:"Germany",result:"D 1-1"}] }},
  { type:"country", name:"France", sub:"National Team · World Cup 2026 Group B", detail:{ coach:"Didier Deschamps", ranking:2, group:"Group B", recentForm:["W","W","D","W","W"], squad:["Mike Maignan","Jules Koundé","Dayot Upamecano","William Saliba","Theo Hernandez","Aurélien Tchouaméni","N'Golo Kanté","Antoine Griezmann","Ousmane Dembélé","Kylian Mbappé","Marcus Thuram"], recentGames:[{date:"Jun 22",opp:"Iraq",result:"TBD"},{date:"Jun 15",opp:"Italy",result:"W 2-1"},{date:"Jun 10",opp:"Netherlands",result:"D 1-1"}] }},
];
