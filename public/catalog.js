export const games = [
  { id: 'gold', name: ['Gold Rush', 'Ruée vers l’or'], type: 'slots', icon: '✦' },
  { id: 'blackjack', name: ['Midnight Blackjack', 'Blackjack de minuit'], type: 'table', icon: '♠' },
  { id: 'roulette', name: ['Roulette Royale', 'Roulette royale'], type: 'table', icon: '◉' },
  { id: 'aurora', name: ['Aurora Spins', 'Tours boréaux'], type: 'slots', icon: '❈' }
];

export function roundPreview(outcome) {
  if (!outcome) return null;
  try {
    const preview = JSON.parse(outcome).preview;
    return preview && typeof preview.slug === 'string' && typeof preview.titleEn === 'string' && typeof preview.titleFr === 'string' ? preview : null;
  } catch {
    return null;
  }
}

export function demoTitle(gameId, preview, locale) {
  const french = locale === 'fr-CA';
  return preview ? (french ? preview.titleFr : preview.titleEn) :
    (games.find(game => game.id === gameId)?.name[Number(french)] ?? gameId);
}

export const catalogueCategories = {
  slots: ['Slots', 'Machines à sous'],
  table: ['Table games', 'Jeux de table'],
  live: ['Live games', 'Jeux avec croupier en direct']
};

export function normalizeCatalogueText(value) {
  return value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function matchesCatalogue(query, values, category) {
  if (!query.trim()) return true;
  const words = normalizeCatalogueText(query);
  if (!words) return false;
  const text = normalizeCatalogueText([...values, ...(catalogueCategories[category] || [])].filter(Boolean).join(' '));
  return words.split(' ').every((word) => text.includes(word));
}

export function collectionKey(title) {
  return normalizeCatalogueText(title.collectionEn || title.collectionFr || '');
}

export function providerCatalogIssue(games) {
  if (!Array.isArray(games) || !games.length || games.length>500) return {key:'catalogFileCount'};
  const ids=new Set();
  for (const [index,game] of games.entries()) {
    const row=index+1;
    if (!game || typeof game.externalId!=='string' || !/^[\w.-]{1,128}$/.test(game.externalId)) return {key:'catalogGameId',row};
    if (ids.has(game.externalId)) return {key:'catalogGameDuplicate',row};
    if (![game.titleEn,game.titleFr].every(text=>typeof text==='string' && text.trim() && text.length<=120)) return {key:'catalogGameTitles',row};
    if (typeof game.category!=='string'||!Object.hasOwn(catalogueCategories,game.category)) return {key:'catalogGameCategory',row};
    ids.add(game.externalId);
  }
  return null;
}
