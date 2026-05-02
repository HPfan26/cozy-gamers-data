// ============================================================
// SWITCH US/CA PRICE SCRAPER - Nintendo Store Page Method
// Uses __NEXT_DATA__ ROOT_QUERY to get the correct main product price
// No browser needed — just fetch + JSON parsing
// ============================================================

import fs from 'fs';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const games = [
  { title: 'Stardew Valley', slug: 'stardew-valley' },
  { title: 'Fae Farm', slug: 'fae-farm' },
  { title: 'Dredge', slug: 'dredge' },
  { title: 'A Little to the Left', slug: 'a-little-to-the-left' },
  { title: 'Toem', slug: 'toem' },
  { title: 'Paper Trail', slug: 'paper-trail' },
  { title: 'Little Kitty, Big City', slug: 'little-kitty-big-city' },
  { title: 'Hello Kitty Island Adventure', slug: 'hello-kitty-island-adventure' },
  { title: 'Minami Lane', slug: 'minami-lane' },
  { title: 'Sugardew Island', slug: 'sugardew-island' },
  { title: 'Lonesome Village', slug: 'lonesome-village' },
  { title: 'Lake', slug: 'lake' },
  { title: 'Tavern Talk', slug: 'tavern-talk' },
  { title: 'Cozy Grove', slug: 'cozy-grove' },
  { title: 'Wylde Flowers', slug: 'wylde-flowers' },
  { title: 'Lil Gator Game', slug: 'lil-gator-game' },
  { title: 'A Short Hike', slug: 'a-short-hike' },
  { title: 'Cat Cafe Manager', slug: 'cat-cafe-manager' },
  { title: 'Spiritfarer', slug: 'spiritfarer' },
  { title: 'Animal Crossing: New Horizons', slug: 'animal-crossing-new-horizons' },
  { title: 'My Time at Portia', slug: 'my-time-at-portia' },
  { title: 'Disney Dreamlight Valley', slug: 'disney-dreamlight-valley' },
  { title: 'Coffee Talk', slug: 'coffee-talk' },
  { title: 'Spirit of the North', slug: 'spirit-of-the-north' },
  { title: 'Neva', slug: 'neva' },
  { title: 'Wytchwood', slug: 'wytchwood' },
  { title: 'Lemon Cake', slug: 'lemon-cake' },
  { title: 'Paleo Pines', slug: 'paleo-pines' },
  { title: 'Cult of the Lamb', slug: 'cult-of-the-lamb' },
  { title: 'Roots of Pacha', slug: 'roots-of-pacha' },
  { title: 'Potion Permit', slug: 'potion-permit' },
  { title: 'Littlewood', slug: 'littlewood' },
  { title: 'Potion Craft', slug: 'potion-craft-alchemist-simulator' },
  { title: 'Slime Rancher', slug: 'slime-rancher-plortable-edition' },
  { title: 'Graveyard Keeper', slug: 'graveyard-keeper' },
  { title: 'House Flipper', slug: 'house-flipper' },
  { title: 'PowerWash Simulator', slug: 'powerwash-simulator' },
  { title: 'Dave the Diver', slug: 'dave-the-diver' },
  { title: 'Two Point Hospital', slug: 'two-point-hospital' },
  { title: 'Two Point Campus', slug: 'two-point-campus' },
  { title: 'Frog Detective', slug: 'frog-detective-the-entire-mystery' },
  { title: 'Venba', slug: 'venba' },
  { title: 'Untitled Goose Game', slug: 'untitled-goose-game' },
  { title: 'Hogwarts Legacy', slug: 'hogwarts-legacy' },
  { title: 'Botany Manor', slug: 'botany-manor' },
  { title: 'Monument Valley', slug: 'monument-valley' },
  { title: 'Monument Valley 2', slug: 'monument-valley-2' },
  { title: 'ABZU', slug: 'abzu' },
  { title: 'Strange Horticulture', slug: 'strange-horticulture' },
  { title: 'Unpacking', slug: 'unpacking' },
  { title: 'Caravan SandWitch', slug: 'caravan-sandwitch' },
  { title: 'Firewatch', slug: 'firewatch' },
  { title: 'Ooblets', slug: 'ooblets' },
  { title: 'Palia', slug: 'palia' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchPrice(slug, locale, currency) {
  const url = `https://www.nintendo.com/${locale}/store/products/${slug}-switch/`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const text = await res.text();

    const nextData = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!nextData) return null;
    const json = JSON.parse(nextData);
    const state = json.props?.pageProps?.initialApolloState;
    if (!state) return null;

    const rootQuery = state.ROOT_QUERY;
    const ref = Object.values(rootQuery || {}).find(v => v?.__ref)?.__ref;
    if (!ref) return null;

    const prices = state[ref]?.['prices({"personalized":false})'];
    const price = prices?.finalPrice;
    if (price === undefined || price === null) return null;

    if (price === 0) return 'Free';
    return `${currency}${parseFloat(price).toFixed(2)}`;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🎮 Nintendo US/CA store scraper starting...');

  let existing = {};
  try {
    const raw = fs.readFileSync('dekudeals_prices_all_regions.json', 'utf8');
    existing = JSON.parse(raw);
  } catch {
    console.log('No existing file found, starting fresh');
  }

  let success = 0;

  for (const game of games) {
    console.log(`🔍 Fetching ${game.title}...`);

    const [us, ca] = await Promise.all([
      fetchPrice(game.slug, 'us', '$'),
      fetchPrice(game.slug, 'en-ca', 'CA$'),
    ]);

    if (!existing[game.title]) existing[game.title] = {};
    if (us) existing[game.title].us = us;
    if (ca) existing[game.title].ca = ca;

    if (us || ca) {
      console.log(`  ✅ US=${us || '—'} | CA=${ca || '—'}`);
      success++;
    } else {
      console.log(`  ❌ Not found — slug may be wrong`);
    }

    await sleep(400);
  }

  fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(existing, null, 2));
  console.log(`\n💾 Saved. ${success} / ${games.length} games with US/CA prices`);
}

main();
