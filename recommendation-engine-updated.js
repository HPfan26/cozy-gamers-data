// ============================================================
// COZY GAMERS RECOMMENDATION ENGINE
// Game data is now fetched from GitHub - to add or edit games,
// update: https://github.com/HPfan26/cozy-gamers-data/blob/main/games.json
// ============================================================

let activeFilters = [];
let steamPrices = {};
let playstationPrices = {};
let nintendoPrices = {};
let xboxPrices = {};
let gameData = {}; // Now loaded from GitHub

const platformList = ['steam', 'switch', 'playstation', 'xbox'];

const PS_PLUS_LOGO   = "https://www.thecozygamers.com/wp-content/uploads/2025/09/PS-Plus-Logo-1.png";
const GAME_PASS_LOGO = "https://www.thecozygamers.com/wp-content/uploads/2025/09/Game-Pass-Logo-1.png";

const formatCurrency = (amount, localeCode, currencyCode) => {
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
};

const currencyFromCountry = (code) => {
  const map = {
    us: 'USD', gb: 'GBP', de: 'EUR', fr: 'EUR', au: 'AUD', ca: 'CAD',
    pt: 'EUR', es: 'EUR', br: 'BRL', se: 'SEK', in: 'INR', nl: 'EUR',
    pl: 'PLN', th: 'THB', dk: 'DKK', ph: 'PHP', cz: 'CZK', hu: 'HUF',
    za: 'ZAR', mx: 'MXN', fi: 'EUR'
  };
  return map[code.toLowerCase()] || 'USD';
};

let userCountryCode = 'uk';
let userLocaleCode = 'en-uk';
let showRegionalPrices = false;

// ============================================================
// LOAD ALL DATA IN PARALLEL
// ============================================================
document.addEventListener("DOMContentLoaded", function () {

  // Show a loading state while data fetches
  document.getElementById("game-results").innerHTML = `<p class="loading-message">Loading games...</p>`;

  const gamesUrl        = 'https://raw.githubusercontent.com/HPfan26/cozy-gamers-data/main/games.json';
  const cacheBust       = `?v=${Date.now()}`;
const steamUrl        = `https://www.thecozygamers.com/wp-content/uploads/steamPrices_multi.json${cacheBust}`;
const steamFallbackUrl= `https://www.thecozygamers.com/wp-content/uploads/steamPrices_us.json${cacheBust}`;
const playstationUrl  = `https://www.thecozygamers.com/wp-content/uploads/playstation-prices.json${cacheBust}`;
const nintendoUrl     = `https://www.thecozygamers.com/wp-content/uploads/dekudeals_prices_all_regions.json${cacheBust}`;
const xboxUrl         = `https://www.thecozygamers.com/wp-content/uploads/xboxPrices.json${cacheBust}`;
const subscriptionsUrl= `https://www.thecozygamers.com/wp-content/uploads/subscriptions.json${cacheBust}`;

  // Detect user country first, then load everything in parallel
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      userCountryCode = data.country?.toLowerCase() || 'us';
      const lang = data.languages?.split(',')[0]?.toLowerCase() || 'en';
      userLocaleCode = `${lang}-${userCountryCode}`;
      showRegionalPrices = userCountryCode === 'gb';

      console.log("🌍 Country:", userCountryCode);
      console.log("🗣️ Locale:", userLocaleCode);
      console.log("💷 Show prices?", showRegionalPrices);
    })
    .catch(() => {
      console.warn("⚠️ Could not detect country, defaulting to US");
    })
    .finally(() => {
      // Load all data sources in parallel
      Promise.all([
        // Games data from GitHub (required)
        fetch(gamesUrl)
          .then(res => { if (!res.ok) throw new Error("Games data failed"); return res.json(); })
          .then(data => { gameData = data; console.log(`✅ Loaded ${Object.keys(data).length} games from GitHub`); }),

        // Steam prices (with fallback)
        fetch(steamUrl)
          .then(res => { if (!res.ok) throw new Error("Steam multi failed"); return res.json(); })
          .then(data => { steamPrices = data; console.log("✅ Steam prices loaded"); })
          .catch(() =>
            fetch(steamFallbackUrl)
              .then(res => res.json())
              .then(data => { steamPrices = data; console.log("✅ Steam prices loaded (US fallback)"); })
              .catch(() => console.warn("⚠️ Steam prices unavailable"))
          ),

        // PlayStation prices
        fetch(playstationUrl)
          .then(res => { if (!res.ok) throw new Error(); return res.json(); })
          .then(data => { playstationPrices = data; console.log("✅ PlayStation prices loaded"); })
          .catch(() => console.warn("⚠️ PlayStation prices unavailable")),

        // Nintendo prices
        fetch(nintendoUrl)
          .then(res => { if (!res.ok) throw new Error(); return res.json(); })
          .then(data => { nintendoPrices = data; console.log("✅ Nintendo prices loaded"); })
          .catch(() => console.warn("⚠️ Nintendo prices unavailable")),

        // Xbox prices
        fetch(xboxUrl)
          .then(res => { if (!res.ok) throw new Error(); return res.json(); })
          .then(data => { xboxPrices = data; console.log("✅ Xbox prices loaded"); })
          .catch(() => console.warn("⚠️ Xbox prices unavailable")),

        // Subscriptions
        fetch(subscriptionsUrl)
          .then(res => { if (!res.ok) throw new Error(); return res.json(); })
          .then(data => { subscriptions = data; console.log("✅ Subscriptions loaded"); })
          .catch(() => console.warn("⚠️ Subscriptions unavailable")),
      ])
      .then(() => {
        // All data loaded - clear loading state and initialise the engine
        document.getElementById("game-results").innerHTML = '';
        initEngine();
      })
      .catch(err => {
        console.error("❌ Failed to load game data:", err);
        document.getElementById("game-results").innerHTML = `
          <div class="no-results">
            <p>😔 Sorry, we couldn't load the game data. Please refresh and try again.</p>
          </div>
        `;
      });
    });
});

// ============================================================
// ENGINE INITIALISATION (previously inside DOMContentLoaded)
// ============================================================
let subscriptions = {};

function initEngine() {
  const button = document.getElementById("game-submit");
  const input = document.getElementById("game-query");

  // Sync localStorage wishlist with server (if logged in)
  if (typeof cozyGamersUserLoggedIn !== "undefined" && cozyGamersUserLoggedIn) {
    fetch("/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "action=get_user_wishlist"
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        localStorage.setItem("wishlist", JSON.stringify(data.data));
      }
    });
  }

  if (!button || !input) return;

  const toggleButton = document.getElementById("toggle-filters");
  toggleButton.addEventListener("click", function () {
    const dropdown = document.getElementById("filter-dropdown");
    const categoryContainer = document.getElementById("filter-categories");

    if (!dropdown || !categoryContainer) return;

    const isNowVisible = dropdown.style.display === "none";
    dropdown.style.display = isNowVisible ? "block" : "none";

    if (isNowVisible) {
      const allTags = Array.from(categoryContainer.querySelectorAll("input[type=checkbox]")).map(cb => cb.value.toLowerCase());
      const inputTags = document.getElementById("game-query").value.toLowerCase().split(/[\s,]+/);
      activeFilters = inputTags.filter(tag => allTags.includes(tag));
      categoryContainer.querySelectorAll("input[type=checkbox]").forEach(box => {
        box.checked = activeFilters.includes(box.value.toLowerCase());
      });
      updateFilterBar();
    }
  });

  document.getElementById("clear-filters").addEventListener("click", function () {
    activeFilters = [];
    document.querySelectorAll("#filter-categories input[type=checkbox]").forEach(cb => {
      cb.checked = false;
    });
    document.getElementById("game-query").value = "*";
    updateFilterBar();
    document.getElementById("game-submit").click();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      button.click();
    }
  });

  function updateFilterBar() {
    const filterBar = document.getElementById("filter-bar");
    if (activeFilters.length === 0) {
      filterBar.style.display = "none";
      filterBar.innerHTML = "";
      return;
    }
    filterBar.style.display = "block";
    filterBar.innerHTML = activeFilters.map(filter => `
      <span class="active-filter">
        ${filter.toUpperCase()}
        <button class="remove-filter" data-tag="${filter}">✕</button>
      </span>
    `).join("");
    document.querySelectorAll(".remove-filter").forEach(btn => {
      btn.addEventListener("click", function () {
        const tag = this.dataset.tag.toLowerCase();
        activeFilters = activeFilters.filter(f => f !== tag);
        input.value = activeFilters.join(" ");
        button.click();
      });
    });
  }

  const categoryContainer = document.getElementById("filter-categories");
  categoryContainer.querySelectorAll("input[type=checkbox]").forEach(box => {
    box.addEventListener("change", () => {
      const tag = box.value.toLowerCase();
      if (box.checked && !activeFilters.includes(tag)) {
        activeFilters.push(tag);
      } else if (!box.checked && activeFilters.includes(tag)) {
        activeFilters = activeFilters.filter(t => t !== tag);
      }
      const tagFilters = activeFilters.filter(tag => !platformList.includes(tag));
      document.getElementById("game-query").value = tagFilters.join(" ");
      updateFilterBar();
      document.getElementById("game-submit").click();
    });
  });

  button.addEventListener("click", function () {
    const userInput = input.value.trim();
    if (!userInput) return;

    updateFilterBar();

    const userWords = userInput.toLowerCase().split(/[\s,]+/);
    const stopWords = ["a", "an", "the", "i", "want", "game", "with", "and", "or", "to", "some"];
    const filteredWords = userWords.filter(word => !stopWords.includes(word));

    let matchedGames;

    if (userInput === "*") {
      matchedGames = Object.keys(gameData);
    } else {
      const platformFilters = ["steam", "switch", "playstation", "xbox"];
      const activePlatformFilters = activeFilters.filter(f => platformFilters.includes(f));
      const tagFilters = activeFilters.filter(f => !platformFilters.includes(f));

      matchedGames = Object.entries(gameData).filter(([title, game]) => {
        const gameTags = game.tags.map(tag => tag.toLowerCase());
        const gamePlatforms = Object.keys(game.stores || {});
        const hasAllTagFilters = tagFilters.every(filter => gameTags.includes(filter));
        const hasAllPlatformFilters = activePlatformFilters.every(p => gamePlatforms.includes(p));
        const matchesPlatform = activePlatformFilters.length === 0 || hasAllPlatformFilters;
        const matchesSearch = filteredWords.length === 0 || filteredWords.some(word =>
          title.toLowerCase().includes(word) ||
          gameTags.some(tag => tag.includes(word))
        );
        return hasAllTagFilters && matchesPlatform && matchesSearch;
      }).map(([title]) => title);
    }

    if (matchedGames.length === 0) {
      document.getElementById("game-results").innerHTML = `
        <div class="no-results">
          <p>😔 Sorry, we couldn't find a match for "${userInput}".</p>
          <p>Try words like: <em>farming</em>, <em>relaxing</em>, or <em>romance</em>.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="scroll-wrapper">
        <div class="card-scroll-container" id="scroll-container">
    `;

    matchedGames.forEach(title => {
      const game = gameData[title];
      const highlightedTags = game.tags.map(tag => {
        const isMatch = filteredWords.some(word => tag.toLowerCase().includes(word));
        const baseClass = "clickable-tag";
        const tagClass = isMatch ? "highlight-tag" : "normal-tag";
        return `<button class="${baseClass} ${tagClass}" data-tag="${tag}">${tag.toUpperCase()}</button>`;
      }).join('');

      const reviewLink = game.review ? `
        <div class="review-link">
          <a href="${game.review}" target="_blank">Read our review</a>
        </div>
      ` : '';

      const hubLink = game.hub ? `
        <div class="hub-link">
          <a href="${game.hub}" target="_blank">Beginner's Guide</a>
        </div>
      ` : '';

      const links = (reviewLink || hubLink) ? `
        <div class="link-row">
          ${reviewLink}
          ${hubLink}
        </div>
      ` : '';

      let subIcons = "";
      if (subscriptions[title]?.xbox_game_pass && subscriptions[title].xbox_game_pass.regions?.includes(userCountryCode)) {
        subIcons += `<img src="${GAME_PASS_LOGO}" alt="Game Pass" class="sub-icon">`;
      }
      if (subscriptions[title]?.ps_plus && subscriptions[title].ps_plus.regions?.includes(userCountryCode)) {
        subIcons += `<img src="${PS_PLUS_LOGO}" alt="PS Plus" class="sub-icon">`;
      }

      html += `
        <div class="class-card">
          <div class="card-image-container">
            <img src="${game.image}" alt="${title}">
            ${game.hub ? `<a href="${game.hub}" class="card-overlay-link" target="_blank" rel="noopener noreferrer" aria-label="Go to ${title} guide" data-game-title="${title}"></a>` : ''}
            <div class="class-overlay">
              <p class="game-title">
                <strong>${title}</strong>
                <span class="sub-icons">${subIcons}</span>
              </p>
            </div>
          </div>
          <div class="game-description">
            <p>${game.description}</p>
          </div>
          <div class="card-footer">
            <div class="store-links">
              <div class="store-price-grid">

                ${game.stores.steam ? (() => {
                  let displayPrice = "Steam";
                  if (showRegionalPrices) {
                    const rawPrice = steamPrices[String(game.steamAppId)]?.[userCountryCode];
                    if (rawPrice) {
                      displayPrice = rawPrice.toLowerCase().includes("free")
                        ? "Free"
                        : (rawPrice.startsWith("£") || rawPrice.startsWith("$") || rawPrice.startsWith("€"))
                          ? rawPrice
                          : `£${rawPrice}`;
                    }
                  }
                  return `<a href="${game.stores.steam}" target="_blank" class="store-price-button">
                    <img src="https://www.thecozygamers.com/wp-content/uploads/2025/04/steam-1.png" alt="Steam" class="store-icon">
                    <span>${displayPrice}</span>
                  </a>`;
                })() : ""}

                ${game.stores.playstation ? (() => {
                  const psPriceRaw = playstationPrices?.[title]?.playstation?.[userCountryCode];
                  let psDisplay = "PS";
                  if (showRegionalPrices) {
                    if (psPriceRaw === 0 || psPriceRaw === null) {
                      psDisplay = "Free";
                    } else if (psPriceRaw !== undefined) {
                      psDisplay = `£${psPriceRaw}`;
                    }
                  }
                  return `<a href="${game.stores.playstation}" target="_blank" class="store-price-button">
                    <img src="https://www.thecozygamers.com/wp-content/uploads/2025/04/playstation-logotype-1.png" alt="PlayStation" class="store-icon">
                    <span>${psDisplay}</span>
                  </a>`;
                })() : ""}

                ${game.stores.switch ? (() => {
                  let switchDisplay = "Switch";
                  if (showRegionalPrices) {
                    let rawPrice = nintendoPrices?.[title]?.[userCountryCode];
                    if (typeof rawPrice === 'string') {
                      rawPrice = rawPrice.replace(/\s*-?\s*\d{1,3}%.*$/, '').trim();
                    }
                    if (rawPrice === "0" || rawPrice === 0 || rawPrice?.toLowerCase() === "free") {
                      switchDisplay = "Free";
                    } else if (rawPrice !== undefined && rawPrice !== null) {
                      switchDisplay = rawPrice;
                    }
                  }
                  return `<a href="${game.stores.switch}" target="_blank" class="store-price-button">
                    <img src="https://www.thecozygamers.com/wp-content/uploads/2025/04/nintendo-switch-1.png" alt="Switch" class="store-icon">
                    <span>${switchDisplay}</span>
                  </a>`;
                })() : ""}

                ${game.stores.xbox ? (() => {
                  let xboxPriceRaw =
                    xboxPrices?.[title]?.[userLocaleCode]?.price ||
                    xboxPrices?.[title]?.[`en-${userCountryCode}`]?.price ||
                    xboxPrices?.[title]?.[userCountryCode]?.price;

                  if (typeof xboxPriceRaw === "string") {
                    xboxPriceRaw = xboxPriceRaw.replace(/\+$/, '').trim();
                  }

                  let xboxDisplay = "Xbox";
                  if (showRegionalPrices) {
                    if (xboxPriceRaw === "Free" || xboxPriceRaw === 0 || xboxPriceRaw === null) {
                      xboxDisplay = "Free";
                    } else if (typeof xboxPriceRaw === "string" && /[£$€₹R\$]|USD|INR|MXN|BRL/.test(xboxPriceRaw)) {
                      xboxDisplay = xboxPriceRaw;
                    } else if (!isNaN(xboxPriceRaw)) {
                      xboxDisplay = formatCurrency(parseFloat(xboxPriceRaw), userLocaleCode || 'en-GB', currencyFromCountry(userCountryCode));
                    }
                  }

                  let xboxUrl = game.stores.xbox;
                  const lang = 'en';
                  const userLocale = `${lang}-${userCountryCode}`;
                  if (/\/en-[a-z]{2}\//i.test(xboxUrl)) {
                    xboxUrl = xboxUrl.replace(/\/en-[a-z]{2}\//i, `/${userLocale}/`);
                  } else {
                    xboxUrl = xboxUrl.replace("www.xbox.com/", `www.xbox.com/${userLocale}/`);
                  }

                  return `<a href="${xboxUrl}" target="_blank" class="store-price-button">
                    <img src="https://www.thecozygamers.com/wp-content/uploads/2025/04/xbox-logo-1.png" alt="Xbox" class="store-icon">
                    <span>${xboxDisplay}</span>
                  </a>`;
                })() : ""}

              </div>
            </div>
            <div class="wishlist-button-row">
              <button class="wishlist-btn" data-title="${title}">
                ♡ Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    document.getElementById("game-results").innerHTML = html;

    // Wishlist logic
    let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    document.querySelectorAll(".wishlist-btn").forEach(button => {
      const gameTitle = button.dataset.title;
      if (wishlist.includes(gameTitle)) {
        button.textContent = "🤍 In Wishlist";
        button.classList.add("active");
      }
      button.addEventListener("click", () => {
        if (wishlist.includes(gameTitle)) {
          wishlist = wishlist.filter(title => title !== gameTitle);
          button.textContent = "♡ Add to Wishlist";
          button.classList.remove("active");
        } else {
          wishlist.push(gameTitle);
          button.textContent = "❤️ In Wishlist";
          button.classList.add("active");
        }
        localStorage.setItem("wishlist", JSON.stringify(wishlist));
        if (typeof cozyGamersUserLoggedIn !== "undefined" && cozyGamersUserLoggedIn) {
          fetch("/wp-admin/admin-ajax.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=save_user_wishlist&wishlist=${encodeURIComponent(JSON.stringify(wishlist))}`
          });
        }
        if (typeof plausible !== "undefined") {
          plausible("Wishlist Click", { props: { game: gameTitle } });
        }
      });
    });

    // Tag click handlers
    document.querySelectorAll(".clickable-tag").forEach(tagEl => {
      tagEl.addEventListener("click", function () {
        const tag = this.dataset.tag.toLowerCase();
        if (activeFilters.includes(tag)) {
          activeFilters = activeFilters.filter(t => t !== tag);
        } else {
          activeFilters.push(tag);
        }
        input.value = activeFilters.join(" ");
        updateFilterBar();
        button.click();
      });
    });

    // Scroll button logic
    setTimeout(() => {
      const scrollContainer = document.getElementById("scroll-container");
      const scrollLeft = document.getElementById("scroll-left");
      const scrollRight = document.getElementById("scroll-right");
      if (scrollContainer && scrollLeft && scrollRight) {
        scrollLeft.addEventListener("click", () => scrollContainer.scrollBy({ left: -300, behavior: "smooth" }));
        scrollRight.addEventListener("click", () => scrollContainer.scrollBy({ left: 300, behavior: "smooth" }));
      }
    }, 0);

    // Card click tracking
    document.addEventListener("click", function (e) {
      const link = e.target.closest(".card-overlay-link");
      if (link && link.dataset.gameTitle) {
        plausible("Card Click", { props: { game: link.dataset.gameTitle } });
      }
    });
  });
}
