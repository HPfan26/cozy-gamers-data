const puppeteer = require('puppeteer');
const fs = require('fs');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- add below delay(ms) ---
async function navigateWithRetries(page, url) {
  const plans = [
    { waitUntil: 'domcontentloaded', timeout: 45000 },
    { waitUntil: 'load',             timeout: 65000 },
    { waitUntil: 'networkidle2',     timeout: 70000 },
  ];

  for (const plan of plans) {
    try {
      const resp = await page.goto(url, plan);
      return { ok: true, resp };
    } catch (e) {
      // Only swallow *navigation timeout*; rethrow other errors
      if (!/Navigation timeout/i.test(e.message)) {
        return { ok: false, error: e };
      }
      await delay(800); // brief backoff before next plan
    }
  }

  // Hard reset the page so we don't keep a wedged state
  try { await page.goto('about:blank', { timeout: 10000 }); } catch {}
  return { ok: false, error: new Error('nav-timeout-after-retries') };
}

// tolerate ps_product being either game.regions.ps_product or game.ps_product
function getRegionProductId(game, effectiveRegion, fallbackRegions = fallbackToUkProductRegions) {
  const inRegions = game.regions?.ps_product?.[effectiveRegion];
  const topLevel  = game.ps_product?.[effectiveRegion];
  const fallback  = fallbackRegions.includes(effectiveRegion)
    ? (game.regions?.ps_product?.uk ?? game.ps_product?.uk)
    : null;
  return inRegions ?? topLevel ?? fallback ?? null;
}

const regions = {
  us: 'en-us',
  gb: 'en-gb',
  de: 'de-de',
  fr: 'fr-fr',
  au: 'en-au',
  pt: 'pt-pt',
  es: 'es-es',
  br: 'pt-br',
  ca: 'en-ca',
  se: 'sv-se',
  in: 'en-in',
  nl: 'nl-nl',
  pl: 'pl-pl',
  th: 'th-th',
  dk: 'da-dk',
  ph: 'en-ph',
  cz: 'cs-cz',
  hu: 'hu-hu',
  za: 'en-za',
  mx: 'es-mx',
  fi: 'fi-fi'
};

const games = [
  {
  title: 'Stardew Valley',
  regions: {
    ps_concept: '227229',
    ps_product: {
      uk: 'EP2319-CUSA26625_00-2010147637670638',
      de: 'EP2319-CUSA26625_00-2010147637670638',
      fr: 'EP2319-CUSA26625_00-2010147637670638',
      au: 'EP2319-CUSA26625_00-2010147637670638',
      pt: 'EP2319-CUSA26625_00-2010147637670638',
      es: 'EP2319-CUSA26625_00-2010147637670638',
      se: 'EP2319-CUSA26625_00-2010147637670638',
      in: 'EP2319-CUSA26625_00-2010147637670638',
      nl: 'EP2319-CUSA26625_00-2010147637670638',
      pl: 'EP2319-CUSA26625_00-2010147637670638',
      th: 'EP2319-CUSA26625_00-2010147637670638',
      dk: 'EP2319-CUSA26625_00-2010147637670638',
      ph: 'EP2319-CUSA26625_00-2010147637670638',
      cz: 'EP2319-CUSA26625_00-2010147637670638',
      hu: 'EP2319-CUSA26625_00-2010147637670638',
      za: 'EP2319-CUSA26625_00-2010147637670638',
      fi: 'EP2319-CUSA26625_00-2010147637670638'
    }
  }
},
  {
title: 'Palia',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Fae Farm',
    regions: {
      ps_concept: '10010439'
    }
  },
{
title: 'Dinkum',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Trash Goblin',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Dredge',
    regions: {
      ps_concept: '10005693'
    }
  },
{
title: 'Tiny Glade',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Reka',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Wanderstop',
    regions: {
      ps_concept: '10011513'
    }
  },
{
title: 'A Little to the Left',
    regions: {
      ps_concept: '10008945'
    }
  },
{
title: 'Spilled!',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Toem',
    regions: {
      ps_concept: '10003267'
    }
  },
{
title: 'Paper Trail',
    regions: {
      ps_concept: '10009251'
    }
  },
{
title: 'Love, Ghostie',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Little Kitty, Big City',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Cozy Caravan',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Hello Kitty Island Adventure',
    regions: {
      ps_concept: '10008904'
    }
  },
{
title: 'Minami Lane',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Critter Cove',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Sugardew Island',
    regions: {
      ps_concept: '10011535'
    }
  },
{
title: 'Lonesome Village',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Lake',
    regions: {
      ps_concept: '10003149'
    }
  },
{
title: 'Fruitbus',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Tavern Talk',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Book Bound',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Cozy Grove',
    regions: {
      ps_concept: '10002088'
    }
  },
{
title: 'Wylde Flowers',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Lil Gator Game',
    regions: {
      ps_concept: '10008374'
    }
  },
{
title: 'A Short Hike',
    regions: {
      ps_concept: '10003019'
    }
  },
{
title: 'Cat Cafe Manager',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Dancing Pandas: Rangers Path',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Space Sprouts',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Spiritfarer',
    regions: {
      ps_concept: '10000752'
    }
  },
{
title: 'Animal Crossing: New Horizons',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'The Sims 2',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'The Sims 3',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'The Sims 4',
    regions: {
      ps_concept: '228857'
    }
  },
{
title: 'inZOI',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'My Time at Portia',
    regions: {
      ps_concept: '231112'
    }
  },
{
title: 'My Time at Sandrock',
    regions: {
      ps_concept: '10007685'
    }
  },
{
title: 'Ooblets',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Firewatch',
    regions: {
      ps_concept: '216211'
    }
  },
{
title: 'Mini Motorways',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Cities: Skylines',
    regions: {
      ps_concept: '10005732'
    }
  },
{
title: 'Fields of Mistria',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Sky: Children of the Light',
    regions: {
      ps_concept: '10004206'
    }
  },
{
title: 'Infinity Nikki',
    regions: {
      ps_concept: '10004842'
    }
  },
{
title: 'Unpacking',
    regions: {
      ps_concept: '10004687'
    }
  },
{
title: 'Strange Horticulture',
    regions: {
      ps_concept: '10009589'
    }
  },
{
title: 'Disney Dreamlight Valley',
    regions: {
      ps_concept: '10002466'
    }
  },
{
title: 'Coffee Talk',
    regions: {
      ps_concept: '234471'
    }
  },
{
title: 'Call of Boba',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Spirit of the North',
    regions: {
      ps_concept: '10001854'
    }
  },
{
title: 'Neva',
    regions: {
      ps_concept: '10008521'
    }
  },
{
title: 'Wytchwood',
    regions: {
      ps_concept: '10003146'
    }
  },
{
title: 'Lemon Cake',
    regions: {
      ps_concept: '10004988'
    }
  },
{
  title: 'Paleo Pines',
  regions: {
    ps_concept: '10005927'
  },
  ps_product: {
    ca: 'UP2080-PPSA10795_00-PALEOPINESP5US00'  
  } 
},  
{
title: 'Cult of the Lamb',
    regions: {
      ps_concept: '10004484'
    }
  },
{
title: 'Sun Haven',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Roots of Pacha',
    regions: {
      ps_concept: '10008955'
    }
  },
{
title: 'Coral Island',
    regions: {
      ps_concept: '10008698'
    }
  },
{
title: 'Potion Permit',
    regions: {
      ps_concept: '10002179'
    }
  },
{
title: 'Littlewood',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Potion Craft',
    regions: {
      ps_concept: '10005918'
    }
  },
{
title: 'Slime Rancher',
    regions: {
      ps_concept: '231868'
    }
  },
{
title: 'Slime Rancher 2',
    regions: {
      ps_concept: '10009803'
    }
  },
{
title: 'The Cosmic Wheel Sisterhood',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'Graveyard Keeper',
    regions: {
      ps_concept: '231092'
    }
  },
{
title: 'Planet Zoo',
    regions: {
      ps_concept: '10009025'
    }
  },
{
title: 'Planet Coaster',
    regions: {
      ps_concept: '235039'
    }
  },
{
title: 'Planet Coaster 2',
    regions: {
      ps_concept: '10009610'
    }
  },
{
title: 'House Flipper',
    regions: {
      ps_concept: '10000044'
    }
  },
{
title: 'House Flipper 2',
    regions: {
      ps_concept: '10006545'
    }
  },
{
title: 'TCG Card Shop Simulator',
    regions: {
      ps_concept: 'null'
    }
  },
{
title: 'PowerWash Simulator',
    regions: {
      ps_concept: '10003654'
    }
  },
{
title: 'Dave the Diver',
    regions: {
      ps_concept: '10009413'
    }
  },
{
title: 'Two Point Hospital',
    regions: {
      ps_concept: '234969'
    }
  },
{
title: 'Two Point Campus',
    regions: {
      ps_concept: '10001458'
    }
  },
{
title: 'Two Point Museum',
    regions: {
      ps_concept: '10009660'
    }
  },
{
title: 'Frog Detective',
    regions: {
      ps_concept: '10004552'
    }
  },
{
title: 'Venba',
    regions: {
      ps_concept: '10004312'
    }
  },
{
title: 'Untitled Goose Game',
    regions: {
      ps_concept: '10000039'
    }
  },
{
title: 'Hogwarts Legacy',
    regions: {
      ps_concept: '232447'
    }
  },
{
title: 'Botany Manor',
    regions: {
      ps_concept: '10004416'
    }
  },
{
title: 'Monument Valley',
    regions: {
      ps_concept: '10013177'
    }
  },
{
title: 'Monument Valley 2',
    regions: {
      ps_concept: '10013172'
    }
  },
{
title: 'Journey',
    regions: {
      ps_concept: '202276'
    }
  },
{
title: 'ABZU',
    regions: {
      ps_concept: '221659'
    }
  },
{
  title: 'Caravan SandWitch',
  regions: {
    ps_concept: '10010538'
  }
}
];

const fallbackToUkProductRegions = ['gb', 'ph', 'hu'];

/** Build PS URL preferring product id, else concept id */
function getPlayStationUrl(regionCode, game) {
  const regionPath = regions[regionCode];
  const conceptId = game.regions.ps_concept;

  const productId =
    game.regions.ps_product?.[regionCode] ||
    (fallbackToUkProductRegions.includes(regionCode) ? game.regions.ps_product?.uk : null);

  if (productId) {
    return `https://store.playstation.com/${regionPath}/product/${productId}`;
  }
  if (conceptId && conceptId !== 'null') {
    return `https://store.playstation.com/${regionPath}/concept/${conceptId}`;
  }
  return null;
}

/** Make price parsing resilient to commas, spaces, currency symbols */
function cleanPriceTextToNumber(priceText) {
  if (!priceText) return null;
  // Normalize non-breaking spaces, narrow spaces, etc.
  const t = priceText.replace(/\s+/g, ' ').trim();
  // Replace decimal comma with dot if present and keep digits + dot
  const normalized = t
    .replace(/[^\d,.\-]/g, '')      // strip currency and letters
    .replace(/(\d)[\s](\d)/g, '$1$2') // remove thousand separators as spaces
    .replace(/,(\d{2})$/, '.$1')    // ...99 -> .99 (decimal comma)
    .replace(/\.(?=.*\.)/g, '');    // drop thousands dots, keep last decimal
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

/** Try to extract a display price from __NEXT_DATA__ */
async function extractFromNextData(page) {
  try {
    const raw = await page.$eval('script#__NEXT_DATA__', el => el.textContent);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const text = JSON.stringify(data).toLowerCase();

    // Common fields seen across variants
    const displayPrice =
      text.match(/"displayprice"\s*:\s*"([^"]+)"/)?.[1] ||
      text.match(/"finalprice"\s*:\s*"([^"]+)"/)?.[1] ||
      text.match(/"price"\s*:\s*"([^"]+)"/)?.[1];

    if (displayPrice) return displayPrice;
  } catch (_) {}
  return null;
}

/** Try to extract a price from JSON-LD offers */
async function extractFromJsonLd(page) {
  try {
    const blocks = await page.$$eval('script[type="application/ld+json"]', nodes =>
      nodes.map(n => n.textContent).filter(Boolean)
    );
    for (const b of blocks) {
      try {
        const obj = JSON.parse(b);
        const offers = Array.isArray(obj.offers) ? obj.offers : obj.offers ? [obj.offers] : [];
        for (const o of offers) {
          const price = o.price || o.priceSpecification?.price || o.lowPrice || o.highPrice;
          if (price) return String(price);
        }
      } catch {}
    }
  } catch (_) {}
  return null;
}

/** Flexible CSS fallback (don’t hardcode offer index) */
async function extractFromCss(page) {
  const selectors = [
    // any CTA final price
    '[data-qa$="#finalPrice"]',
    '[data-qa*="finalPrice"]',
    '[data-qa="price"]',
    '[data-qa*="displayPrice"]',
    // common visible price containers
    '[class*="price"] [class*="final"], [class*="Price"] [class*="final"]',
    '[data-qa*="mfeCtaMain"]'
  ];
  for (const sel of selectors) {
    try {
      const txt = await page.$eval(sel, el => el.textContent && el.textContent.trim());
      if (txt) return txt;
    } catch {}
  }
  return null;
}

/** Some locales need consent click before price exists */
async function handleConsent(page) {
  // Common OneTrust + generic “Accept” buttons
  const selectors = [
    '#onetrust-accept-btn-handler',
    'button[aria-label*="Accept" i]',
    'button[aria-label*="Agree" i]'
  ];

  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 1200 });
      await page.click(sel);
      await delay(300);
      return;
    } catch {}
  }

  // Fallback: click any button whose text looks like “accept/agree/ok/aceptar/aceitar/accepter”
  try {
    await page.evaluate(() => {
      const texts = /^(accept|agree|ok|got it|aceptar|aceitar|accepter|zustimmen|akzeptieren)$/i;
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => texts.test(b.textContent?.trim() || ''));
      btn?.click();
    });
    await delay(300);
  } catch {}
}

/** Return {status: 'ok'|'unavailable'|'not_found', priceText?: string, url: string} */
async function getPSPrice(page, localePath) {
  await handleConsent(page);

  const urlNow = page.url();
  const localeOk = urlNow.includes(`/${localePath}/`);
  if (!localeOk) {
    // Redirected to another locale or error page
    return { status: 'unavailable', url: urlNow, reason: 'redirect_or_error' };
  }

  // 1) Try Next.js payload
  let priceText = await extractFromNextData(page);
  if (!priceText) {
    // 2) Try JSON-LD
    priceText = await extractFromJsonLd(page);
  }
  if (!priceText) {
    // 3) CSS fallback
    priceText = await extractFromCss(page);
  }

  // Detect free-to-play before giving up
  if (!priceText || /^free/i.test(priceText.trim())) {
    const pageText = await page.evaluate(() => document.body.innerText);
    if (/free to play|free-to-play|play for free|download free/i.test(pageText)) {
      return { status: 'free', url: urlNow };
    }
  }

  if (!priceText) {
    // 4) Check if CTA exists at all; if not, mark unavailable
    const hasCta = await page.$('[data-qa*="cta"], [data-qa*="addToCart"], [data-qa*="mfeCtaMain"]');
    return hasCta
      ? { status: 'not_found', url: urlNow }
      : { status: 'unavailable', url: urlNow, reason: 'no_cta' };
  }

  return { status: 'ok', url: urlNow, priceText };
}

/** Main runner */
async function run() {
  const result = {};
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    // Reuse a single page with locale-specific Accept-Language per navigation
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );

    for (const game of games) {
      result[game.title] = { playstation: {} };

      for (const region of Object.keys(regions)) {
        if (region === 'th') continue; // your known skip
        const effectiveRegion = ['ph', 'hu'].includes(region) ? 'gb' : region; // keep your fallback
        const localePath = regions[effectiveRegion];

        const url = getPlayStationUrl(effectiveRegion, game);
        if (!url) continue;

        console.log(`🔍 Checking ${game.title} [${region}] → ${url}`);

        // Set language header matching the URL locale *before* goto
        await page.setExtraHTTPHeaders({
            'Accept-Language': `${localePath},en;q=0.8`
        });

        let priceNumber = null;
        let attempts = 0;
        const maxAttempts = 2; // quick retry handles transient hydration

        while (attempts <= maxAttempts && priceNumber === null) {
          attempts++;
          try {
              const nav = await navigateWithRetries(page, url);
              if (!nav.ok) {
                console.warn(`⏱️ Navigation kept timing out → skipping ${url}`);
                break; // stop retrying this region
              }

              // small hydration pause for locales that lazy-render price
              await delay(800);

            const res = await getPSPrice(page, localePath);
            if (res.status === 'free') {
              result[game.title].playstation[region] = 0;
              console.log(`✅ ${game.title} [${region}] = Free`);
              break;
            } else if (res.status === 'ok') {
              priceNumber = cleanPriceTextToNumber(res.priceText);
              if (priceNumber !== null) {
                result[game.title].playstation[region] = priceNumber;
                console.log(`✅ ${game.title} [${region}] = ${priceNumber}`);
                break;
              } else {
                console.warn(`⚠️ Parsed price text but failed to normalize: "${res.priceText}"`);
              }
            } else if (res.status === 'unavailable') {
              console.warn(`🚫 ${game.title} [${region}] unavailable (${res.reason || 'unknown'})`);
              break; // no point retrying
            } else {
              // not_found → try once more; DOM variant may flip
              if (attempts <= maxAttempts) {
                  await delay(600);
              }
            }
          } catch (err) {
            if (attempts > maxAttempts) {
              console.error(`❌ ${game.title} [${region}] error: ${err.message}`);
            } else {
                await delay(600);
            }
          }
        }
      }
    }

    fs.writeFileSync('playstation-prices.json', JSON.stringify(result, null, 2));
    console.log('✅ Prices saved to playstation-prices.json');
  } finally {
    await browser.close();
  }
}

run();
