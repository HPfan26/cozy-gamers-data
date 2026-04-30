// ============================================================
// THE COZY GAMERS - ITAD PRICE SCRAPER
// Fetches prices for all games across Steam, PlayStation,
// Xbox, and Nintendo Switch for multiple regions.
// Outputs JSON files matching the existing price file formats.
// ============================================================

import fs from 'fs';

const ITAD_API_KEY = process.env.ITAD_API_KEY;
const GAMES_URL = 'https://raw.githubusercontent.com/HPfan26/cozy-gamers-data/main/games.json';
const ITAD_BASE = 'https://api.isthereanydeal.com';

// Regions to fetch
const REGIONS = {
  gb: { xboxLocale: 'en-gb', symbol: '£' },
  us: { xboxLocale: 'en-us', symbol: '$' },
  ca: { xboxLocale: 'en-ca', symbol: '$' },
  au: { xboxLocale: 'en-au', symbol: '$' },
  pt: { xboxLocale: 'pt-pt', symbol: '€' },
};

// ITAD shop IDs
const SHOPS = { steam: 61, playstation: 35, xbox: 20, nintendo: 37 };

// ============================================================
// HELPERS
// ============================================================

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatPrice(amount, country) {
  if (amount === 0) return 'Free';
  const sym = REGIONS[country]?.symbol || '$';
  if (sym === '€') return `${amount.toFixed(2)}€`;
  return `${sym}${amount.toFixed(2)}`;
}

// ============================================================
// STEP 1: Load games from GitHub
// ============================================================

async function loadGames() {
  console.log('📂 Loading games from GitHub...');
  const games = await fetchJSON(GAMES_URL);
  console.log(`✅ Loaded ${Object.keys(games).length} games`);
  return games;
}

// ============================================================
// STEP 2: Look up ITAD game IDs by title (batch POST)
// ============================================================

async function lookupItadIds(games) {
  console.log('\n🔍 Looking up ITAD game IDs by title...');

  const titles = Object.keys(games);
  const itadIds = {};

  // POST /lookup/id/title/v1 — batch lookup by title
  const data = await fetchJSON(
    `${ITAD_BASE}/lookup/id/title/v1?key=${ITAD_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(titles)
    }
  );

  // Response is { "Title": "uuid-or-null", ... }
  for (const [title, id] of Object.entries(data)) {
    if (id) {
      itadIds[title] = id;
    } else {
      console.warn(`  ⚠️  No ITAD ID found by title: ${title}`);
    }
  }

  // For misses, try Steam App ID lookup individually
  const misses = titles.filter(t => !itadIds[t] && games[t].steamAppId);
  console.log(`  🔄 Trying Steam App ID lookup for ${misses.length} missed games...`);

  for (const title of misses) {
    const appId = games[title].steamAppId;
    try {
      const result = await fetchJSON(
        `${ITAD_BASE}/games/lookup/v1?key=${ITAD_API_KEY}&appid=${appId}`
      );
      if (result.found && result.game?.id) {
        itadIds[title] = result.game.id;
        console.log(`  ✅ Found via Steam ID: ${title}`);
      } else {
        console.warn(`  ❌ Still not found: ${title}`);
      }
      await sleep(200);
    } catch (err) {
      console.warn(`  ❌ Steam ID lookup failed for ${title}: ${err.message}`);
    }
  }

  console.log(`✅ Found ITAD IDs for ${Object.keys(itadIds).length} / ${titles.length} games`);
  return itadIds;
}

// ============================================================
// STEP 3: Fetch prices per region
// ============================================================

async function fetchPrices(games, itadIds) {
  console.log('\n💰 Fetching prices from ITAD...');

  const titleById = Object.fromEntries(
    Object.entries(itadIds).map(([title, id]) => [id, title])
  );
  const gameIds = Object.values(itadIds);

  const steamOut = {};
  const psOut = {};
  const ninOut = {};
  const xboxOut = {};

  const shopFilter = `${SHOPS.steam},${SHOPS.playstation},${SHOPS.xbox},${SHOPS.nintendo}`;

  for (const [country, regionInfo] of Object.entries(REGIONS)) {
    console.log(`\n  🌍 Fetching prices for: ${country.toUpperCase()}...`);

    const CHUNK = 200;
    for (let i = 0; i < gameIds.length; i += CHUNK) {
      const chunk = gameIds.slice(i, i + CHUNK);

      try {
        const results = await fetchJSON(
          `${ITAD_BASE}/games/prices/v3?key=${ITAD_API_KEY}&country=${country.toUpperCase()}&shops=${shopFilter}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chunk)
          }
        );

        for (const gamePrice of results) {
          const title = titleById[gamePrice.id];
          if (!title) continue;

          const deals = gamePrice.deals || [];

          // --- STEAM ---
          const steamDeal = deals.find(d => d.shop?.id === SHOPS.steam);
          if (steamDeal?.price?.amount !== undefined) {
            const appId = String(games[title]?.steamAppId);
            if (appId && appId !== 'null') {
              if (!steamOut[appId]) steamOut[appId] = {};
              steamOut[appId][country] = formatPrice(steamDeal.price.amount, country);
            }
          }

          // --- PLAYSTATION ---
          const psDeal = deals.find(d => d.shop?.id === SHOPS.playstation);
          if (!psOut[title]) psOut[title] = { playstation: {} };
          psOut[title].playstation[country] = psDeal?.price?.amount ?? null;

          // --- NINTENDO ---
          const ninDeal = deals.find(d => d.shop?.id === SHOPS.nintendo);
          if (ninDeal?.price?.amount !== undefined) {
            if (!ninOut[title]) ninOut[title] = {};
            ninOut[title][country] = formatPrice(ninDeal.price.amount, country);
          }

          // --- XBOX ---
          const xboxDeal = deals.find(d => d.shop?.id === SHOPS.xbox);
          if (xboxDeal?.price?.amount !== undefined) {
            if (!xboxOut[title]) xboxOut[title] = {};
            xboxOut[title][regionInfo.xboxLocale] = {
              price: formatPrice(xboxDeal.price.amount, country),
              originalPrice: xboxDeal.regular?.amount && xboxDeal.regular.amount !== xboxDeal.price.amount
                ? formatPrice(xboxDeal.regular.amount, country)
                : null
            };
          }
        }

        await sleep(300);
      } catch (err) {
        console.error(`  ❌ Price fetch failed for ${country}: ${err.message}`);
      }
    }
  }

  return { steamOut, psOut, ninOut, xboxOut };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (!ITAD_API_KEY) {
    console.error('❌ ITAD_API_KEY environment variable not set');
    process.exit(1);
  }

  try {
    const games = await loadGames();
    const itadIds = await lookupItadIds(games);

    if (Object.keys(itadIds).length === 0) {
      console.error('❌ No ITAD IDs found — aborting to avoid overwriting price files with empty data');
      process.exit(1);
    }

    const { steamOut, psOut, ninOut, xboxOut } = await fetchPrices(games, itadIds);

    console.log('\n📝 Writing price files...');
    fs.writeFileSync('steamPrices_multi.json', JSON.stringify(steamOut, null, 2));
    console.log(`✅ steamPrices_multi.json (${Object.keys(steamOut).length} games)`);

    fs.writeFileSync('playstation-prices.json', JSON.stringify(psOut, null, 2));
    console.log(`✅ playstation-prices.json (${Object.keys(psOut).length} games)`);

    fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(ninOut, null, 2));
    console.log(`✅ dekudeals_prices_all_regions.json (${Object.keys(ninOut).length} games)`);

    fs.writeFileSync('xboxPrices.json', JSON.stringify(xboxOut, null, 2));
    console.log(`✅ xboxPrices.json (${Object.keys(xboxOut).length} games)`);

    console.log('\n🎉 All price files updated successfully!');

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
