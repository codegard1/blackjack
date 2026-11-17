// Works out basic strategy for this table by expected value, drawing from the cards actually
// left in the shoe. It prints one chart; the eight it gives (1, 2, 6 and 8 decks, S17 and H17)
// are the test data in src/functions/strategyHint.charts.ts, which recommendMove is checked against.
//
// Rules: the dealer looks for a natural before anyone plays, double down on any two cards, none
// after a split, one split, split aces get one card each, no surrender. A hand's play is chosen
// for its total: the two-card hands that make a total are weighted by how often they come up.
// The two hands of a split are valued alike, each as if the other were not drawing from the shoe.
//
// usage: npm run strategy-chart -- <decks> <S17|H17>     (six decks, S17 by default)
const DECKS = Number(process.argv[2] ?? 6);
const H17 = (process.argv[3] ?? 'S17') === 'H17';
const UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];

const newDeck = () => { const d = new Array(11).fill(4 * DECKS); d[0] = 0; d[10] = 16 * DECKS; return d; };
const size = (d) => { let n = 0; for (let c = 1; c <= 10; c++) n += d[c]; return n; };

// dealer final total distribution [17,18,19,20,21,bust], given the up card and no blackjack
const dealerCache = new Map();
function dealerDist(deck, up) {
  const key = deck.join(',') + '|' + up;
  let out = dealerCache.get(key);
  if (out) return out;
  out = [0, 0, 0, 0, 0, 0];
  const play = (total, soft, p) => {
    if (total > 21 && soft) { total -= 10; soft = false; }
    if (total > 21) { out[5] += p; return; }
    if (total >= 17 && !(total === 17 && soft && H17)) { out[total - 17] += p; return; }
    const n = size(deck);
    for (let c = 1; c <= 10; c++) {
      if (!deck[c]) continue;
      const q = p * deck[c] / n;
      deck[c]--;
      if (c === 1 && !soft && total + 11 <= 21) play(total + 11, true, q); else play(total + c, soft, q);
      deck[c]++;
    }
  };
  const banned = up === 1 ? 10 : up === 10 ? 1 : 0; // the hole card that would make a natural
  const n = size(deck) - (banned ? deck[banned] : 0);
  const start = up === 1 ? 11 : up;
  for (let c = 1; c <= 10; c++) {
    if (!deck[c] || c === banned) continue;
    const q = deck[c] / n;
    deck[c]--;
    if (c === 1 && up !== 1) play(start + 11, true, q); else if (c === 1) play(start + 1, true, q); else play(start + c, up === 1, q);
    deck[c]++;
  }
  dealerCache.set(key, out);
  return out;
}


// Chance the player's next card is c. The dealer has looked at the hole card and has no natural,
// so with an ace or a ten showing the hole card is known not to be a ten or an ace, which leaves
// slightly more of those for the player.
const banFor = (up) => (up === 1 ? 10 : up === 10 ? 1 : 0);
function drawProb(deck, up, c) {
  const n = size(deck), b = banFor(up);
  if (!b) return deck[c] / n;
  const open = n - deck[b];
  return c === b ? deck[b] / (n - 1) : deck[c] * (open - 1) / (open * (n - 1));
}

function standEV(total, deck, up) {
  const d = dealerDist(deck, up);
  let ev = d[5];
  for (let t = 17; t <= 21; t++) ev += d[t - 17] * (total > t ? 1 : total < t ? -1 : 0);
  return ev;
}

// player's best total and whether an ace counts as eleven
const add = (total, soft, c) => {
  let t = total + c, s = soft;
  if (c === 1 && !s && t + 10 <= 21) { t += 10; s = true; }
  if (t > 21 && s) { t -= 10; s = false; }
  return [t, s];
};

const hsCache = new Map();
function hitEV(total, soft, deck, up) {
  const n = size(deck);
  let ev = 0;
  for (let c = 1; c <= 10; c++) {
    if (!deck[c]) continue;
    const p = drawProb(deck, up, c);
    const [t, s] = add(total, soft, c);
    if (t > 21) { ev -= p; continue; }
    deck[c]--;
    ev += p * hitStandEV(t, s, deck, up);
    deck[c]++;
  }
  return ev;
}
function hitStandEV(total, soft, deck, up) {
  const key = deck.join(',') + '|' + up + '|' + total + (soft ? 's' : 'h');
  let ev = hsCache.get(key);
  if (ev !== undefined) return ev;
  ev = standEV(total, deck, up);
  if (total < 21) ev = Math.max(ev, hitEV(total, soft, deck, up));
  hsCache.set(key, ev);
  return ev;
}
function doubleEV(total, soft, deck, up) {
  const n = size(deck);
  let ev = 0;
  for (let c = 1; c <= 10; c++) {
    if (!deck[c]) continue;
    const p = drawProb(deck, up, c);
    const [t] = add(total, soft, c);
    if (t > 21) { ev -= 2 * p; continue; }
    deck[c]--;
    ev += 2 * p * standEV(t, deck, up);
    deck[c]++;
  }
  return ev;
}
function splitEV(rank, deck, up) {
  const n = size(deck);
  let ev = 0;
  for (let c = 1; c <= 10; c++) {
    if (!deck[c]) continue;
    const p = drawProb(deck, up, c);
    const [t, s] = add(rank === 1 ? 11 : rank, rank === 1, c);
    deck[c]--;
    ev += 2 * p * (rank === 1 ? standEV(t, deck, up) : hitStandEV(t, s, deck, up));
    deck[c]++;
  }
  return ev;
}

// EVs of each action for a two-card hand against an up card, and how likely the hand is
function evaluate(a, b, up) {
  const deck = newDeck();
  deck[up]--;
  const weight = (deck[a] / size(deck)) * ((deck[b] - (a === b ? 1 : 0)) / (size(deck) - 1)) * (a === b ? 1 : 2);
  deck[a]--; deck[b]--;
  // hands are weighted by how often they arise given that the dealer has no natural
  const ban = banFor(up);
  const noNatural = ban ? 1 - deck[ban] / size(deck) : 1;
  let [total, soft] = add(a === 1 ? 11 : a, a === 1, b);
  if (a !== 1 && b === 1) { total = a + 11; soft = true; }
  const res = { weight: weight * noNatural, stand: standEV(total, deck, up), hit: hitEV(total, soft, deck, up), double: doubleEV(total, soft, deck, up) };
  if (a === b) res.split = splitEV(a, deck, up);
  return res;
}

const best = (evs, allowed) => allowed.reduce((top, action) => (evs[action] > evs[top] ? action : top), allowed[0]);
const LETTER = { hit: 'H', stand: 'S', double: 'D', split: 'P' };
const margins = [];

function row(name, hands, withSplit = false) {
  const cells = UPS.map((up) => {
    const sum = { stand: 0, hit: 0, double: 0, split: 0 };
    for (const [a, b] of hands) {
      const e = evaluate(a, b, up);
      for (const k of Object.keys(sum)) sum[k] += e.weight * (e[k] ?? 0);
    }
    const actions = withSplit ? ['stand', 'hit', 'double', 'split'] : ['stand', 'hit', 'double'];
    const first = best(sum, actions);
    const noDouble = best(sum, ['stand', 'hit']);
    const ranked = actions.map((k) => sum[k]).sort((x, y) => y - x);
    const w = hands.reduce((t, [a, b]) => t + evaluate(a, b, up).weight, 0);
    margins.push({ name, up, first, margin: (ranked[0] - ranked[1]) / w });
    // a doubled or split hand names what to do when that is not allowed
    if (first === 'double') return 'D' + LETTER[noDouble].toLowerCase();
    if (first === 'split') return 'P' + (sum.double > sum[noDouble] ? 'D' + LETTER[noDouble].toLowerCase() : LETTER[noDouble].toLowerCase());
    return LETTER[first] + ' ';
  });
  console.log(name.padEnd(9), cells.join(' '));
}

console.log(`${DECKS} deck(s), dealer ${H17 ? 'hits' : 'stands on'} soft 17, no double after split. Columns: 2 3 4 5 6 7 8 9 10 A`);
for (let total = 5; total <= 20; total++) {
  const hands = [];
  for (let a = 2; a <= 10; a++) for (let b = a + 1; b <= 10; b++) if (a + b === total) hands.push([a, b]);
  if (total === 20) hands.push([10, 10]);
  if (hands.length) row(`hard ${total}`, hands);
}
for (let x = 2; x <= 9; x++) row(`soft ${11 + x}`, [[1, x]]);
for (let r = 2; r <= 10; r++) row(`pair ${r}`, [[r, r]], true);
row('pair A', [[1, 1]], true);
const close = margins.filter((m) => m.margin < 0.004).map((m) => `${m.name} v${m.up}:${m.first}(${m.margin.toFixed(4)})`);
console.log('close calls (EV margin under 0.004 of the stake):', close.join('  ') || 'none');
