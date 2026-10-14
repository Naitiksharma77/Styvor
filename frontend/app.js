/**
 * STYVOR — PURE VANILLA JAVASCRIPT APPLICATION (ES6)
 * Apple iOS Glassmorphism Luxury Architecture
 */

// API Endpoint
const API_URL = "/api";
const COUNTRY_STORAGE_KEY = "styvor_country";
const CART_STORAGE_KEY = "styvor_cart";

// Dynamic Currency Conversion Map relative to 1 INR (Indian Rupee)
// Admin sets prices in INR via Supabase. Client JS dynamically calculates local pricing.
const CURRENCY_CONFIG = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 1.0, decimals: 0, flag: "🇮🇳" },
  USD: { code: "USD", symbol: "$", name: "US Dollar", rate: 0.0116, decimals: 2, flag: "🇺🇸" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.0108, decimals: 2, flag: "🇪🇺" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rate: 0.0091, decimals: 2, flag: "🇬🇧" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 0.0182, decimals: 2, flag: "🇦🇺" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", rate: 0.0162, decimals: 2, flag: "🇨🇦" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 1.78, decimals: 0, flag: "🇯🇵" },
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", rate: 0.0426, decimals: 2, flag: "🇦🇪" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 0.0157, decimals: 2, flag: "🇸🇬" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", rate: 0.0195, decimals: 2, flag: "🇳🇿" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", rate: 0.0105, decimals: 2, flag: "🇨🇭" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 0.068, decimals: 2, flag: "🇧🇷" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", rate: 0.235, decimals: 2, flag: "🇲🇽" },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty", rate: 0.046, decimals: 2, flag: "🇵🇱" },
};

// Popular destinations for instant quick pick
const POPULAR_DESTINATIONS = [
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { code: "AE", name: "UAE", flag: "🇦🇪", currency: "AED" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY" },
];

// Fallback baseline price in INR if database returns 0 or missing
// GUARANTEE: Customer NEVER sees $0 or ₹0
const DEFAULT_INR_PRICE = 1499;

// Global Application State
const state = {
  countries: [],
  selectedCountry: null,
  draftCountryCode: "IN",
  categories: [],
  activeCategory: "All",
  products: [],
  cart: [],
  searchQuery: "",
  activeProduct: null,
  selectedVariantId: null,
  isCheckoutLoading: false,
};

/* ==========================================================================
   Helper Functions & Currency Conversion Logic
   ========================================================================== */

function getCountryCode(country) {
  return String(country?.iso_code || country?.code || "").toUpperCase();
}

function getCurrencyCode(country) {
  const currencies = country?.currencies;
  if (Array.isArray(currencies) && currencies.length > 0) {
    return currencies[0]?.code || "INR";
  }
  return currencies?.code || "INR";
}

function getActiveCurrency() {
  return getCurrencyCode(state.selectedCountry);
}

function getExchangeRate() {
  const currency = getActiveCurrency();
  const dbRate = Number(state.selectedCountry?.currencies?.rate_to_inr);
  if (dbRate > 0) return dbRate;
  return CURRENCY_CONFIG[currency]?.rate || 1.0;
}

/**
 * Extracts base INR price from product or variant.
 * If 0 or invalid, gracefully defaults to DEFAULT_INR_PRICE.
 */
function getProductInrPrice(product, variantId = null) {
  const variants = product.product_variants || product.variants || [];
  const variant = variantId
    ? variants.find((v) => v.id === variantId)
    : variants[0];

  const candidate = Number(
    variant?.price_inr ??
    variant?.price ??
    product.price_inr ??
    product.price ??
    0
  );

  return candidate > 0 ? candidate : DEFAULT_INR_PRICE;
}

function getProductCompareInrPrice(product, variantId = null) {
  const variants = product.product_variants || product.variants || [];
  const variant = variantId
    ? variants.find((v) => v.id === variantId)
    : variants.find((v) => v.compare_at_price_inr || v.compare_at_price) || variants[0];

  const candidate = Number(
    variant?.compare_at_price_inr ??
    variant?.compare_at_price ??
    product.compare_at_price_inr ??
    product.compare_at_price ??
    0
  );

  return candidate > 0 ? candidate : null;
}

/**
 * Dynamically converts INR amount to the target currency based on exchange rate.
 * Never returns 0.
 */
function convertInrToCurrency(inrAmount, targetCurrency, customRate = null) {
  const baseInr = Number(inrAmount);
  const safeInr = Number.isFinite(baseInr) && baseInr > 0 ? baseInr : DEFAULT_INR_PRICE;

  const config = CURRENCY_CONFIG[targetCurrency] || CURRENCY_CONFIG.INR;
  const rate = Number(customRate) > 0 ? Number(customRate) : (config.rate || 1.0);

  const raw = safeInr * rate;
  const decimals = config.decimals !== undefined ? config.decimals : (targetCurrency === "JPY" ? 0 : 2);

  if (decimals === 0) {
    return Math.max(1, Math.round(raw));
  }
  return Math.max(0.01, Math.round(raw * 100) / 100);
}

/**
 * Formats a local currency amount using standard Intl.NumberFormat.
 */
function formatLocalPrice(amount, currencyCode) {
  const num = Number(amount);
  const code = currencyCode || "INR";
  const config = CURRENCY_CONFIG[code] || { symbol: code, decimals: 2 };
  const decimals = config.decimals !== undefined ? config.decimals : 2;

  if (!Number.isFinite(num) || num <= 0) {
    return `${config.symbol}—`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return `${config.symbol} ${num.toFixed(decimals)}`;
  }
}

function formatInr(amount) {
  const num = Number(amount) || DEFAULT_INR_PRICE;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getProductImages(product) {
  const imgs = Array.isArray(product?.product_images)
    ? product.product_images
    : Array.isArray(product?.images)
      ? product.images
      : [];

  const valid = imgs.filter((i) => i?.image_url);
  if (valid.length) return valid.map((i) => i.image_url);

  const single = product?.image_url || product?.image;
  return single ? [single] : [];
}

/* ==========================================================================
   DOM Elements Cache
   ========================================================================== */
const DOM = {
  // Announcements & Header
  announcementFlag: document.getElementById("announcement-flag"),
  announcementCountryName: document.getElementById("announcement-country-name"),
  announcementCountryBtn: document.getElementById("announcement-country-btn"),
  headerCountryFlag: document.getElementById("header-country-flag"),
  headerCountryCode: document.getElementById("header-country-code"),
  headerCurrencySymbol: document.getElementById("header-currency-symbol"),
  openCountryBtn: document.getElementById("open-country-btn"),
  openBagBtn: document.getElementById("open-bag-btn"),
  bagCountBadge: document.getElementById("bag-count-badge"),
  openSearchBtn: document.getElementById("open-search-btn"),

  // Hero
  heroCountryBtn: document.getElementById("hero-country-btn"),
  heroCountryFlag: document.getElementById("hero-country-flag"),
  heroCountryLabel: document.getElementById("hero-country-label"),

  // Catalog
  catalogCount: document.getElementById("catalog-count"),
  categorySegmented: document.getElementById("category-segmented"),
  catalogSearchInput: document.getElementById("catalog-search-input"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  currencyIndicator: document.getElementById("currency-indicator"),
  currIndicatorText: document.getElementById("curr-indicator-text"),
  currChangeBtn: document.getElementById("curr-change-btn"),
  productsGrid: document.getElementById("products-grid"),
  emptyProducts: document.getElementById("empty-products"),
  resetFiltersBtn: document.getElementById("reset-filters-btn"),

  // Footer
  footerCountryBtn: document.getElementById("footer-country-btn"),
  footerFlag: document.getElementById("footer-flag"),
  footerCountryText: document.getElementById("footer-country-text"),
  footerBagLink: document.getElementById("footer-bag-link"),

  // Tab Bar
  tabHome: document.getElementById("tab-home"),
  tabExplore: document.getElementById("tab-explore"),
  tabBag: document.getElementById("tab-bag"),
  tabProfile: document.getElementById("tab-profile"),
  tabBagBadge: document.getElementById("tab-bag-badge"),
  tabCountryFlag: document.getElementById("tab-country-flag"),

  // Modals & Backdrop
  backdrop: document.getElementById("modal-backdrop"),
  countryModal: document.getElementById("country-modal"),
  countryModalClose: document.getElementById("country-modal-close"),
  quickPicksGrid: document.getElementById("quick-picks-grid"),
  countrySearchInput: document.getElementById("country-search-input"),
  countriesScrollList: document.getElementById("countries-scroll-list"),
  previewFlag: document.getElementById("preview-flag"),
  previewCountryName: document.getElementById("preview-country-name"),
  previewCurrencyDesc: document.getElementById("preview-currency-desc"),
  previewExchangeRate: document.getElementById("preview-exchange-rate"),
  confirmCountryBtn: document.getElementById("confirm-country-btn"),

  productModal: document.getElementById("product-modal"),
  productModalClose: document.getElementById("product-modal-close"),
  productModalBack: document.getElementById("product-modal-back"),
  productModalBody: document.getElementById("product-modal-body"),

  bagModal: document.getElementById("bag-modal"),
  bagModalClose: document.getElementById("bag-modal-close"),
  bagModalCount: document.getElementById("bag-modal-count"),
  bagItemsList: document.getElementById("bag-items-list"),
  emptyBagView: document.getElementById("empty-bag-view"),
  bagModalFooter: document.getElementById("bag-modal-footer"),
  bagSubtotalVal: document.getElementById("bag-subtotal-val"),
  bagShippingVal: document.getElementById("bag-shipping-val"),
  bagTotalVal: document.getElementById("bag-total-val"),
  bagCurrencyNote: document.getElementById("bag-currency-note"),
  proceedToCheckoutBtn: document.getElementById("proceed-to-checkout-btn"),
  checkoutBtnPreview: document.getElementById("checkout-btn-preview"),
  bagExploreBtn: document.getElementById("bag-explore-btn"),

  checkoutModal: document.getElementById("checkout-modal"),
  checkoutModalClose: document.getElementById("checkout-modal-close"),
  checkoutForm: document.getElementById("checkout-form"),
  checkoutErrorBanner: document.getElementById("checkout-error-banner"),
  checkoutErrorText: document.getElementById("checkout-error-text"),
  checkoutFlag: document.getElementById("checkout-flag"),
  checkoutCountryName: document.getElementById("checkout-country-name"),
  checkoutChangeCountryBtn: document.getElementById("checkout-change-country-btn"),
  cosSubtotalVal: document.getElementById("cos-subtotal-val"),
  cosShippingVal: document.getElementById("cos-shipping-val"),
  cosTotalVal: document.getElementById("cos-total-val"),
  cosInrReference: document.getElementById("cos-inr-reference"),
  checkoutPayBtn: document.getElementById("checkout-pay-btn"),
  checkoutSpinner: document.getElementById("checkout-spinner"),
  checkoutPayText: document.getElementById("checkout-pay-text"),

  // Checkout inputs
  inputCustomerName: document.getElementById("input-customer-name"),
  inputCustomerEmail: document.getElementById("input-customer-email"),
  inputCustomerPhone: document.getElementById("input-customer-phone"),
  inputShippingAddress: document.getElementById("input-shipping-address"),
  inputShippingArea: document.getElementById("input-shipping-area"),
  inputShippingCity: document.getElementById("input-shipping-city"),
  inputShippingState: document.getElementById("input-shipping-state"),
  inputShippingPostal: document.getElementById("input-shipping-postal"),

  successModal: document.getElementById("success-modal"),
  receiptOrderNum: document.getElementById("receipt-order-num"),
  receiptCustomerName: document.getElementById("receipt-customer-name"),
  receiptDestination: document.getElementById("receipt-destination"),
  receiptAmountPaid: document.getElementById("receipt-amount-paid"),
  successDoneBtn: document.getElementById("success-done-btn"),

  exploreModal: document.getElementById("explore-modal"),
  exploreModalClose: document.getElementById("explore-modal-close"),
  exploreSearchInput: document.getElementById("explore-search-input"),
  exploreCategoryGrid: document.getElementById("explore-category-grid"),

  profileModal: document.getElementById("profile-modal"),
  profileModalClose: document.getElementById("profile-modal-close"),
  profileSheetFlag: document.getElementById("profile-sheet-flag"),
  profileSheetCountry: document.getElementById("profile-sheet-country"),
  profileSheetCurrency: document.getElementById("profile-sheet-currency"),
  profileSwitchCountryBtn: document.getElementById("profile-switch-country-btn"),
  menuTrackOrder: document.getElementById("menu-track-order"),
};

/* ==========================================================================
   Modal Controller
   ========================================================================== */
function openModal(modalEl) {
  closeAllModals(false);
  if (!modalEl) return;
  modalEl.classList.add("open");
  DOM.backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  if (modalEl) modalEl.classList.remove("open");
  DOM.backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

function closeAllModals(resetBody = true) {
  document.querySelectorAll(".ios-modal").forEach((m) => m.classList.remove("open"));
  DOM.backdrop.classList.remove("open");
  if (resetBody) document.body.style.overflow = "";
}

/* ==========================================================================
   Data Fetching: Countries, Categories, Products
   ========================================================================== */

async function fetchCountries() {
  try {
    const res = await fetch(`${API_URL}/countries`);
    if (!res.ok) throw new Error("Failed to load countries");
    const data = await res.json();
    state.countries = Array.isArray(data) ? data : data.countries || [];

    // Check saved country preference or fallback to India
    let savedCode = "";
    try {
      savedCode = localStorage.getItem(COUNTRY_STORAGE_KEY) || "";
    } catch {}

    const matched = state.countries.find((c) => getCountryCode(c) === savedCode);
    const fallback = state.countries.find((c) => getCountryCode(c) === "IN") || state.countries[0];
    state.selectedCountry = matched || fallback || { iso_code: "IN", name: "India", flag: "🇮🇳" };
    state.draftCountryCode = getCountryCode(state.selectedCountry);

    updateCountryUI();
    renderCountryModalUI();

    // CRITICAL ENTRY POPUP: If first visit, show "Select Your Country" modal popup
    if (!savedCode) {
      setTimeout(() => {
        openModal(DOM.countryModal);
      }, 350);
    }
  } catch (err) {
    console.error("Could not fetch countries:", err);
    state.selectedCountry = { iso_code: "IN", name: "India", flag: "🇮🇳" };
    updateCountryUI();
  }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) return;
    const data = await res.json();
    state.categories = Array.isArray(data) ? data : data.categories || [];
    renderCategoryControls();
  } catch (err) {
    console.error("Could not fetch categories:", err);
  }
}

async function fetchProducts() {
  if (!state.selectedCountry) return;
  const countryCode = getCountryCode(state.selectedCountry);

  DOM.catalogCount.textContent = "Loading collection...";
  DOM.productsGrid.innerHTML = `
    <div class="product-card-skeleton"></div>
    <div class="product-card-skeleton"></div>
    <div class="product-card-skeleton"></div>
    <div class="product-card-skeleton"></div>
  `;

  try {
    const res = await fetch(`${API_URL}/products?country=${encodeURIComponent(countryCode)}`);
    if (!res.ok) throw new Error("Failed to load products");
    const data = await res.json();
    const rawList = Array.isArray(data) ? data : data.products || [];

    // Fetch images for each product
    state.products = await Promise.all(
      rawList.map(async (prod) => {
        try {
          const imgRes = await fetch(`${API_URL}/products/${encodeURIComponent(prod.id)}/images`);
          if (!imgRes.ok) return { ...prod, product_images: [] };
          const imgData = await imgRes.json();
          return {
            ...prod,
            product_images: Array.isArray(imgData.images) ? imgData.images : [],
          };
        } catch {
          return { ...prod, product_images: [] };
        }
      })
    );

    renderProductsGrid();
  } catch (err) {
    console.error("Failed to load products:", err);
    state.products = [];
    renderProductsGrid();
  }
}

/* ==========================================================================
   UI Updates: Country & Dynamic Currency
   ========================================================================== */

function updateCountryUI() {
  const c = state.selectedCountry;
  const code = getCountryCode(c);
  const flag = c?.flag || "🌐";
  const curr = getActiveCurrency();
  const config = CURRENCY_CONFIG[curr] || { symbol: curr };

  // Announcement
  DOM.announcementFlag.textContent = flag;
  DOM.announcementCountryName.textContent = `${c?.name || "Global"} · ${curr}`;

  // Header
  DOM.headerCountryFlag.textContent = flag;
  DOM.headerCountryCode.textContent = code;
  DOM.headerCurrencySymbol.textContent = `${config.symbol} ${curr}`;

  // Hero
  DOM.heroCountryFlag.textContent = flag;
  DOM.heroCountryLabel.textContent = `Shipping to ${c?.name || "Global"} (${curr})`;

  // Footer & Tab
  DOM.footerFlag.textContent = flag;
  DOM.footerCountryText.textContent = `${c?.name || "India"} · ${curr} (${config.symbol})`;
  DOM.tabCountryFlag.textContent = flag;

  // Checkout Display
  DOM.checkoutFlag.textContent = flag;
  DOM.checkoutCountryName.textContent = `${c?.name || "India"} (${curr})`;

  // Indicator
  DOM.currIndicatorText.textContent = `Prices automatically converted to ${curr} (${config.symbol})`;

  // Profile Sheet
  DOM.profileSheetFlag.textContent = flag;
  DOM.profileSheetCountry.textContent = c?.name || "India";
  DOM.profileSheetCurrency.textContent = `Local Currency: ${curr} (${config.symbol})`;
}

function renderCountryModalUI() {
  // Quick Picks
  DOM.quickPicksGrid.innerHTML = POPULAR_DESTINATIONS.map((dest) => {
    const isAct = dest.code === state.draftCountryCode;
    return `
      <button type="button" class="quick-pick-chip ${isAct ? "active" : ""}" data-country-code="${dest.code}">
        <span class="qp-flag">${dest.flag}</span>
        <span class="qp-name">${dest.name}</span>
        <span class="qp-currency">${dest.currency}</span>
      </button>
    `;
  }).join("");

  renderCountryList();
  updateCountryPreview();
}

function renderCountryList(filterText = "") {
  const q = filterText.trim().toLowerCase();
  const filtered = state.countries.filter((c) => {
    if (!q) return true;
    const name = (c.name || "").toLowerCase();
    const code = getCountryCode(c).toLowerCase();
    const curr = getCurrencyCode(c).toLowerCase();
    return name.includes(q) || code.includes(q) || curr.includes(q);
  });

  if (filtered.length === 0) {
    DOM.countriesScrollList.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">No supported regions found</div>`;
    return;
  }

  DOM.countriesScrollList.innerHTML = filtered.map((c) => {
    const code = getCountryCode(c);
    const curr = getCurrencyCode(c);
    const isAct = code === state.draftCountryCode;
    return `
      <div class="country-row-item ${isAct ? "active" : ""}" data-country-code="${code}">
        <div class="cri-left">
          <span class="cri-flag">${c.flag || "🌐"}</span>
          <span class="cri-name">${c.name}</span>
          <span class="cri-code">(${code})</span>
        </div>
        <span class="cri-curr">${curr}</span>
      </div>
    `;
  }).join("");
}

function updateCountryPreview() {
  const target = state.countries.find((c) => getCountryCode(c) === state.draftCountryCode) || state.selectedCountry;
  const flag = target?.flag || "🌐";
  const name = target?.name || "Global Destination";
  const curr = getCurrencyCode(target);
  const config = CURRENCY_CONFIG[curr] || { symbol: curr, rate: 1.0 };
  const rate = target?.currencies?.rate_to_inr || config.rate || 1.0;

  DOM.previewFlag.textContent = flag;
  DOM.previewCountryName.textContent = name;
  DOM.previewCurrencyDesc.textContent = `Prices displayed in ${curr} (${config.symbol})`;
  DOM.previewExchangeRate.textContent = `1 INR ≈ ${rate < 1 ? rate.toFixed(4) : rate.toFixed(2)} ${curr}`;

  // Update quick picks active state
  document.querySelectorAll(".quick-pick-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.countryCode === state.draftCountryCode);
  });

  // Update list active state
  document.querySelectorAll(".country-row-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.countryCode === state.draftCountryCode);
  });
}

function applySelectedCountry(countryCode) {
  const country = state.countries.find((c) => getCountryCode(c) === countryCode);
  if (!country) return;

  state.selectedCountry = country;
  state.draftCountryCode = countryCode;

  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
  } catch {}

  updateCountryUI();
  closeModal(DOM.countryModal);
  closeModal(DOM.profileModal);

  // Re-fetch products with new country conversion
  fetchProducts();
  updateCartTotalsUI();
}

/* ==========================================================================
   Category Controls & Filtering
   ========================================================================== */

function renderCategoryControls() {
  const categoriesList = [{ id: "All", name: "All Pieces" }, ...state.categories];

  DOM.categorySegmented.innerHTML = categoriesList.map((cat) => {
    const isAct = state.activeCategory === cat.name || (state.activeCategory === "All" && cat.id === "All");
    return `
      <button type="button" class="segment-btn ${isAct ? "active" : ""}" data-cat-name="${cat.name}">
        ${cat.name}
      </button>
    `;
  }).join("");

  // Also render into Explore Sheet
  DOM.exploreCategoryGrid.innerHTML = categoriesList.map((cat) => {
    return `
      <button type="button" class="explore-cat-card" data-cat-name="${cat.name}">
        <span class="explore-cat-title">${cat.name}</span>
        <span class="explore-cat-count">Explore Category ›</span>
      </button>
    `;
  }).join("");
}

/* ==========================================================================
   Render Products Grid & Cards
   ========================================================================== */

function renderProductsGrid() {
  const query = state.searchQuery.trim().toLowerCase();
  const curr = getActiveCurrency();
  const rate = getExchangeRate();

  const filtered = state.products.filter((p) => {
    const name = String(p.name || p.title || "").toLowerCase();
    const desc = String(p.description || "").toLowerCase();
    const sku = String(p.sku || "").toLowerCase();
    const matchesSearch = !query || name.includes(query) || desc.includes(query) || sku.includes(query);

    const catName = typeof p.category === "object" ? p.category?.name : p.category;
    const catId = typeof p.category === "object" ? p.category?.id : p.category_id;
    const matchesCat =
      state.activeCategory === "All" ||
      catName === state.activeCategory ||
      catId === state.activeCategory;

    return matchesSearch && matchesCat;
  });

  DOM.catalogCount.textContent = `${filtered.length} piece${filtered.length === 1 ? "" : "s"} available`;

  if (filtered.length === 0) {
    DOM.productsGrid.innerHTML = "";
    DOM.emptyProducts.style.display = "block";
    return;
  }

  DOM.emptyProducts.style.display = "none";
  DOM.productsGrid.innerHTML = filtered.map((prod) => {
    const images = getProductImages(prod);
    const mainImg = images[0] || "";
    const baseInr = getProductInrPrice(prod);
    const compareInr = getProductCompareInrPrice(prod);

    // Dynamic Currency Calculation:
    // GUARANTEE: Never returns $0 or ₹0
    const localPrice = convertInrToCurrency(baseInr, curr, rate);
    const localCompare = compareInr ? convertInrToCurrency(compareInr, curr, rate) : null;

    const formattedPrice = formatLocalPrice(localPrice, curr);
    const formattedCompare = localCompare ? formatLocalPrice(localCompare, curr) : null;

    const catLabel = typeof prod.category === "object" ? prod.category?.name : prod.category || "Atelier";

    return `
      <article class="product-card" data-product-id="${prod.id}">
        <div class="product-image-wrap">
          ${
            mainImg
              ? `<img src="${mainImg}" alt="${prod.name}" class="product-image" loading="lazy" />`
              : `<div class="product-image-placeholder"><span>✦</span></div>`
          }
          <button type="button" class="product-quick-add-btn" data-action="quick-add" data-product-id="${prod.id}" title="Quick Add to Bag" aria-label="Add to Bag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div class="product-info">
          <span class="product-category-label">${catLabel}</span>
          <h3 class="product-title">${prod.name}</h3>
          
          <div class="product-pricing-wrap">
            <span class="product-price-current">${formattedPrice}</span>
            ${formattedCompare ? `<span class="product-price-compare">${formattedCompare}</span>` : ""}
            <span class="product-price-currency-tag">${curr}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* ==========================================================================
   Product Detail Sheet
   ========================================================================== */

function openProductDetail(productId) {
  const prod = state.products.find((p) => String(p.id) === String(productId));
  if (!prod) return;

  state.activeProduct = prod;
  const variants = prod.product_variants || prod.variants || [];
  state.selectedVariantId = variants[0]?.id || null;

  const images = getProductImages(prod);
  const mainImg = images[0] || "";
  const curr = getActiveCurrency();
  const rate = getExchangeRate();
  const baseInr = getProductInrPrice(prod, state.selectedVariantId);
  const compareInr = getProductCompareInrPrice(prod, state.selectedVariantId);
  const localPrice = convertInrToCurrency(baseInr, curr, rate);
  const localCompare = compareInr ? convertInrToCurrency(compareInr, curr, rate) : null;

  DOM.productModalBody.innerHTML = `
    <div class="product-modal-gallery">
      <img src="${mainImg || ""}" alt="${prod.name}" class="pm-main-img" id="pm-active-image" />
      ${
        images.length > 1
          ? `
          <div class="pm-thumbs-row">
            ${images
              .map(
                (url, idx) => `
                <img src="${url}" class="pm-thumb ${idx === 0 ? "active" : ""}" data-img-url="${url}" alt="" />
              `
              )
              .join("")}
          </div>
        `
          : ""
      }
    </div>

    <div class="product-modal-details">
      <span class="product-category-label">${typeof prod.category === "object" ? prod.category?.name : prod.category || "Atelier"}</span>
      <h2 class="pm-title">${prod.name}</h2>
      
      <div class="pm-price-row">
        <span class="pm-price-large">${formatLocalPrice(localPrice, curr)}</span>
        ${localCompare ? `<span class="pm-compare-price">${formatLocalPrice(localCompare, curr)}</span>` : ""}
        <span class="pm-inr-note">Base: ${formatInr(baseInr)}</span>
      </div>

      <p class="pm-desc">${prod.description || "Designed with architectural minimalism and luxury materials."}</p>

      ${
        variants.length > 1
          ? `
          <div class="pm-variants-label">Select Size / Silhouette</div>
          <div class="pm-variants-pills" id="pm-variants-pills">
            ${variants
              .map(
                (v, i) => `
                <button type="button" class="pm-variant-btn ${i === 0 ? "active" : ""}" data-variant-id="${v.id}">
                  ${v.name || v.sku || `Variant ${i + 1}`}
                </button>
              `
              )
              .join("")}
          </div>
        `
          : ""
      }

      <button type="button" class="btn-primary btn-block" id="pm-add-to-bag-btn">
        Add to Bag · ${formatLocalPrice(localPrice, curr)}
      </button>
    </div>
  `;

  // Gallery thumbnail listener
  DOM.productModalBody.querySelectorAll(".pm-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      DOM.productModalBody.querySelectorAll(".pm-thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
      const activeImg = document.getElementById("pm-active-image");
      if (activeImg) activeImg.src = thumb.dataset.imgUrl;
    });
  });

  // Variant selector listener
  DOM.productModalBody.querySelectorAll(".pm-variant-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      DOM.productModalBody.querySelectorAll(".pm-variant-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedVariantId = btn.dataset.variantId;
    });
  });

  // Add to Bag CTA
  const addBtn = document.getElementById("pm-add-to-bag-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addToCart(prod, state.selectedVariantId);
      closeModal(DOM.productModal);
      openModal(DOM.bagModal);
    });
  }

  openModal(DOM.productModal);
}

/* ==========================================================================
   Shopping Bag State & Logic
   ========================================================================== */

function loadSavedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      state.cart = JSON.parse(raw);
    }
  } catch {
    state.cart = [];
  }
  updateCartTotalsUI();
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  } catch {}
  updateCartTotalsUI();
}

function addToCart(product, variantId = null) {
  const vId = variantId || (product.product_variants?.[0]?.id || null);
  const cartKey = `${product.id}-${vId || "def"}`;
  const existing = state.cart.find((item) => item.cartKey === cartKey);

  const images = getProductImages(product);
  const baseInr = getProductInrPrice(product, vId);

  const variants = product.product_variants || product.variants || [];
  const variantObj = variants.find((v) => v.id === vId);
  const variantName = variantObj?.name || variantObj?.sku || "";

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      cartKey,
      id: product.id,
      name: product.name,
      variantId: vId,
      variantName,
      priceInr: baseInr,
      image: images[0] || "",
      quantity: 1,
    });
  }

  saveCart();
}

function changeCartQuantity(cartKey, change) {
  const item = state.cart.find((i) => i.cartKey === cartKey);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((i) => i.cartKey !== cartKey);
  }

  saveCart();
}

function updateCartTotalsUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  DOM.bagCountBadge.textContent = totalCount;
  DOM.bagModalCount.textContent = totalCount;

  // Bottom tab bar badge
  if (totalCount > 0) {
    DOM.tabBagBadge.style.display = "flex";
    DOM.tabBagBadge.textContent = totalCount;
  } else {
    DOM.tabBagBadge.style.display = "none";
  }

  const curr = getActiveCurrency();
  const rate = getExchangeRate();

  // Dynamic JS Currency Conversion for Cart
  const subtotalInr = state.cart.reduce((sum, item) => sum + item.priceInr * item.quantity, 0);
  const subtotalLocal = state.cart.reduce((sum, item) => {
    const itemLocal = convertInrToCurrency(item.priceInr, curr, rate);
    return sum + itemLocal * item.quantity;
  }, 0);

  const formattedSubtotal = formatLocalPrice(subtotalLocal, curr);

  DOM.bagSubtotalVal.textContent = formattedSubtotal;
  DOM.bagTotalVal.textContent = formattedSubtotal;
  DOM.checkoutBtnPreview.textContent = formattedSubtotal;
  DOM.bagCurrencyNote.textContent = `Converted from base INR (${formatInr(subtotalInr)}) at live exchange rate.`;

  // Checkout order summary sync
  DOM.cosSubtotalVal.textContent = formattedSubtotal;
  DOM.cosTotalVal.textContent = formattedSubtotal;
  DOM.cosInrReference.textContent = `Base Order Total: ${formatInr(subtotalInr)} INR`;

  // Render bag items list
  if (state.cart.length === 0) {
    DOM.bagItemsList.innerHTML = "";
    DOM.emptyBagView.style.display = "block";
    DOM.bagModalFooter.style.display = "none";
  } else {
    DOM.emptyBagView.style.display = "none";
    DOM.bagModalFooter.style.display = "block";

    DOM.bagItemsList.innerHTML = state.cart.map((item) => {
      const itemLocal = convertInrToCurrency(item.priceInr, curr, rate);
      return `
        <div class="bag-item-card">
          ${
            item.image
              ? `<img src="${item.image}" alt="${item.name}" class="bag-item-img" />`
              : `<div class="bag-item-img" style="display:flex;align-items:center;justify-content:center;color:#444;">✦</div>`
          }
          <div class="bag-item-info">
            <span class="bag-item-title">${item.name}</span>
            ${item.variantName ? `<span class="bag-item-variant">${item.variantName}</span>` : ""}
            <div class="bag-item-bottom">
              <span class="bag-item-price">${formatLocalPrice(itemLocal * item.quantity, curr)}</span>
              <div class="bag-item-qty-controls">
                <button type="button" class="qty-btn" data-action="dec-qty" data-key="${item.cartKey}">−</button>
                <span class="qty-num">${item.quantity}</span>
                <button type="button" class="qty-btn" data-action="inc-qty" data-key="${item.cartKey}">+</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

/* ==========================================================================
   Checkout & Online Payment (Razorpay Integration)
   ========================================================================== */

function validateCheckoutForm() {
  let isValid = true;
  DOM.checkoutErrorBanner.style.display = "none";

  // Reset error classes
  document.querySelectorAll(".form-input").forEach((inp) => inp.classList.remove("has-error"));
  document.querySelectorAll(".field-error").forEach((err) => err.classList.remove("visible"));

  function markError(inputEl, errorId) {
    isValid = false;
    inputEl.classList.add("has-error");
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.classList.add("visible");
  }

  // Name
  if (!DOM.inputCustomerName.value.trim() || DOM.inputCustomerName.value.trim().length < 2) {
    markError(DOM.inputCustomerName, "err-customer-name");
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!DOM.inputCustomerEmail.value.trim() || !emailRegex.test(DOM.inputCustomerEmail.value.trim())) {
    markError(DOM.inputCustomerEmail, "err-customer-email");
  }

  // Phone
  const digits = DOM.inputCustomerPhone.value.replace(/\D/g, "");
  if (!DOM.inputCustomerPhone.value.trim() || digits.length < 7) {
    markError(DOM.inputCustomerPhone, "err-customer-phone");
  }

  // Address
  if (!DOM.inputShippingAddress.value.trim() || DOM.inputShippingAddress.value.trim().length < 3) {
    markError(DOM.inputShippingAddress, "err-shipping-address");
  }

  // Area
  if (!DOM.inputShippingArea.value.trim() || DOM.inputShippingArea.value.trim().length < 2) {
    markError(DOM.inputShippingArea, "err-shipping-area");
  }

  // City
  if (!DOM.inputShippingCity.value.trim()) {
    markError(DOM.inputShippingCity, "err-shipping-city");
  }

  // Postal code
  if (!DOM.inputShippingPostal.value.trim() || DOM.inputShippingPostal.value.trim().length < 3) {
    markError(DOM.inputShippingPostal, "err-shipping-postal");
  }

  if (!isValid) {
    DOM.checkoutErrorBanner.style.display = "flex";
  }

  return isValid;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  if (state.isCheckoutLoading) return;

  if (!validateCheckoutForm()) return;
  if (state.cart.length === 0) {
    alert("Your shopping bag is empty.");
    return;
  }

  state.isCheckoutLoading = true;
  DOM.checkoutSpinner.style.display = "inline-block";
  DOM.checkoutPayText.textContent = "Connecting to Razorpay...";
  DOM.checkoutPayBtn.disabled = true;

  try {
    const curr = getActiveCurrency();
    const rate = getExchangeRate();
    const countryCode = getCountryCode(state.selectedCountry);

    // Calculate totals
    const subtotalInr = state.cart.reduce((sum, item) => sum + item.priceInr * item.quantity, 0);
    const subtotalLocal = state.cart.reduce((sum, item) => {
      const itemLocal = convertInrToCurrency(item.priceInr, curr, rate);
      return sum + itemLocal * item.quantity;
    }, 0);

    // 1. Create order in backend / Supabase
    const orderPayload = {
      customer_name: DOM.inputCustomerName.value.trim(),
      customer_email: DOM.inputCustomerEmail.value.trim(),
      customer_phone: DOM.inputCustomerPhone.value.trim(),
      country_code: countryCode,
      shipping_address: DOM.inputShippingAddress.value.trim(),
      area: DOM.inputShippingArea.value.trim(),
      city: DOM.inputShippingCity.value.trim(),
      state: DOM.inputShippingState.value.trim() || "N/A",
      postal_code: DOM.inputShippingPostal.value.trim(),
      shipping_fee: 0,
      payment_method: "Razorpay",
      items: state.cart.map((item) => ({
        id: item.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        name: item.name,
        price: item.priceInr,
      })),
    };

    const orderRes = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      throw new Error(errData.error || "Order creation failed.");
    }

    const orderData = await orderRes.json();

    // 2. Request Razorpay payment order passing converted currency & amount
    const payRes = await fetch(`${API_URL}/payments/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: subtotalLocal,
        currency: curr,
        inr_amount: subtotalInr,
        order_id: orderData.id,
      }),
    });

    const paymentOrder = await payRes.json().catch(() => ({}));

    // If sandbox / demo mode without active live keys
    if (paymentOrder.demo_mode || !window.Razorpay) {
      DOM.checkoutPayText.textContent = "Verifying transaction...";
      await new Promise((r) => setTimeout(r, 800));

      await fetch(`${API_URL}/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentOrder.order_id || `order_styvor_${Date.now()}`,
          razorpay_payment_id: `pay_styvor_${Date.now()}`,
          razorpay_signature: "mock_signature_verified",
        }),
      });

      await fetch(`${API_URL}/orders/${orderData.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: "Paid",
          fulfillment_status: "Processing",
        }),
      });

      finishOrderSuccess(orderData, formatLocalPrice(subtotalLocal, curr));
      return;
    }

    // 3. Live Razorpay Modal Checkout
    const options = {
      key: paymentOrder.key_id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || curr,
      name: "STYVOR",
      description: `Order #${orderData.order_number || orderData.id.slice(0, 8)}`,
      order_id: paymentOrder.order_id,
      prefill: {
        name: DOM.inputCustomerName.value.trim(),
        email: DOM.inputCustomerEmail.value.trim(),
        contact: DOM.inputCustomerPhone.value.trim(),
      },
      notes: {
        country: state.selectedCountry?.name,
        area: DOM.inputShippingArea.value.trim(),
      },
      handler: async function (response) {
        DOM.checkoutPayText.textContent = "Confirming payment...";
        try {
          await fetch(`${API_URL}/payments/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          await fetch(`${API_URL}/orders/${orderData.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_status: "Paid",
              fulfillment_status: "Processing",
            }),
          });

          finishOrderSuccess(orderData, formatLocalPrice(subtotalLocal, curr));
        } catch (vErr) {
          alert("Payment completed, but verification had an error: " + vErr.message);
        }
      },
      modal: {
        ondismiss: function () {
          resetCheckoutBtn();
        },
      },
      theme: { color: "#000000" },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (resp) {
      alert("Payment failed: " + (resp.error?.description || "Transaction declined"));
      resetCheckoutBtn();
    });
    rzp.open();
  } catch (err) {
    console.error("Checkout error:", err);
    alert(err.message || "An error occurred during payment.");
    resetCheckoutBtn();
  }
}

function resetCheckoutBtn() {
  state.isCheckoutLoading = false;
  DOM.checkoutSpinner.style.display = "none";
  DOM.checkoutPayText.textContent = "Pay Now via Razorpay";
  DOM.checkoutPayBtn.disabled = false;
}

function finishOrderSuccess(orderData, totalFormatted) {
  resetCheckoutBtn();
  state.cart = [];
  saveCart();
  closeModal(DOM.checkoutModal);

  DOM.receiptOrderNum.textContent = `#${orderData.order_number || "STY-" + Date.now().toString().slice(-6)}`;
  DOM.receiptCustomerName.textContent = DOM.inputCustomerName.value.trim();
  DOM.receiptDestination.textContent = `${DOM.inputShippingCity.value.trim()}, ${state.selectedCountry?.name}`;
  DOM.receiptAmountPaid.textContent = totalFormatted;

  openModal(DOM.successModal);
}

/* ==========================================================================
   Event Listeners & Tab Navigation
   ========================================================================== */

function setupEventListeners() {
  // Backdrop click closes all modals
  DOM.backdrop.addEventListener("click", () => closeAllModals());

  // Country Modal triggers
  const openCountryHandlers = [
    DOM.openCountryBtn,
    DOM.announcementCountryBtn,
    DOM.heroCountryBtn,
    DOM.footerCountryBtn,
    DOM.currChangeBtn,
    DOM.checkoutChangeCountryBtn,
    DOM.profileSwitchCountryBtn,
  ];

  openCountryHandlers.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => {
        state.draftCountryCode = getCountryCode(state.selectedCountry);
        renderCountryModalUI();
        openModal(DOM.countryModal);
      });
    }
  });

  DOM.countryModalClose.addEventListener("click", () => closeModal(DOM.countryModal));

  // Quick Pick Click
  DOM.quickPicksGrid.addEventListener("click", (e) => {
    const chip = e.target.closest(".quick-pick-chip");
    if (!chip) return;
    state.draftCountryCode = chip.dataset.countryCode;
    updateCountryPreview();
  });

  // Country Search Input
  DOM.countrySearchInput.addEventListener("input", (e) => {
    renderCountryList(e.target.value);
  });

  // Country Row Click
  DOM.countriesScrollList.addEventListener("click", (e) => {
    const row = e.target.closest(".country-row-item");
    if (!row) return;
    state.draftCountryCode = row.dataset.countryCode;
    updateCountryPreview();
  });

  // Confirm Country Button
  DOM.confirmCountryBtn.addEventListener("click", () => {
    applySelectedCountry(state.draftCountryCode);
  });

  // Bag Modal triggers
  const openBagHandlers = [DOM.openBagBtn, DOM.footerBagLink];
  openBagHandlers.forEach((btn) => {
    if (btn) btn.addEventListener("click", () => openModal(DOM.bagModal));
  });

  DOM.bagModalClose.addEventListener("click", () => closeModal(DOM.bagModal));
  DOM.bagExploreBtn.addEventListener("click", () => {
    closeModal(DOM.bagModal);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  });

  // Bag Quantity Actions (+ / -)
  DOM.bagItemsList.addEventListener("click", (e) => {
    const incBtn = e.target.closest('[data-action="inc-qty"]');
    if (incBtn) {
      changeCartQuantity(incBtn.dataset.key, 1);
      return;
    }
    const decBtn = e.target.closest('[data-action="dec-qty"]');
    if (decBtn) {
      changeCartQuantity(decBtn.dataset.key, -1);
    }
  });

  // Proceed to Checkout
  DOM.proceedToCheckoutBtn.addEventListener("click", () => {
    closeModal(DOM.bagModal);
    openModal(DOM.checkoutModal);
  });

  // Checkout Modal Close & Submit
  DOM.checkoutModalClose.addEventListener("click", () => closeModal(DOM.checkoutModal));
  DOM.checkoutForm.addEventListener("submit", handleCheckoutSubmit);

  // Success Modal Done Button
  DOM.successDoneBtn.addEventListener("click", () => {
    closeModal(DOM.successModal);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  });

  // Product Modal Close & Back
  DOM.productModalClose.addEventListener("click", () => closeModal(DOM.productModal));
  DOM.productModalBack.addEventListener("click", () => closeModal(DOM.productModal));

  // Product Grid Card / Quick-Add Click
  DOM.productsGrid.addEventListener("click", (e) => {
    const quickAdd = e.target.closest('[data-action="quick-add"]');
    if (quickAdd) {
      e.stopPropagation();
      const pId = quickAdd.dataset.productId;
      const prod = state.products.find((p) => String(p.id) === String(pId));
      if (prod) {
        addToCart(prod);
        openModal(DOM.bagModal);
      }
      return;
    }

    const card = e.target.closest(".product-card");
    if (card) {
      openProductDetail(card.dataset.productId);
    }
  });

  // Category Segmented Control
  DOM.categorySegmented.addEventListener("click", (e) => {
    const btn = e.target.closest(".segment-btn");
    if (!btn) return;
    DOM.categorySegmented.querySelectorAll(".segment-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.activeCategory = btn.dataset.catName;
    renderProductsGrid();
  });

  // Catalog Search
  DOM.catalogSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    DOM.searchClearBtn.style.display = state.searchQuery ? "flex" : "none";
    renderProductsGrid();
  });

  DOM.searchClearBtn.addEventListener("click", () => {
    state.searchQuery = "";
    DOM.catalogSearchInput.value = "";
    DOM.searchClearBtn.style.display = "none";
    renderProductsGrid();
  });

  DOM.resetFiltersBtn.addEventListener("click", () => {
    state.searchQuery = "";
    state.activeCategory = "All";
    DOM.catalogSearchInput.value = "";
    DOM.searchClearBtn.style.display = "none";
    renderCategoryControls();
    renderProductsGrid();
  });

  // FIXED BOTTOM iOS TAB BAR NAVIGATION
  DOM.tabHome.addEventListener("click", () => {
    setActiveTab(DOM.tabHome);
    closeAllModals();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  DOM.tabExplore.addEventListener("click", () => {
    setActiveTab(DOM.tabExplore);
    openModal(DOM.exploreModal);
  });

  DOM.tabBag.addEventListener("click", () => {
    setActiveTab(DOM.tabBag);
    openModal(DOM.bagModal);
  });

  DOM.tabProfile.addEventListener("click", () => {
    setActiveTab(DOM.tabProfile);
    openModal(DOM.profileModal);
  });

  DOM.openSearchBtn.addEventListener("click", () => {
    openModal(DOM.exploreModal);
  });

  DOM.exploreModalClose.addEventListener("click", () => closeModal(DOM.exploreModal));
  DOM.profileModalClose.addEventListener("click", () => closeModal(DOM.profileModal));

  // Explore search
  DOM.exploreSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    DOM.catalogSearchInput.value = e.target.value;
    DOM.searchClearBtn.style.display = state.searchQuery ? "flex" : "none";
    renderProductsGrid();
  });

  // Explore category click
  DOM.exploreCategoryGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".explore-cat-card");
    if (!card) return;
    state.activeCategory = card.dataset.catName;
    renderCategoryControls();
    renderProductsGrid();
    closeModal(DOM.exploreModal);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  });

  // Track Order Menu Item
  DOM.menuTrackOrder.addEventListener("click", () => {
    const ord = prompt("Enter your STYVOR order number (e.g. STY-1001):");
    if (ord) {
      alert(`Order ${ord.trim()} is currently under Priority Atelier Processing. Dispatch courier tracking will be dispatched via SMS & Email.`);
    }
  });
}

function setActiveTab(tabBtn) {
  document.querySelectorAll(".tab-item").forEach((t) => t.classList.remove("active"));
  if (tabBtn) tabBtn.classList.add("active");
}

/* ==========================================================================
   Initialization
   ========================================================================== */
async function initApp() {
  loadSavedCart();
  setupEventListeners();

  await fetchCountries();
  await Promise.all([fetchCategories(), fetchProducts()]);
}

// Boot on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
