const promotions = [
  {"id": 21, "title": ["Welcome match", "Bonus de bienvenue"], "detail": ["100% first-deposit match up to CA$500", "100 % sur le premier dépôt, jusqu’à 500 $ CA"], "code": "HABIBILIVE"},
  {"id": 22, "title": ["Monday credit", "Crédit du lundi"], "detail": ["10% play credit on eligible Monday deposits", "10 % en crédit de jeu sur les dépôts admissibles du lundi"], "code": "HABIBI10"},
  {"id": 23, "title": ["Hockey Lunchbox Challenge", "Défi hockey du midi"], "detail": ["Up to CA$200 in bonus bets", "Jusqu’à 200 $ CA en paris bonus"], "code": "HABIBIPUCK"},
  {"id": 24, "title": ["Western free spins", "Tours gratuits western"], "detail": ["Up to CA$200 in free spins", "Jusqu’à 200 $ CA en tours gratuits"], "code": "HABIBIWEST"},
  {"id": 25, "title": ["Streamer bonus", "Bonus streamer"], "detail": ["Up to CA$1,000 for creators", "Jusqu’à 1 000 $ CA pour les créateurs"], "code": "HABIBISTREAM"},
  {"id": 26, "title": ["Refer a friend", "Invite un ami"], "detail": ["Up to CA$65 per eligible friend", "Jusqu’à 65 $ CA par ami admissible"]},
  {"id": 27, "title": ["Custom chat bonus", "Bonus sur mesure"], "detail": ["Ask Tempo’s team for a tailored offer in live chat.", "Discute avec l’équipe de Tempo pour obtenir une offre personnalisée."]},
  {"id": 28, "title": ["Seven VIP levels", "Sept paliers VIP"], "detail": ["Discover the perks of Jeton’s seven club levels.", "Découvre les avantages des sept paliers du club de Jeton."]},
  {"id": 29, "title": ["VIP status match", "Équivalence de statut VIP"], "detail": ["Ask the team to review your existing VIP status.", "Demande à l’équipe d’évaluer ton statut VIP actuel."]},
  {"id": 30, "title": ["Priority withdrawals", "Retraits prioritaires"], "detail": ["Proposed VIP cashier service. Timing to be confirmed.", "Service de caisse VIP proposé. Délais à confirmer."]},
  {"id": 31, "title": ["Halftime trivia", "Quiz de la mi-temps"], "detail": ["Answer Sprint’s halftime question to enter the draw.", "Réponds à la question de Sprint à la mi-temps pour participer au tirage."]},
  {"id": 32, "title": ["Live code giveaway", "Code du direct"], "detail": ["Enter the code Pixel reveals on stream to join the draw.", "Entre le code dévoilé par Pixel en direct pour participer au tirage."]},
];

const studio = [
  {id: 1, title: ["Meet the crew", "Prends place, Habibi"]},
  {id: 2, title: ["Monthly Telegram bonus", "Bonus mensuel sur Telegram"]},
  {id: 3, title: ["VIP lounge", "Salon VIP"]},
  {id: 4, title: ["New in the lobby", "Du neuf au lobby"]},
  {id: 5, title: ["Bring a friend", "Tu viens avec qui?"]},
  {id: 6, title: ["Hockey night", "Soir de hockey"]},
  {id: 7, title: ["Kickoff", "Coup d’envoi"]},
  {id: 8, title: ["Nothing but net", "Rien que le filet"]},
  {id: 9, title: ["Match point", "Balle de match"]},
  {id: 10, title: ["Pregame", "L’avant-match"]},
  {id: 11, title: ["Roulette", "À la roulette"]},
  {id: 12, title: ["Blackjack", "Au blackjack"]},
  {id: 13, title: ["Slot machines", "Machines à sous"]},
  {id: 14, title: ["Tournament", "Place au tournoi"]},
  {id: 15, title: ["Around the tables", "Autour des tables"]},
  {id: 16, title: ["Live with Pixel", "En direct avec Pixel"]},
  {id: 17, title: ["The mic is yours", "Le micro est à toi"]},
  {id: 18, title: ["Behind the scenes", "Dans les coulisses"]},
  {id: 19, title: ["Community chat", "Place au chat"]},
  {id: 20, title: ["Replay", "On rembobine"]},
];

export const habibiCampaigns = [...studio, ...promotions];

export function artPath(base, id, french) {
  return base + '/habibi-art/' + String(id).padStart(2, '0') + (french ? '-fr.webp' : '-en.webp');
}

// The artwork and captions are editorial previews. Offer activation lives in the club.
export function campaignGallery(french, base) {
  const locale = Number(french);
  function card(campaign) {
    const title = campaign.title[locale];
    const source = artPath(base, campaign.id, french);
    const open = french ? 'Agrandir la bannière' : 'View full-size banner';
    const detail = campaign.detail ? '<p>' + campaign.detail[locale] + '</p>' : '';
    const code = campaign.code ? '<small>' + (french ? 'Code proposé' : 'Proposed code') + ' · ' + campaign.code + '</small>' : '';
    return '<article class="habibi-campaign-card"><a href="' + source + '" target="_blank" rel="noopener" aria-label="' + open + ' · ' + title + '">' +
      '<img src="' + source + '" width="1440" height="480" loading="lazy" decoding="async" alt=""></a>' +
      '<div><h3>' + title + '</h3>' + detail + code + '</div></article>';
  }
  const groups = ['Tempo','Sprint','Jeton','Pixel'].map((name, i) =>
    '<details class="habibi-studio-group"><summary>' + name + '</summary><div class="habibi-offer-grid">' +
      studio.slice(i * 5, i * 5 + 5).map(card).join('') + '</div></details>').join('');
  return '<section id="habibi-campaigns" aria-labelledby="habibi-campaign-title"><h2 id="habibi-campaign-title">' +
    (french ? 'Promos en aperçu' : 'Promotion previews') + '</h2><p class="habibi-proposal-note">' +
    (french ? 'Montants en dollars canadiens. Ces offres et leurs codes sont proposés pour le lancement. Les modalités restent à confirmer.' :
      'Amounts are in Canadian dollars. These offers and codes are proposed for launch. Terms are still to be confirmed.') +
    '</p><div class="habibi-offer-grid">' + promotions.map(card).join('') + '</div><h2 class="habibi-studio-title">' +
    (french ? 'Avec l’équipe Habibi' : 'Meet the Habibi crew') + '</h2>' + groups + '</section>';
}
