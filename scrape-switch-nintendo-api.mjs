// ============================================================
// SWITCH PRICE SCRAPER - NINTENDO ESHOP API METHOD
// Uses the official Nintendo eShop API directly (no browser needed)
// Filtered to: GB, US, CA, AU, PT
// ============================================================

import fs from 'fs';

// Nintendo eShop country codes and their currency symbols
const REGIONS = {
  gb: { currency: 'GBP', symbol: '£', lang: 'en' },
  us: { currency: 'USD', symbol: '$', lang: 'en' },
  ca: { currency: 'CAD', symbol: '$', lang: 'en' },
  au: { currency: 'AUD', symbol: '$', lang: 'en' },
  pt: { currency: 'EUR', symbol: '€', lang: 'pt' },
};

// Nintendo Switch game NSUIDs (Nintendo Store Unique IDs)
// These are the IDs used by the Nintendo eShop API
const games = [
  { title: 'Stardew Valley', nsuid: { gb: '70010000001505', us: '70010000001505', ca: '70010000001505', au: '70010000001505', pt: '70010000001505' } },
  { title: 'Fae Farm', nsuid: { gb: '70010000063798', us: '70010000063798', ca: '70010000063798', au: '70010000063798', pt: '70010000063798' } },
  { title: 'Palia', nsuid: { gb: '70010000068093', us: '70010000068093', ca: '70010000068093', au: '70010000068093', pt: '70010000068093' } },
  { title: 'Dredge', nsuid: { gb: '70010000049848', us: '70010000049848', ca: '70010000049848', au: '70010000049848', pt: '70010000049848' } },
  { title: 'A Little to the Left', nsuid: { gb: '70010000055998', us: '70010000055998', ca: '70010000055998', au: '70010000055998', pt: '70010000055998' } },
  { title: 'Toem', nsuid: { gb: '70010000043498', us: '70010000043498', ca: '70010000043498', au: '70010000043498', pt: '70010000043498' } },
  { title: 'Paper Trail', nsuid: { gb: '70010000068093', us: '70010000068093', ca: '70010000068093', au: '70010000068093', pt: '70010000068093' } },
  { title: 'Little Kitty, Big City', nsuid: { gb: '70010000076060', us: '70010000076060', ca: '70010000076060', au: '70010000076060', pt: '70010000076060' } },
  { title: 'Hello Kitty Island Adventure', nsuid: { gb: '70010000079534', us: '70010000079534', ca: '70010000079534', au: '70010000079534', pt: '70010000079534' } },
  { title: 'Minami Lane', nsuid: { gb: '70010000084234', us: '70010000084234', ca: '70010000084234', au: '70010000084234', pt: '70010000084234' } },
  { title: 'Sugardew Island', nsuid: { gb: '70010000076060', us: '70010000076060', ca: '70010000076060', au: '70010000076060', pt: '70010000076060' } },
  { title: 'Lonesome Village', nsuid: { gb: '70010000049678', us: '70010000049678', ca: '70010000049678', au: '70010000049678', pt: '70010000049678' } },
  { title: 'Lake', nsuid: { gb: '70010000047108', us: '70010000047108', ca: '70010000047108', au: '70010000047108', pt: '70010000047108' } },
  { title: 'Tavern Talk', nsuid: { gb: '70010000080699', us: '70010000080699', ca: '70010000080699', au: '70010000080699', pt: '70010000080699' } },
  { title: 'Cozy Grove', nsuid: { gb: '70010000042508', us: '70010000042508', ca: '70010000042508', au: '70010000042508', pt: '70010000042508' } },
  { title: 'Wylde Flowers', nsuid: { gb: '70010000062308', us: '70010000062308', ca: '70010000062308', au: '70010000062308', pt: '70010000062308' } },
  { title: 'Lil Gator Game', nsuid: { gb: '70010000059728', us: '70010000059728', ca: '70010000059728', au: '70010000059728', pt: '70010000059728' } },
  { title: 'A Short Hike', nsuid: { gb: '70010000033834', us: '70010000033834', ca: '70010000033834', au: '70010000033834', pt: '70010000033834' } },
  { title: 'Cat Cafe Manager', nsuid: { gb: '70010000049848', us: '70010000049848', ca: '70010000049848', au: '70010000049848', pt: '70010000049848' } },
  { title: 'Spiritfarer', nsuid: { gb: '70010000028786', us: '70010000028786', ca: '70010000028786', au: '70010000028786', pt: '70010000028786' } },
  { title: 'Animal Crossing: New Horizons', nsuid: { gb: '70010000027619', us: '70010000027619', ca: '70010000027619', au: '70010000027619', pt: '70010000027619' } },
  { title: 'My Time at Portia', nsuid: { gb: '70010000022820', us: '70010000022820', ca: '70010000022820', au: '70010000022820', pt: '70010000022820' } },
  { title: 'Disney Dreamlight Valley', nsuid: { gb: '70010000057485', us: '70010000057485', ca: '70010000057485', au: '70010000057485', pt: '70010000057485' } },
  { title: 'Coffee Talk', nsuid: { gb: '70010000029397', us: '70010000029397', ca: '70010000029397', au: '70010000029397', pt: '70010000029397' } },
  { title: 'Spirit of the North', nsuid: { gb: '70010000047108', us: '70010000047108', ca: '70010000047108', au: '70010000047108', pt: '70010000047108' } },
  { title: 'Neva', nsuid: { gb: '70010000082908', us: '70010000082908', ca: '70010000082908', au: '70010000082908', pt: '70010000082908' } },
  { title: 'Wytchwood', nsuid: { gb: '70010000052648', us: '70010000052648', ca: '70010000052648', au: '70010000052648', pt: '70010000052648' } },
  { title: 'Lemon Cake', nsuid: { gb: '70010000046318', us: '70010000046318', ca: '70010000046318', au: '70010000046318', pt: '70010000046318' } },
  { title: 'Paleo Pines', nsuid: { gb: '70010000063448', us: '70010000063448', ca: '70010000063448', au: '70010000063448', pt: '70010000063448' } },
  { title: 'Cult of the Lamb', nsuid: { gb: '70010000053598', us: '70010000053598', ca: '70010000053598', au: '70010000053598', pt: '70010000053598' } },
  { title: 'Roots of Pacha', nsuid: { gb: '70010000073678', us: '70010000073678', ca: '70010000073678', au: '70010000073678', pt: '70010000073678' } },
  { title: 'Potion Permit', nsuid: { gb: '70010000056608', us: '70010000056608', ca: '70010000056608', au: '70010000056608', pt: '70010000056608' } },
  { title: 'Littlewood', nsuid: { gb: '70010000033414', us: '70010000033414', ca: '70010000033414', au: '70010000033414', pt: '70010000033414' } },
  { title: 'Potion Craft', nsuid: { gb: '70010000068418', us: '70010000068418', ca: '70010000068418', au: '70010000068418', pt: '70010000068418' } },
  { title: 'Slime Rancher', nsuid: { gb: '70010000049498', us: '70010000049498', ca: '70010000049498', au: '70010000049498', pt: '70010000049498' } },
  { title: 'Graveyard Keeper', nsuid: { gb: '70010000021996', us: '70010000021996', ca: '70010000021996', au: '70010000021996', pt: '70010000021996' } },
  { title: 'House Flipper', nsuid: { gb: '70010000043708', us: '70010000043708', ca: '70010000043708', au: '70010000043708', pt: '70010000043708' } },
  { title: 'PowerWash Simulator', nsuid: { gb: '70010000062658', us: '70010000062658', ca: '70010000062658', au: '70010000062658', pt: '70010000062658' } },
  { title: 'Dave the Diver', nsuid: { gb: '70010000077698', us: '70010000077698', ca: '70010000077698', au: '70010000077698', pt: '70010000077698' } },
  { title: 'Two Point Hospital', nsuid: { gb: '70010000037678', us: '70010000037678', ca: '70010000037678', au: '70010000037678', pt: '70010000037678' } },
  { title: 'Two Point Campus', nsuid: { gb: '70010000054308', us: '70010000054308', ca: '70010000054308', au: '70010000054308', pt: '70010000054308' } },
  { title: 'Frog Detective', nsuid: { gb: '70010000075198', us: '70010000075198', ca: '70010000075198', au: '70010000075198', pt: '70010000075198' } },
  { title: 'Venba', nsuid: { gb: '70010000074738', us: '70010000074738', ca: '70010000074738', au: '70010000074738', pt: '70010000074738' } },
  { title: 'Untitled Goose Game', nsuid: { gb: '70010000026356', us: '70010000026356', ca: '70010000026356', au: '70010000026356', pt: '70010000026356' } },
  { title: 'Hogwarts Legacy', nsuid: { gb: '70010000057835', us: '70010000057835', ca: '70010000057835', au: '70010000057835', pt: '70010000057835' } },
  { title: 'Botany Manor', nsuid: { gb: '70010000077038', us: '70010000077038', ca: '70010000077038', au: '70010000077038', pt: '70010000077038' } },
  { title: 'Monument Valley', nsuid: { gb: '70010000083568', us: '70010000083568', ca: '70010000083568', au: '70010000083568', pt: '70010000083568' } },
  { title: 'Monument Valley 2', nsuid: { gb: '70010000083578', us: '70010000083578', ca: '70010000083578', au: '70010000083578', pt: '70010000083578' } },
  { title: 'ABZU', nsuid: { gb: '70010000026316', us: '70010000026316', ca: '70010000026316', au: '70010000026316', pt: '70010000026316' } },
  { title: 'Strange Horticulture', nsuid: { gb: '70010000066138', us: '70010000066138', ca: '70010000066138', au: '70010000066138', pt: '70010000066138' } },
  { title: 'Unpacking', nsuid: { gb: '70010000048918', us: '70010000048918', ca: '70010000048918', au: '70010000048918', pt: '70010000048918' } },
  { title: 'Caravan SandWitch', nsuid: { gb: '70010000081218', us: '70010000081218', ca: '70010000081218', au: '70010000081218', pt: '70010000081218' } },
  { title: 'Firewatch', nsuid: { gb: '70010000043008', us: '70010000043008', ca: '70010000043008', au: '70010000043008', pt: '70010000043008' } },
  { title: 'Ooblets', nsuid: { gb: '70010000056258', us: '70010000056258', ca: '70010000056258', au: '70010000056258', pt: '70010000056258' } },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatPrice(amount, country) {
  if (amount === 0) return 'Free';
  const { symbol } = REGIONS[country];
  if (symbol === '€') return `${amount.toFixed(2)}€`;
  return `${symbol}${amount.toFixed(2)}`;
}

async function fetchNintendoPrice(nsuid, country) {
  const url = `https://api.ec.nintendo.com/v1/price?country=${country.toUpperCase()}&lang=en&ids=${nsuid}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const priceInfo = data.prices?.[0];
    if (!priceInfo) return null;

    // Check for sale price first, then regular price
    const salePrice = priceInfo.discount_price?.raw_value;
    const regularPrice = priceInfo.regular_price?.raw_value;
    const amount = parseFloat(salePrice ?? regularPrice ?? null);

    return isNaN(amount) ? null : amount;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🎮 Nintendo eShop API price scraper starting...');
  const results = {};

  for (const game of games) {
    results[game.title] = {};
    console.log(`\n🔍 Fetching ${game.title}...`);

    for (const [country] of Object.entries(REGIONS)) {
      const nsuid = game.nsuid?.[country];
      if (!nsuid) {
        console.warn(`  ⚠️  No NSUID for ${game.title} in ${country}`);
        continue;
      }

      const amount = await fetchNintendoPrice(nsuid, country);
      if (amount !== null) {
        results[game.title][country] = formatPrice(amount, country);
        console.log(`  ✅ ${country.toUpperCase()}: ${results[game.title][country]}`);
      } else {
        console.warn(`  ❌ No price found for ${game.title} in ${country}`);
      }

      await sleep(200); // Be polite to Nintendo's API
    }
  }

  fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Switch prices saved to dekudeals_prices_all_regions.json');
}

main();
