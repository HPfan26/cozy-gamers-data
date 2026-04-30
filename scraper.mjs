// ============================================================
// THE COZY GAMERS - ITAD PRICE SCRAPER
// Fetches prices for all games across Steam, PlayStation,
// Xbox, and Nintendo Switch for multiple regions.
// Outputs JSON files matching the existing price file formats.
// ============================================================

import fs from 'fs';

const ITAD_API_KEY = process.env.ITAD_API_KEY;
const GAMES_URL = 'https://raw.githubusercontent.com/HPfan26/cozy-gamers-data/main/games.json';

// Regions to fetch - mapped to ITAD country codes
const REGIONS = {
  gb: { currency: 'GBP', xboxLocale: 'en-gb', nintendoKey: 'gb' },
  us: { currency: 'USD', xboxLocale: 'en-us', nintendoKey: 'us' },
  ca: { currency: 'CAD', xboxLocale: 'en-ca', nintendoKey: 'ca' },
  au: { currency: 'AUD', xboxLocale: 'en-au', nintendoKey: 'au' },
  pt: { currency: 'EUR', xboxLocale: 'pt-pt', nintendoKey: 'pt' },
};

// ITAD shop IDs for each platform
const SHOP_IDS = {
  steam:       61,
  playstation: 35,  // PSN
  xbox:        20,  // Xbox / Microsoft Store
  nintendo:    37,  // Nintendo eShop
};

// ============================================================
// HELPERS
// ============================================================

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format a price number into the string format each platform uses
function formatSteamPrice(amount, country) {
  if (amount === 0) return 'Free';
  const symbols = { gb: '£', us: '$', ca: 'CDN$ ', au: 'A$ ', pt: '€' };
  const sym = symbols[country] || '';
  return `${sym}${amount.toFixed(2)}`;
}

function formatNintendoPrice(amount, country) {
  if (amount === 0) return 'Free';
  const symbols = { gb: '£', us: '$', ca: '$', au: '$', pt: '€' };
  const sym = symbols[country] || '';
  return `${sym}${amount.toFixed(2)}`;
}

function formatXboxPrice(amount, country) {
  if (amount === 0) return 'Free';
  const symbols = { gb: '£', us: '$', ca: '$', au: '$', pt: '€' };
  const sym = symbols[country] || '';
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
// STEP 2: Look up ITAD game IDs from Steam App IDs
// ============================================================

async function lookupItadIds(games) {
  console.log('\n🔍 Looking up ITAD game IDs from Steam App IDs...');

  const steamAppIds = Object.entries(games)
    .filter(([, g]) => g.steamAppId)
    .map(([title, g]) => ({ title, appId: g.steamAppId }));

  // ITAD lookup endpoint accepts up to 100 IDs at once
  const CHUNK_SIZE = 100;
  const itadIds = {}; // title -> ITAD game ID

  for (let i = 0; i < steamAppIds.length; i += CHUNK_SIZE) {
    const chunk = steamAppIds.slice(i, i + CHUNK_SIZE);
    const appIdList = chunk.map(g => `app/${g.appId}`).join(',');

    try {
      const data = await fetchJSON(
        `https://api.isthereanydeal.com/games/lookup/v1?key=${ITAD_API_KEY}&appids=${appIdList}`
      );

      chunk.forEach(({ title, appId }) => {
        const match = data.games?.find(g => g.appid === `app/${appId}`);
        if (match?.id) {
          itadIds[title] = match.id;
        } else {
          console.warn(`  ⚠️  No ITAD ID found for: ${title} (Steam ID: ${appId})`);
        }
      });

      await sleep(500); // Be polite to the API
    } catch (err) {
      console.error(`  ❌ Lookup failed for chunk: ${err.message}`);
    }
  }

  // Games without Steam IDs (e.g. Animal Crossing) - try title search
  const noSteamId = Object.entries(games).filter(([, g]) => !g.steamAppId);
  for (const [title] of noSteamId) {
    try {
      const data = await fetchJSON(
        `https://api.isthereanydeal.com/games/search/v1?key=${ITAD_API_KEY}&title=${encodeURIComponent(title)}&limit=1`
      );
      if (data.games?.[0]?.id) {
        itadIds[title] = data.games[0].id;
        console.log(`  ✅ Found via search: ${title}`);
      }
      await sleep(300);
    } catch (err) {
      console.warn(`  ⚠️  Search failed for: ${title}`);
    }
  }

  console.log(`✅ Found ITAD IDs for ${Object.keys(itadIds).length} games`);
  return itadIds;
}

// ============================================================
// STEP 3: Fetch prices from ITAD for all regions
// ============================================================

async function fetchPrices(itadIds) {
  console.log('\n💰 Fetching prices from ITAD...');

  const gameIds = Object.values(itadIds);
  const titleById = Object.fromEntries(
    Object.entries(itadIds).map(([title, id]) => [id, title])
  );

  // Output price objects
  const steamPrices = {};      // { steamAppId: { gb: '£x', us: '$x', ... } }
  const playstationPrices = {}; // { title: { playstation: { gb: x, us: x, ... } } }
  const nintendoPrices = {};   // { title: { gb: '£x', us: '$x', ... } }
  const xboxPrices = {};       // { title: { 'en-gb': { price: '£x' }, ... } }

  // Fetch per region
  for (const [country, regionInfo] of Object.entries(REGIONS)) {
    console.log(`\n  🌍 Fetching prices for region: ${country.toUpperCase()}...`);

    const CHUNK_SIZE = 100;
    for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
      const chunk = gameIds.slice(i, i + CHUNK_SIZE);

      try {
        const data = await fetchJSON(
          `https://api.isthereanydeal.com/games/prices/v3?key=${ITAD_API_KEY}&country=${country.toUpperCase()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chunk)
          }
        );

        for (const gamePrice of data) {
          const title = titleById[gamePrice.id];
          if (!title) continue;

          // Find prices for each platform
          const deals = gamePrice.deals || [];

          // --- STEAM ---
          const steamDeal = deals.find(d => d.shop?.id === SHOP_IDS.steam);
          if (steamDeal) {
            const game = Object.values(itadIds).includes(gamePrice.id)
              ? Object.entries(itadIds).find(([, id]) => id === gamePrice.id)?.[0]
              : null;
            // Find Steam App ID for this game
            // We'll key by title for now and fix below
            if (!steamPrices[title]) steamPrices[title] = {};
            steamPrices[title][country] = steamDeal.price?.amount ?? null;
          }

          // --- PLAYSTATION ---
          const psDeal = deals.find(d => d.shop?.id === SHOP_IDS.playstation);
          if (!playstationPrices[title]) playstationPrices[title] = { playstation: {} };
          playstationPrices[title].playstation[country] = psDeal?.price?.amount ?? null;

          // --- NINTENDO ---
          const ninDeal = deals.find(d => d.shop?.id === SHOP_IDS.nintendo);
          if (!nintendoPrices[title]) nintendoPrices[title] = {};
          if (ninDeal?.price?.amount !== undefined) {
            nintendoPrices[title][country] = formatNintendoPrice(ninDeal.price.amount, country);
          }

          // --- XBOX ---
          const xboxDeal = deals.find(d => d.shop?.id === SHOP_IDS.xbox);
          if (!xboxPrices[title]) xboxPrices[title] = {};
          if (xboxDeal?.price?.amount !== undefined) {
            xboxPrices[title][regionInfo.xboxLocale] = {
              price: formatXboxPrice(xboxDeal.price.amount, country),
              originalPrice: xboxDeal.regular?.amount
                ? formatXboxPrice(xboxDeal.regular.amount, country)
                : null
            };
          }
        }

        await sleep(500);
      } catch (err) {
        console.error(`  ❌ Price fetch failed for ${country}: ${err.message}`);
      }
    }
  }

  return { steamPrices, playstationPrices, nintendoPrices, xboxPrices };
}

// ============================================================
// STEP 4: Format Steam prices keyed by App ID
// ============================================================

function formatSteamOutput(steamPrices, games, itadIds) {
  const output = {};

  for (const [title, countryPrices] of Object.entries(steamPrices)) {
    const appId = games[title]?.steamAppId;
    if (!appId) continue;

    output[String(appId)] = {};
    for (const [country, amount] of Object.entries(countryPrices)) {
      if (amount === null) continue;
      output[String(appId)][country] = formatSteamPrice(amount, country);
    }
  }

  return output;
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
    // Load game catalogue
    const games = await loadGames();

    // Get ITAD IDs
    const itadIds = await lookupItadIds(games);

    // Fetch prices
    const { steamPrices, playstationPrices, nintendoPrices, xboxPrices } = await fetchPrices(itadIds);

    // Format Steam output (keyed by App ID, not title)
    const steamOutput = formatSteamOutput(steamPrices, games, itadIds);

    // Write output files
    console.log('\n📝 Writing price files...');

    fs.writeFileSync('steamPrices_multi.json', JSON.stringify(steamOutput, null, 2));
    console.log(`✅ steamPrices_multi.json (${Object.keys(steamOutput).length} games)`);

    fs.writeFileSync('playstation-prices.json', JSON.stringify(playstationPrices, null, 2));
    console.log(`✅ playstation-prices.json (${Object.keys(playstationPrices).length} games)`);

    fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(nintendoPrices, null, 2));
    console.log(`✅ dekudeals_prices_all_regions.json (${Object.keys(nintendoPrices).length} games)`);

    fs.writeFileSync('xboxPrices.json', JSON.stringify(xboxPrices, null, 2));
    console.log(`✅ xboxPrices.json (${Object.keys(xboxPrices).length} games)`);

    console.log('\n🎉 All price files updated successfully!');

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
