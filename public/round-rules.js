export const proofText=(client,game,wager,choice)=>['habibi-v1',client,game,wager,choice||'', ''].join('|');
export function unbiased(word,limit){const maximum=0x100000000-(0x100000000%limit);let n;do{n=word();}while(n>=maximum);return n%limit;}
export function slotRoll(randomInt) {
  const symbols = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎'];
  const reels = Array.from({ length: 3 }, () => symbols[randomInt(symbols.length)]);
  const distinct = new Set(reels).size;
  return { reels, multiplier: distinct === 1 ? 5 : distinct === 2 ? 2 : 0 };
}
export function drawRound(game,wager,choice,randomInt){
  let amount;
  let outcome;
  if (game === 'roulette') {
    const number = randomInt(37);
    const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    const color = number === 0 ? 'green' : redNumbers.has(number) ? 'red' : 'black';
    amount = color === choice ? wager : -wager;
    outcome = { number, color, choice };
  } else if (game === 'gold' || game === 'aurora') {
    outcome = slotRoll(randomInt);
    amount = wager * (outcome.multiplier - 1);
  } else if (game === 'blackjack') {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = Array.from({ length: 13 }, (_, index) => index + 2);
    const deck = suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    const draw = () => deck.pop();
    const score = (hand) => {
      let total = hand.reduce((sum, card) => sum + (card.rank === 14 ? 11 : Math.min(card.rank, 10)), 0);
      let aces = hand.filter((card) => card.rank === 14).length;
      while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
      return total;
    };
    const label = ({ rank, suit }) => `${rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : rank}${suit}`;
    const playerHand = [draw(), draw()];
    const dealerHand = [draw(), draw()];
    while (score(dealerHand) < 17) dealerHand.push(draw());
    const playerScore = score(playerHand);
    const dealerScore = score(dealerHand);
    const verdict = playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore) ? 'loss'
      : playerScore === dealerScore ? 'push' : 'win';
    amount = verdict === 'win' ? wager : verdict === 'loss' ? -wager : 0;
    outcome = { playerCards: playerHand.map(label), dealerCards: dealerHand.map(label), playerScore, dealerScore, verdict };
  } else {
    amount = randomInt(2) === 1 ? wager : -wager;
  }
  return {amount,outcome:outcome||null};
}
