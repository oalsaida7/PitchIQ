export interface Match {
  id: string;
  home: string;
  away: string;
  homeAbbr: string;
  awayAbbr: string;
  score: { home: number; away: number };
  status: "scheduled" | "live" | "final";
  time: string;
  prob?: { home: number; draw: number; away: number };
}

export interface PlayerReport {
  name: string;
  position: string;
  club: string;
  nationality: string;
  age: number;
  overall: number;
  ratings: {
    pace: number;
    technical: number;
    physical: number;
    mental: number;
    defending: number;
    shooting: number;
  };
  strengths: string[];
  weaknesses: string[];
  style: string;
  verdict: string;
}

export const EPL: Match[] = [
  { id: "e1", home: "Arsenal FC", away: "Coventry City", homeAbbr: "ARS", awayAbbr: "COV", score: { home: 0, away: 0 }, status: "scheduled", time: "Fri Aug 21 · 3:00 PM", prob: { home: 82.6, draw: 11.9, away: 5.5 } },
  { id: "e2", home: "Hull City", away: "Manchester United", homeAbbr: "HUL", awayAbbr: "MUN", score: { home: 0, away: 0 }, status: "scheduled", time: "Sat Aug 22 · 7:30 AM", prob: { home: 13.8, draw: 19.8, away: 66.4 } },
  { id: "e3", home: "Everton FC", away: "Crystal Palace", homeAbbr: "EVE", awayAbbr: "CRY", score: { home: 0, away: 0 }, status: "scheduled", time: "Sat Aug 22 · 10:00 AM", prob: { home: 46.4, draw: 26.7, away: 26.9 } },
  { id: "e4", home: "Nottingham Forest", away: "Leeds United", homeAbbr: "NFO", awayAbbr: "LEE", score: { home: 0, away: 0 }, status: "scheduled", time: "Sat Aug 22 · 10:00 AM", prob: { home: 42.8, draw: 27, away: 30.2 } },
  { id: "e5", home: "Brentford FC", away: "Tottenham Hotspur", homeAbbr: "BRE", awayAbbr: "TOT", score: { home: 0, away: 0 }, status: "scheduled", time: "Sat Aug 22 · 12:30 PM", prob: { home: 37.3, draw: 26.3, away: 36.4 } },
  { id: "e6", home: "Brighton & Hove Albion", away: "Aston Villa", homeAbbr: "BHA", awayAbbr: "AVL", score: { home: 0, away: 0 }, status: "scheduled", time: "Sun Aug 23 · 9:00 AM", prob: { home: 41.7, draw: 25.7, away: 32.6 } },
  { id: "e7", home: "Manchester City", away: "AFC Bournemouth", homeAbbr: "MCI", awayAbbr: "BOU", score: { home: 0, away: 0 }, status: "scheduled", time: "Sun Aug 23 · 9:00 AM", prob: { home: 65.7, draw: 18.2, away: 16.1 } },
  { id: "e8", home: "Newcastle United", away: "Liverpool FC", homeAbbr: "NEW", awayAbbr: "LFC", score: { home: 0, away: 0 }, status: "scheduled", time: "Sun Aug 23 · 11:30 AM", prob: { home: 32.9, draw: 24.3, away: 42.8 } },
  { id: "e9", home: "Fulham FC", away: "Chelsea FC", homeAbbr: "FUL", awayAbbr: "CFC", score: { home: 0, away: 0 }, status: "scheduled", time: "Mon Aug 24 · 3:00 PM", prob: { home: 30.2, draw: 25.9, away: 43.9 } },
];

export const LA_LIGA: Match[] = [
  { id: "l1", home: "Real Madrid", away: "Athletic Bilbao", homeAbbr: "RMA", awayAbbr: "ATH", score: { home: 4, away: 2 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l2", home: "Valencia CF", away: "FC Barcelona", homeAbbr: "VCF", awayAbbr: "BAR", score: { home: 3, away: 1 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l3", home: "Villarreal CF", away: "Atletico Madrid", homeAbbr: "VIL", awayAbbr: "ATM", score: { home: 5, away: 1 }, status: "final", time: "Sun May 24 · 3:00 PM" },
  { id: "l4", home: "RC Celta de Vigo", away: "Sevilla FC", homeAbbr: "RCC", awayAbbr: "SEV", score: { home: 1, away: 0 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l5", home: "RCD Mallorca", away: "Real Oviedo", homeAbbr: "MAL", awayAbbr: "OVI", score: { home: 3, away: 0 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l6", home: "Deportivo Alaves", away: "Rayo Vallecano", homeAbbr: "ALA", awayAbbr: "RVC", score: { home: 1, away: 2 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l7", home: "Real Betis Seville", away: "Levante UD", homeAbbr: "RBB", awayAbbr: "LEV", score: { home: 2, away: 1 }, status: "final", time: "Sat May 23 · 3:00 PM" },
  { id: "l8", home: "Girona FC", away: "Elche CF", homeAbbr: "GIR", awayAbbr: "ELC", score: { home: 1, away: 1 }, status: "final", time: "Sat May 23 · 3:00 PM" },
];

export const UCL: Match[] = [
  { id: "u1", home: "Floriana FC", away: "Shamrock Rovers", homeAbbr: "FLO", awayAbbr: "SHA", score: { home: 0, away: 0 }, status: "scheduled", time: "Tue Jul 7 · 9:00 AM", prob: { home: 55, draw: 25, away: 20 } },
  { id: "u2", home: "KI Klaksvik", away: "Atert Bissen", homeAbbr: "KI", awayAbbr: "BIS", score: { home: 0, away: 0 }, status: "scheduled", time: "Tue Jul 7 · 9:00 AM", prob: { home: 62, draw: 22, away: 16 } },
  { id: "u3", home: "Vikingur Reykjavik", away: "ETO FC Gyor", homeAbbr: "VIK", awayAbbr: "GYO", score: { home: 0, away: 0 }, status: "scheduled", time: "Tue Jul 7 · 9:00 AM", prob: { home: 48, draw: 28, away: 24 } },
  { id: "u4", home: "FK Borac Banja Luka", away: "PFC Levski Sofia", homeAbbr: "BBL", awayAbbr: "LEV", score: { home: 0, away: 0 }, status: "scheduled", time: "Tue Jul 7 · 9:00 AM", prob: { home: 45, draw: 30, away: 25 } },
  { id: "u5", home: "FK Vardar Skopje", away: "Kuopion Palloseura", homeAbbr: "VAR", awayAbbr: "KUP", score: { home: 0, away: 0 }, status: "scheduled", time: "Tue Jul 7 · 9:00 AM", prob: { home: 50, draw: 27, away: 23 } },
];

export const MLS: Match[] = [
  { id: "m1", home: "Inter Miami CF", away: "Philadelphia Union", homeAbbr: "MIA", awayAbbr: "PHI", score: { home: 6, away: 4 }, status: "final", time: "Sun May 24 · 7:00 PM" },
  { id: "m2", home: "Los Angeles FC", away: "Seattle Sounders", homeAbbr: "LAFC", awayAbbr: "SEA", score: { home: 1, away: 0 }, status: "final", time: "Sun May 24 · 9:15 PM" },
  { id: "m3", home: "Columbus Crew", away: "Atlanta United FC", homeAbbr: "CLB", awayAbbr: "ATL", score: { home: 2, away: 0 }, status: "final", time: "Sun May 24 · 5:00 PM" },
  { id: "m4", home: "Vancouver Whitecaps", away: "San Diego FC", homeAbbr: "VAN", awayAbbr: "SD", score: { home: 4, away: 2 }, status: "final", time: "Sat May 23 · 9:30 PM" },
  { id: "m5", home: "Nashville SC", away: "Atlanta United FC", homeAbbr: "NSH", awayAbbr: "ATL", score: { home: 0, away: 0 }, status: "scheduled", time: "Fri Jul 17 · 8:00 PM", prob: { home: 48, draw: 26, away: 26 } },
  { id: "m6", home: "Los Angeles Galaxy", away: "Los Angeles FC", homeAbbr: "LA", awayAbbr: "LAFC", score: { home: 0, away: 0 }, status: "scheduled", time: "Fri Jul 17 · 10:45 PM", prob: { home: 40, draw: 28, away: 32 } },
  { id: "m7", home: "Inter Miami CF", away: "Chicago Fire", homeAbbr: "MIA", awayAbbr: "CHI", score: { home: 0, away: 0 }, status: "scheduled", time: "Wed Jul 22 · 7:30 PM", prob: { home: 55, draw: 22, away: 23 } },
  { id: "m8", home: "CF Montreal", away: "Toronto FC", homeAbbr: "MTL", awayAbbr: "TOR", score: { home: 0, away: 0 }, status: "scheduled", time: "Thu Jul 16 · 7:30 PM", prob: { home: 42, draw: 28, away: 30 } },
];

export const LEAGUES: Record<string, Match[]> = {
  epl: EPL,
  la_liga: LA_LIGA,
  ucl: UCL,
  mls: MLS,
};

export const LEAGUE_LABELS: Record<string, string> = {
  epl: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League",
  la_liga: "🇪🇸 La Liga",
  ucl: "⭐ UCL",
  mls: "🇺🇸 MLS",
};
