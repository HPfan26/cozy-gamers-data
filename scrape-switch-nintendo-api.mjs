// ============================================================
// SWITCH PRICE SCRAPER - NINTENDO ESHOP API METHOD
// Uses the official Nintendo eShop API directly (no browser needed)
// NSUIDs verified via Nintendo's search API
// Covers all regions matching Xbox coverage
// Note: US and CA are handled by scrape-switch-us-ca.mjs (store page method)
//       as the eShop API does not accept US/CA NSUIDs
// ============================================================

import fs from 'fs';

// All regions the Nintendo eShop API supports
// US and CA are excluded here — handled by scrape-switch-us-ca.mjs
const REGIONS = {
  gb: { symbol: '£' },
  au: { symbol: '$' },
  pt: { symbol: '€' },
  de: { symbol: '€' },
  fr: { symbol: '€' },
  es: { symbol: '€' },
  nl: { symbol: '€' },
  fi: { symbol: '€' },
  hu: { symbol: '€' },
  se: { symbol: 'kr' },
  dk: { symbol: 'kr' },
  pl: { symbol: 'zł' },
  cz: { symbol: 'Kč' },
  za: { symbol: 'R' },
  mx: { symbol: '$' },
  br: { symbol: 'R$' },
};

const games = [
  { title: 'Stardew Valley', nsuid: '70010000001802' },
  { title: 'Fae Farm', nsuid: '70010000054981' },
  { title: 'Dredge', nsuid: '70070000016693' },
  { title: 'A Little to the Left', nsuid: '70010000051362' },
  { title: 'Toem', nsuid: '70010000041462' },
  { title: 'Paper Trail', nsuid: '70010000022444' },
  { title: 'Little Kitty, Big City', nsuid: '70010000029229' },
  { title: 'Hello Kitty Island Adventure', nsuid: '70010000074492' },
  { title: 'Minami Lane', nsuid: '70010000030573' },
  { title: 'Sugardew Island', nsuid: '70010000035736' },
  { title: 'Lonesome Village', nsuid: '70010000053311' },
  { title: 'Lake', nsuid: '70010000027345' },
  { title: 'Tavern Talk', nsuid: '70010000029111' },
  { title: 'Cozy Grove', nsuid: '70010000035712' },
  { title: 'Wylde Flowers', nsuid: '70010000036201' },
  { title: 'Lil Gator Game', nsuid: '70010000036904' },
  { title: 'A Short Hike', nsuid: '70010000032368' },
  { title: 'Cat Cafe Manager', nsuid: '70010000029071' },
  { title: 'Spiritfarer', nsuid: '70010000020665' },
  { title: 'Animal Crossing: New Horizons', nsuid: '70010000027620' },
  { title: 'My Time at Portia', nsuid: '70010000004650' },
  { title: 'Disney Dreamlight Valley', nsuid: '70010000010671' },
  { title: 'Coffee Talk', nsuid: '70010000019678' },
  { title: 'Spirit of the North', nsuid: '70010000028189' },
  { title: 'Lemon Cake', nsuid: '70010000052760' },
  { title: 'Paleo Pines', nsuid: '70010000018688' },
  { title: 'Cult of the Lamb', nsuid: '70010000047974' },
  { title: 'Roots of Pacha', nsuid: '70010000041424' },
  { title: 'Potion Permit', nsuid: '70010000035809' },
  { title: 'Littlewood', nsuid: '70010000034938' },
  { title: 'Potion Craft', nsuid: '70010000054961' },
  { title: 'Slime Rancher', nsuid: '70010000040145' },
  { title: 'Graveyard Keeper', nsuid: '70010000013396' },
  { title: 'House Flipper', nsuid: '70010000021181' },
  { title: 'PowerWash Simulator', nsuid: '70010000045038' },
  { title: 'Dave the Diver', nsuid: '70010000003601' },
  { title: 'Two Point Hospital', nsuid: '70070000015390' },
  { title: 'Two Point Campus', nsuid: '70010000034356' },
  { title: 'Frog Detective', nsuid: '70010000012921' },
  { title: 'Venba', nsuid: '70010000057822' },
  { title: 'Untitled Goose Game', nsuid: '70010000014140' },
  { title: 'Hogwarts Legacy', nsuid: '70010000062277' },
  { title: 'Botany Manor', nsuid: '70010000060343' },
  { title: 'Monument Valley', nsuid: '70010000089549' },
  { title: 'Monument Valley 2', nsuid: '70010000089554' },
  { title: 'ABZU', nsuid: '70010000012835' },
  { title: 'Strange Horticulture', nsuid: '70010000052158' },
  { title: 'Unpacking', nsuid: '70010000043206' },
  { title: 'Caravan SandWitch', nsuid: '70010000037487' },
  { title: 'Firewatch', nsuid: '70010000007925' },
  { title: 'Ooblets', nsuid: '70010000048968' },
  { title: 'Neva', nsuid: '70010000071466' },
  { title: 'Wytchwood', nsuid: '70010000046095' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatPrice(amount, country) {
  if (amount === 0) return 'Free';
  const { symbol } = REGIONS[country];
  if (['kr', 'zł', 'Kč', 'R$'].includes(symbol)) return `${amount.toFixed(2)} ${symbol}`;
  if (symbol === '€') return `${amount.toFixed(2)}€`;
  return `${symbol}${amount.toFixed(2)}`;
}

async function fetchPricesForGame(nsuid) {
  const results = {};

  for (const country of Object.keys(REGIONS)) {
    const url = `https://api.ec.nintendo.com/v1/price?country=${country.toUpperCase()}&lang=en&ids=${nsuid}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const priceInfo = data.prices?.[0];
      if (!priceInfo) continue;

      const salePrice = priceInfo.discount_price?.raw_value;
      const regularPrice = priceInfo.regular_price?.raw_value;
      const amount = parseFloat(salePrice ?? regularPrice ?? null);

      if (!isNaN(amount)) {
        results[country] = formatPrice(amount, country);
      }
    } catch {
      // silently skip failed regions
    }
    await sleep(150);
  }

  return results;
}

async function main() {
  console.log('🎮 Nintendo eShop API price scraper starting...');

  // Load existing file so scrape-switch-us-ca.mjs entries (us, ca) are preserved
  let existing = {};
  try {
    const raw = fs.readFileSync('dekudeals_prices_all_regions.json', 'utf8');
    existing = JSON.parse(raw);
  } catch {
    console.log('No existing file found, starting fresh');
  }

  for (const game of games) {
    console.log(`🔍 Fetching ${game.title}...`);
    const prices = await fetchPricesForGame(game.nsuid);

    // Merge into existing entry, preserving us/ca from the other scraper
    if (!existing[game.title]) existing[game.title] = {};
    Object.assign(existing[game.title], prices);

    const found = Object.keys(prices).length;
    if (found > 0) {
      console.log(`  ✅ ${found} regions found`);
    } else {
      console.log(`  ❌ No prices found`);
    }

    await sleep(300);
  }

  fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(existing, null, 2));
  console.log('\n💾 Switch prices saved to dekudeals_prices_all_regions.json');
  console.log(`✅ ${Object.values(existing).filter(p => Object.keys(p).length > 0).length} / ${games.length} games with prices`);
}

main();
