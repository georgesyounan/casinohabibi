export const sports = {
  football:   { icon: 'soccer', label: ['Soccer', 'Soccer'] },
  basketball: { icon: 'basketball', label: ['Basketball', 'Basketball'] },
  hockey:     { icon: 'hockey-sticks', label: ['Hockey', 'Hockey'] },
  tennis:     { icon: 'tennis', label: ['Tennis', 'Tennis'] },
  baseball:   { icon: 'baseball', label: ['Baseball', 'Baseball'] }
};

export const leagues = {
  coast: ['Coastal Cup', 'Coupe du littoral'], north: ['Northern League', 'Ligue du Nord'],
  metro: ['Metro League', 'Ligue métropolitaine'], ice: ['Polar Cup', 'Coupe polaire'],
  open: ['Summit Open', 'Omnium du Sommet'], diamond: ['Bay Series', 'Série de la baie']
};

// Each live entry is a short, replayable fictional sequence. Prices are fixed for the whole demo.
export const matches = [
  { id: 'marina', sport: 'football', league: 'coast', teams: ['Marina FC', 'Atlas 04'], marks: ['MF', 'A4'], odds: [2.15, 3.20, 2.70],
    frames: [
      ['62′', 1, 0, 'Marina wins a corner.', 'Marina obtient un corner.'],
      ['64′', 1, 0, 'Atlas clears the cross.', 'Atlas dégage le centre.'],
      ['67′', 1, 1, 'Atlas equalizes with a header.', 'Atlas égalise de la tête.'],
      ['70′', 1, 1, 'Marina hits the crossbar.', 'Marina frappe la barre transversale.']
    ] },
  { id: 'comets', sport: 'basketball', league: 'metro', teams: ['Metro Comets', 'Port Waves'], marks: ['MC', 'PW'], odds: [1.78, 2.05],
    frames: [
      ['Q3 · 04:38', 68, 64, 'Comets take possession.', 'Les Comets récupèrent le ballon.'],
      ['Q3 · 04:19', 70, 64, 'Comets score on the break.', 'Les Comets marquent en contre-attaque.'],
      ['Q3 · 04:02', 70, 67, 'Waves hit a three.', 'Les Waves réussissent un tir de trois points.'],
      ['Q3 · 03:51', 70, 67, 'Timeout for the Comets.', 'Temps d’arrêt des Comets.']
    ] },
  { id: 'frost', sport: 'hockey', league: 'ice', teams: ['Québec Frost', 'Harbour Lynx'], marks: ['QF', 'HL'], odds: [1.87, 1.96],
    frames: [
      ['P2 · 09:42', 2, 1, 'Frost win the faceoff.', 'Le Frost remporte la mise au jeu.'],
      ['P2 · 09:21', 2, 1, 'The Lynx goalie stops a wrist shot.', 'Le gardien des Lynx bloque un tir du poignet.'],
      ['P2 · 08:57', 2, 2, 'Lynx score on a rebound.', 'Les Lynx marquent sur un retour.'],
      ['P2 · 08:36', 2, 2, 'Icing against the Frost.', 'Dégagement refusé du Frost.']
    ] },
  { id: 'vega', sport: 'tennis', league: 'open', teams: ['S. Vega', 'M. Rami'], marks: ['SV', 'MR'], odds: [1.72, 2.18],
    frames: [
      ['15–15', 3, 2, 'Vega serves in the first set.', 'Vega est au service dans la première manche.'],
      ['30–15', 3, 2, 'Vega wins the rally.', 'Vega remporte l’échange.'],
      ['40–15', 3, 2, 'Vega serves an ace.', 'Vega réussit un as.'],
      ['0–0', 4, 2, 'Vega holds serve.', 'Vega remporte son jeu de service.']
    ] },
  { id: 'pilots', sport: 'baseball', league: 'diamond', teams: ['Bay Pilots', 'Canyon Foxes'], marks: ['BP', 'CF'], odds: [1.80, 2.02],
    frames: [
      ['6 ↑', 3, 2, 'Foxes put a runner on first.', 'Un joueur des Foxes atteint le premier but.'],
      ['6 ↑', 3, 3, 'A double ties the game.', 'Un double crée l’égalité.'],
      ['6 ↓', 3, 3, 'Pilots come up to bat.', 'Les Pilots s’amènent au bâton.'],
      ['6 ↓', 4, 3, 'A single brings the runner home.', 'Un simple fait rentrer le coureur.']
    ] },
  { id: 'union', sport: 'football', league: 'north', teams: ['Union Nord', 'Rivage SC'], marks: ['UN', 'RS'], odds: [2.45, 3.10, 2.30], time: '18:30' },
  { id: 'bears', sport: 'basketball', league: 'metro', teams: ['North Bears', 'City Sparks'], marks: ['NB', 'CS'], odds: [1.92, 1.86], time: '19:00' },
  { id: 'drift', sport: 'hockey', league: 'ice', teams: ['Nordik HC', 'Summit Ice'], marks: ['NH', 'SI'], odds: [2.04, 1.79], time: '19:15' },
  { id: 'azur', sport: 'football', league: 'coast', teams: ['Azur AC', 'Cedar Athletic'], marks: ['AZ', 'CA'], odds: [2.36, 3.25, 2.42], time: '19:30' },
  { id: 'kato', sport: 'tennis', league: 'open', teams: ['A. Kato', 'L. Marin'], marks: ['AK', 'LM'], odds: [1.91, 1.88], time: '20:00' },
  { id: 'caps', sport: 'baseball', league: 'diamond', teams: ['Harbour Caps', 'Delta Reds'], marks: ['HC', 'DR'], odds: [2.10, 1.75], time: '20:30' }
];

export const byId = new Map(matches.map(match => [match.id, match]));
export const prices = ['en-CA', 'fr-CA'].map(locale => new Intl.NumberFormat(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
export const programTime = (match, fr) => fr ? match.time.replace(':', ' h ') : match.time;
export const outcome = (match, index, fr) => match.odds.length === 3 && index === 1 ? (fr ? 'Nul' : 'Draw') : match.teams[index === 0 ? 0 : 1];
export const marketName = (match, fr) => match.sport === 'football'
  ? (fr ? 'Résultat à 90 min' : '90-minute result') : (fr ? 'Vainqueur du match' : 'Match winner');
export const frameOf = (match, step) => match.frames[step % match.frames.length];

export function clockLabel(match, frame, fr) {
  if (match.sport === 'tennis') return (fr ? '1ʳᵉ manche' : 'Set 1') + ' · ' + frame[0];
  if (match.sport === 'baseball') return (fr ? 'Manche ' : 'Inning ') + frame[0];
  return fr ? frame[0].replace('Q3', '3ᵉ quart') : frame[0];
}
