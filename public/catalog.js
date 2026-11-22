export const games = [
  { id: 'gold', name: ['Gold Rush', 'Ruée vers l’or'], type: 'slots', icon: '✦' },
  { id: 'blackjack', name: ['Midnight Blackjack', 'Blackjack de minuit'], type: 'table', icon: '♠' },
  { id: 'roulette', name: ['Roulette Royale', 'Roulette royale'], type: 'table', icon: '◉' },
  { id: 'aurora', name: ['Aurora Spins', 'Tours boréaux'], type: 'slots', icon: '❈' }
];

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
