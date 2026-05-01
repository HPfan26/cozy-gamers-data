const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const gameList = [
  {
      title: 'Stardew Valley',
        slug: {
          default: 'stardew-valley',
          'th-th': 'stardew-valley',
          'en-ph': 'stardew-valley'
        },
      productId: {
      default: 'C3D891Z6TNQM',
          'th-th': '9mwr1nc6vq6l',
          'en-ph': '9MWR1NC6VQ6L/0010'
      }
  },
  {
    title: 'Fae Farm',
    slug: 'fae-farm',
    productId: '9N0QS2277QHF'
  },
  {
    title: 'Dredge',
      slug: {
      default: 'dredge',
          'pl-pl': 'dredge'
      },
      productId: {
      default: '9msvvm5ns9l6',
          'pl-pl': '9MSVVM5NS9L6'
      }
  },
  {
    title: 'Wanderstop',
    slug: 'wanderstop',
    productId: '9p2195r38k3j'
  },
  {
    title: 'A Little to the Left',
    slug: 'a-little-to-the-left',
    productId: '9nlddf97gtj0'
  },
  {
    title: 'Toem',
    slug: 'toem',
    productId: '9n7zcllr01b3'
  },
  {
    title: 'Paper Trail',
    slug: 'paper-trail',
    productId: '9p4xm3tj13qm'
  },
  {
    title: 'Little Kitty, Big City',
    slug: 'little-kitty-big-city',
    productId: '9nf5s7mlm8xt'
  },
  {
    title: 'Lonesome Village',
    slug: 'lonesome-village',
    productId: '9P8ND0L4CXPR'
  },
  {
    title: 'Lake',
    slug: 'lake',
    productId: '9n5glftt40sn'
  },
  {
      title: 'Cozy Grove',
       slug: {
         default: 'cozy-grove',
         'th-th': 'cozy-grove-new-neighbears-bundle',
         'en-ph': 'cozy-grove-new-neighbears-bundle'
       },
      productId: {
      default: '9pjcc91cz3wn',
          'th-th': '9P481LTRXR7N',
          'en-ph': '9P481LTRXR7N'
      }
  },
  {
    title: 'Lil Gator Game',
    slug: 'lil-gator-game',
    productId: '9n4fhwk9hwdk'
  },
  {
    title: 'A Short Hike',
    slug: 'a-short-hike',
    productId: '9nk78df207sd'
  },
  {
    title: 'The Sims 4',
      slug: {
      default: 'the-sims-4',
          'th-th': 'the-sims-4-ea-play-edition',
          'en-ph': 'the-sims-4-ea-play-edition'
      },
      productId: {
      default: 'C08JXNK0VG5L',
          'th-th': '9PB5T776N2SW',
          'en-ph': '9PB5T776N2SW'
      }
  },
  {
    title: 'My Time at Portia',
      slug: {
      default: 'my-time-at-portia',
          'th-th': 'my-time-at-portia',
          'en-ph': 'my-time-at-portia'
      },
      productId: {
      default: 'bx1fzx1x4132',
          'th-th': '9nblsn1jp7th',
          'en-ph': '9nblsn1jp7th'
      }
  },
  {
    title: 'My Time at Sandrock',
    slug: 'my-time-at-sandrock',
    productId: '9nhs5p1sjhn6'
  },
  {
    title: 'Ooblets',
      slug: {
      default: 'ooblets',
          'th-th': 'ooblets',
          'en-ph': 'ooblets',
      },
      productId: {
      default: '9NB4GBLPTD0S',
          'th-th': '9NB4GBLPTD0S',
          'en-ph': '9NB4GBLPTD0S'
      },
      unavailable: ['de-de', 'fr-fr', 'pt-pt', 'es-es', 'sv-se', 'nl-nl', 'pl-pl', 'da-dk', 'cs-cz', 'hu-hu', 'fi-fi']
  },
  {
    title: 'Firewatch',
    slug: 'firewatch',
    productId: 'bqqkg9h2stc0'
  },
  {
    title: 'Cities: Skylines',
    slug: 'cities-skylines-remastered',
    productId: '9mz4gbwx9gnd'
  },
  {
    title: 'Unpacking',
    slug: 'unpacking',
    productId: '9nh5hn11fg4m'
  },
  {
    title: 'Strange Horticulture',
      slug: 'strange-horticulture',
    productId: '9mx1b2l6zm36',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Disney Dreamlight Valley',
    slug: 'disney-dreamlight-valley',
    productId: '9nsf0bgh8d86'
  },
  {
    title: 'Coffee Talk',
    slug: 'coffee-talk',
    productId: '9n17cm38wnn8'
  },
  {
    title: 'Spirit of the North',
    slug: 'spirit-of-the-north-enhanced-edition',
    productId: '9mvl42njfvz2'
  },
  {
    title: 'Neva',
    slug: 'neva',
    productId: '9n2ln3wrt82h'
  },
  {
    title: 'Wytchwood',
    slug: 'wytchwood',
    productId: '9p40fjdr9bzr'
  },
  {
    title: 'Lemon Cake',
    slug: 'lemon-cake',
    productId: '9nv9dkbpc663'
  },
  {
    title: 'Paleo Pines',
    slug: 'paleo-pines',
    productId: '9nq5z2wh4xdb',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Cult of the Lamb',
    slug: 'cult-of-the-lamb',
    productId: '9pnlpmp1ggh5'
  },
  {
    title: 'Roots of Pacha',
    slug: 'roots-of-pacha',
    productId: '9nbzz380pd19',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Coral Island',
    slug: 'coral-island',
    productId: '9n1t1mq92pvs'
  },
  {
    title: 'Potion Permit',
    slug: 'potion-permit',
    productId: '9njlqw4xl3mw',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Potion Craft',
    slug: 'potion-craft-alchemist-simulator',
    productId: '9mw7wd7j3ppk'
  },
  {
    title: 'Slime Rancher',
    slug: 'slime-rancher',
    productId: 'c2nc88m7nwz1'
  },
  {
    title: 'Slime Rancher 2',
    slug: 'slime-rancher-2',
    productId: '9phfj0n31nv1'
  },
  {
    title: 'Graveyard Keeper',
      slug: {
      default: 'graveyard-keeper',
          'th-th': 'graveyard-keeper-last-journey-edition',
          'en-in': 'graveyard-keeper-last-journey-edition',
          'en-ph': 'graveyard-keeper-last-journey-edition'
      },
      productId: {
      default: 'c11gzgmkrtcv',
          'en-in': 'c11gzgmkrtcv',
          'th-th': '9PPJV0ZDBSKT',
          'en-ph': '9PPJV0ZDBSKT'
      }
  },
  {
    title: 'Planet Zoo',
    slug: 'planet-zoo-console-edition',
    productId: '9nz038kz68b7',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Planet Coaster',
    slug: 'planet-coaster-console-edition',
    productId: '9ngrx7l5nb6m',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Planet Coaster 2',
    slug: 'planet-coaster-2',
    productId: '9PK5WS0HXQKQ',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'House Flipper',
    slug: 'house-flipper',
    productId: '9nbfgkqlmv33'
  },
  {
    title: 'House Flipper 2',
    slug: 'house-flipper-2',
    productId: '9n67z2d5phw2'
  },
  {
    title: 'PowerWash Simulator',
    slug: 'powerwash-simulator',
    productId: '9nhdjc0nw20m'
  },
  {
    title: 'Two Point Hospital',
    slug: 'two-point-hospital-jumbo-edition',
    productId: '9PFK1TLLZGXD'
  },
  {
    title: 'Two Point Campus',
    slug: 'two-point-campus',
    productId: '9pcw1smn9rgg'
  },
  {
    title: 'Two Point Museum',
    slug: 'two-point-museum',
    productId: '9nfhrf1m4w3z'
  },
  {
    title: 'Frog Detective',
    slug: 'frog-detective-the-entire-mystery',
    productId: '9n0m3gvb0knn'
  },
  {
    title: 'Venba',
    slug: 'venba',
    productId: '9p5p55s7hb9s'
  },
  {
    title: 'Untitled Goose Game',
    slug: 'untitled-goose-game',
    productId: '9mvtctdthh23'
  },
  {
    title: 'Hogwarts Legacy',
    slug: 'hogwarts-legacy-xbox-series-x-s-version',
    productId: '9mt5nj5w7b8z',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Botany Manor',
    slug: 'botany-manor',
    productId: '9mzt90b954xf'
  },
  {
    title: 'Monument Valley',
    slug: 'monument-valley',
    productId: '9nt17x2mr55h',
      unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'Monument Valley 2',
    slug: 'monument-valley-2',
    productId: '9ntxjp9733wk',
    unavailable: ['th-th', 'en-ph']
  },
  {
    title: 'ABZU',
      slug: {
      default: 'abzu',
          'th-th': 'abzu',
          'en-ph': 'abzu'
      },
      productId: {
      default: 'bq2307m831zg',
          'th-th': '9PNLF7RLZRVV',
          'en-ph': '9PNLF7RLZRVV'
      }
  },
  {
    title: 'Spiritfarer',
    slug: 'spiritfarer-farewell-edition',
    productId: '9ng5l58fd3x5'
  }
];

// Xbox.com uses locale codes, not ISO country codes
const regions = ['en-us', 'en-gb', 'de-de', 'fr-fr', 'en-au', 'en-ca', 'pt-pt', 'es-es', 'pt-br', 'sv-se', 'en-in', 'nl-nl', 'pl-pl', 'th-th', 'da-dk', 'en-ph', 'cs-cz', 'hu-hu', 'en-za', 'es-mx', 'fi-fi'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Prevent redirects
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  const results = {};

  for (const game of gameList) {
    results[game.title] = {};

      for (const region of regions) {
          if (game.unavailable && game.unavailable.includes(region)) {
            console.warn(`🚫 Skipping ${game.title} in ${region} (marked unavailable)`);
            results[game.title][region] = 'unavailable';
            continue; // Skip to the next region
          }
          const slug = typeof game.slug === 'object' ? game.slug[region] || game.slug.default : game.slug;
          const productId = typeof game.productId === 'object' ? game.productId[region] || game.productId.default : game.productId;
          const url = `https://www.xbox.com/${region}/games/store/${slug}/${productId}`;
        const page = await browser.newPage();

        try {
          console.log(`Scraping ${game.title} in ${region}: ${url}`);
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

          if (!response || !response.ok()) {
            throw new Error(`Bad response: ${response?.status()}`);
          }

          await page.waitForSelector('button', { timeout: 45000 });
          await new Promise(resolve => setTimeout(resolve, 5000));

          const debugLabels = await page.evaluate(() =>
            Array.from(document.querySelectorAll('button'))
              .map(btn => btn.getAttribute('aria-label'))
              .filter(Boolean)
          );

          console.log(`🕵️ Found ${debugLabels.length} buttons for ${game.title} in ${region}`);
          console.log(debugLabels);

          const priceData = await page.evaluate(() => {
            const priceElement = document.querySelector('.AcquisitionButtons-module__listedPrice___PS6Zm');

            if (priceElement) {
              const text = priceElement.innerText.trim();
              return {
                price: text || null,
                originalPrice: null
              };
            }

            return {
              price: null,
              originalPrice: null
            };
          });

          results[game.title][region] = priceData;

          if (!priceData.price) {
            console.warn(`⚠️ No price found for ${game.title} in ${region}`);
          }

        } catch (err) {
          console.warn(`❌ Failed to scrape ${game.title} in ${region}: ${err.message}`);
          results[game.title][region] = null;
        } finally {
          await page.close(); // ✅ Close the page regardless of success/failure
        }
      }
  }

  await browser.close();
  fs.writeFileSync('xboxPrices.json', JSON.stringify(results, null, 2));
  console.log('✅ Scraping complete. Results saved to xboxPrices.json');
})();
