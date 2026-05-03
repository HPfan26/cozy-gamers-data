// ============================================================
// THE COZY GAMERS - ITAD PRICE SCRAPER
// Fetches prices for Steam and PlayStation only.
// Nintendo Switch: handled by scrape-switch-nintendo-api.mjs + scrape-switch-us-ca.mjs
// Xbox: handled by scrapeXbox2.js
// ============================================================

import fs from 'fs';

const ITAD_API_KEY = process.env.ITAD_API_KEY;
const GAMES_URL = 'https://raw.githubusercontent.com/HPfan26/cozy-gamers-data/main/games.json';
const ITAD_BASE = 'https://api.isthereanydeal.com';

// All 21 regions matching Xbox coverage
const REGIONS = {
  gb: { symbol: '£' },
  us: { symbol: '$' },
  ca: { symbol: '$' },
  au: { symbol: '$' },
  pt: { symbol: '€' },
  de: { symbol: '€' },
  fr: { symbol: '€' },
  es: { symbol: '€' },
  nl: { symbol: '€' },
  fi: { symbol: '€' },
  se: { symbol: 'kr' },
  dk: { symbol: 'kr' },
  pl: { symbol: 'zł' },
  cz: { symbol: 'Kč' },
  hu: { symbol: '€' },
  br: { symbol: 'R$' },
  mx: { symbol: '$' },
  za: { symbol: 'R' },
  in: { symbol: '₹' },
  ph: { symbol: '₱' },
};

// ITAD shop IDs
const SHOPS = { steam: 61, playstation: 35 };

// Additional Steam App IDs not in games.json or with title mismatches
const STEAM_APP_ID_OVERRIDES = {
  'The Sims 2': 3314070,
  'Frog Detective': 963000,
  'Sugardew Island': 2711030,
};

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
  // Currencies that go after the number
  if (['kr', 'zł', 'Kč'].includes(sym)) return `${amount.toFixed(2)} ${sym}`;
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

  const data = await fetchJSON(
    `${ITAD_BASE}/lookup/id/title/v1?key=${ITAD_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(titles)
    }
  );

  for (const [title, id] of Object.entries(data)) {
    if (id) {
      itadIds[title] = id;
    } else {
      console.warn(`  ⚠️  No ITAD ID found by title: ${title}`);
    }
  }

  // For misses, try Steam App ID lookup — check overrides first, then games.json
  const misses = titles.filter(t => !itadIds[t]);
  const missesWithAppId = misses.filter(t => STEAM_APP_ID_OVERRIDES[t] || games[t].steamAppId);
  console.log(`  🔄 Trying Steam App ID lookup for ${missesWithAppId.length} missed games...`);

  for (const title of missesWithAppId) {
    const appId = STEAM_APP_ID_OVERRIDES[title] || games[title].steamAppId;
    try {
      const result = await fetchJSON(
        `${ITAD_BASE}/games/lookup/v1?key=${ITAD_API_KEY}&appid=${appId}`
      );
      if (result.found && result.game?.id) {
        itadIds[title] = result.game.id;
        console.log(`  ✅ Found via Steam ID: ${title} (${appId})`);
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
// STEP 3: Fetch Steam and PlayStation prices per region
// ============================================================

async function fetchPrices(games, itadIds) {
  console.log('\n💰 Fetching prices from ITAD...');

  const titleById = Object.fromEntries(
    Object.entries(itadIds).map(([title, id]) => [id, title])
  );
  const gameIds = Object.values(itadIds);

  const steamOut = {};
  const psOut = {};

  const shopFilter = `${SHOPS.steam},${SHOPS.playstation}`;

  for (const [country] of Object.entries(REGIONS)) {
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
            const appId = String(STEAM_APP_ID_OVERRIDES[title] || games[title]?.steamAppId);
            if (appId && appId !== 'null' && appId !== 'undefined') {
              if (!steamOut[appId]) steamOut[appId] = {};
              steamOut[appId][country] = formatPrice(steamDeal.price.amount, country);
            }
          }

          // --- PLAYSTATION ---
          const psDeal = deals.find(d => d.shop?.id === SHOPS.playstation);
          if (!psOut[title]) psOut[title] = { playstation: {} };
          psOut[title].playstation[country] = psDeal?.price?.amount ?? null;
        }

        await sleep(300);
      } catch (err) {
        console.error(`  ❌ Price fetch failed for ${country}: ${err.message}`);
      }
    }
  }

  return { steamOut, psOut };
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

    const { steamOut, psOut } = await fetchPrices(games, itadIds);

    console.log('\n📝 Writing price files...');
    fs.writeFileSync('steamPrices_multi.json', JSON.stringify(steamOut, null, 2));
    console.log(`✅ steamPrices_multi.json (${Object.keys(steamOut).length} games)`);

    fs.writeFileSync('playstation-prices.json', JSON.stringify(psOut, null, 2));
    console.log(`✅ playstation-prices.json (${Object.keys(psOut).length} games)`);

    console.log('ℹ️  Nintendo Switch prices handled by scrape-switch-nintendo-api.mjs + scrape-switch-us-ca.mjs');
    console.log('ℹ️  Xbox prices handled by scrapeXbox2.js');
    console.log('\n🎉 All price files updated successfully!');

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
