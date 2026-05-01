// ============================================================
// SWITCH PRICE SCRAPER - DEKUDEALS METHOD
// Scrapes DekuDeals.com for Nintendo Switch prices
// Filtered to: GB, US, CA, AU, PT
// ============================================================

const puppeteer = require('puppeteer');
const fs = require('fs');

const targetCountries = {
  gb: 'United Kingdom',
  us: 'United States',
  ca: 'Canada',
  au: 'Australia',
  pt: 'Portugal',
};

const games = [
  { title: 'Stardew Valley', slug: 'stardew-valley' },
  { title: 'Fae Farm', slug: 'fae-farm' },
  { title: 'Palia', slug: 'palia' },
  { title: 'Dredge', slug: 'dredge' },
  { title: 'A Little to the Left', slug: 'a-little-to-the-left' },
  { title: 'Toem', slug: 'toem' },
  { title: 'Paper Trail', slug: 'paper-trail' },
  { title: 'Little Kitty, Big City', slug: 'Little-Kitty-Big-City' },
  { title: 'Hello Kitty Island Adventure', slug: 'Hello-Kitty-Island-Adventure' },
  { title: 'Minami Lane', slug: 'Minami-Lane' },
  { title: 'Sugardew Island', slug: 'Sugardew-Island' },
  { title: 'Lonesome Village', slug: 'Lonesome-Village' },
  { title: 'Lake', slug: 'Lake' },
  { title: 'Tavern Talk', slug: 'Tavern-Talk' },
  { title: 'Cozy Grove', slug: 'Cozy-Grove' },
  { title: 'Wylde Flowers', slug: 'Wylde-Flowers' },
  { title: 'Lil Gator Game', slug: 'Lil-Gator-Game' },
  { title: 'A Short Hike', slug: 'A-Short-Hike' },
  { title: 'Cat Cafe Manager', slug: 'Cat-Cafe-Manager' },
  { title: 'Spiritfarer', slug: 'Spiritfarer-Farewell-Edition' },
  { title: 'Animal Crossing: New Horizons', slug: 'Animal-Crossing-New-Horizons' },
  { title: 'My Time at Portia', slug: 'My-Time-at-Portia' },
  { title: 'Disney Dreamlight Valley', slug: 'Disney-Dreamlight-Valley' },
  { title: 'Coffee Talk', slug: 'Coffee-Talk' },
  { title: 'Spirit of the North', slug: 'Spirit-of-the-North' },
  { title: 'Neva', slug: 'neva' },
  { title: 'Wytchwood', slug: 'Wytchwood' },
  { title: 'Lemon Cake', slug: 'Lemon-Cake' },
  { title: 'Paleo Pines', slug: 'Paleo-Pines' },
  { title: 'Cult of the Lamb', slug: 'Cult-of-the-Lamb' },
  { title: 'Roots of Pacha', slug: 'Roots-of-Pacha' },
  { title: 'Potion Permit', slug: 'Potion-Permit-Complete-Edition' },
  { title: 'Littlewood', slug: 'Littlewood' },
  { title: 'Potion Craft', slug: 'potion-craft-alchemist-simulator' },
  { title: 'Slime Rancher', slug: 'slime-rancher-plortable-edition' },
  { title: 'Graveyard Keeper', slug: 'Graveyard-Keeper' },
  { title: 'House Flipper', slug: 'House-Flipper' },
  { title: 'PowerWash Simulator', slug: 'PowerWash-Simulator' },
  { title: 'Dave the Diver', slug: 'DAVE-THE-DIVER' },
  { title: 'Two Point Hospital', slug: 'Two-Point-Hospital-JUMBO-Edition' },
  { title: 'Two Point Campus', slug: 'Two-Point-Campus' },
  { title: 'Frog Detective', slug: 'Frog-Detective-The-Entire-Mystery' },
  { title: 'Venba', slug: 'Venba' },
  { title: 'Untitled Goose Game', slug: 'Untitled-Goose-Game' },
  { title: 'Hogwarts Legacy', slug: 'Hogwarts-Legacy' },
  { title: 'Botany Manor', slug: 'Botany-Manor' },
  { title: 'Monument Valley', slug: 'Monument-Valley' },
  { title: 'Monument Valley 2', slug: 'Monument-Valley-2' },
  { title: 'ABZU', slug: 'ABZU' },
  { title: 'Strange Horticulture', slug: 'Strange-Horticulture' },
  { title: 'Unpacking', slug: 'Unpacking' },
  { title: 'Caravan SandWitch', slug: 'caravan-sandwitch' },
  { title: 'Firewatch', slug: 'firewatch' },
  { title: 'Ooblets', slug: 'ooblets' },
];

const countryNameToCode = Object.fromEntries(
  Object.entries(targetCountries).map(([code, name]) => [name, code])
);
const targetCountryNames = Object.values(targetCountries);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  const results = {};

  for (const game of games) {
    const url = `https://www.dekudeals.com/items/${game.slug}`;
    console.log(`🔍 Scraping ${game.title} from ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.region-prices', { timeout: 15000 });

      const prices = await page.evaluate((targetCountryNames) => {
        const regionPrices = {};
        const cards = document.querySelectorAll('.region-price-card');
        cards.forEach(card => {
          const country = card.querySelector('.country-name')?.innerText?.trim();
          const price = card.querySelector('.price')?.innerText?.trim();
          if (country && price && targetCountryNames.includes(country)) {
            regionPrices[country] = price;
          }
        });
        return regionPrices;
      }, targetCountryNames);

      // Convert country names to country codes
      results[game.title] = {};
      for (const [countryName, price] of Object.entries(prices)) {
        const code = countryNameToCode[countryName];
        if (code) results[game.title][code] = price;
      }

      console.log(`✅ ${Object.keys(results[game.title]).length} prices found for ${game.title}`);
    } catch (err) {
      console.error(`❌ Error fetching ${game.title}:`, err.message);
      results[game.title] = {};
    }

    await new Promise(res => setTimeout(res, 1500));
  }

  await browser.close();
  fs.writeFileSync('dekudeals_prices_all_regions.json', JSON.stringify(results, null, 2));
  console.log('💾 Switch prices saved to dekudeals_prices_all_regions.json');
})();
