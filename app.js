/**
 * STYVOR — PURE VANILLA JAVASCRIPT APPLICATION (ES6)
 * Apple iOS Glassmorphism Luxury Architecture
 * 
 * Resilient Dual-Mode Engine:
 * 1. Synchronous Standalone Catalog Store: Guarantees 0-latency instant render
 *    on GitHub Pages, mobile phones, and static hosting (Products NEVER disappear!).
 * 2. Dynamic Live Sync: Seamlessly connects to Node.js backend / Supabase API
 *    when available, with graceful offline / static fallback.
 * 3. Dynamic Currency Conversion: Converts base INR to local currencies
 *    (AUD, USD, GBP, EUR, AED, CAD, SGD, etc.) with strict ₹0 / $0 fallback protection.
 */

// API Endpoint configuration with auto-detection for relative or remote backends
const API_URL = (typeof window !== "undefined" && window.STYVOR_API_URL) || "/api";
const COUNTRY_STORAGE_KEY = "styvor_country";
const CART_STORAGE_KEY = "styvor_cart";

// Detect if running on GitHub Pages, static host, or file:// protocol
const isStaticHost =
  typeof window !== "undefined" &&
  !window.STYVOR_API_URL &&
  (window.location.protocol === "file:" ||
   window.location.hostname.endsWith("github.io") ||
   window.location.hostname.endsWith("pages.dev"));


// Dynamic Currency Conversion Configuration relative to 1 INR (Indian Rupee)
const CURRENCY_CONFIG = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 1.0, decimals: 0, flag: "🇮🇳" },
  USD: { code: "USD", symbol: "$", name: "US Dollar", rate: 0.0116, decimals: 2, flag: "🇺🇸" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.0108, decimals: 2, flag: "🇪🇺" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rate: 0.0091, decimals: 2, flag: "🇬🇧" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 0.0182, decimals: 2, flag: "🇦🇺" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", rate: 0.0162, decimals: 2, flag: "🇨🇦" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 1.78, decimals: 0, flag: "🇯🇵" },
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", rate: 0.0426, decimals: 2, flag: "🇦🇪" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 0.0152, decimals: 2, flag: "🇸🇬" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", rate: 0.0195, decimals: 2, flag: "🇳🇿" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", rate: 0.0102, decimals: 2, flag: "🇨🇭" },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", rate: 0.0435, decimals: 2, flag: "🇸🇦" },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", rate: 0.0908, decimals: 2, flag: "🇭🇰" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 0.068, decimals: 2, flag: "🇧🇷" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", rate: 0.235, decimals: 2, flag: "🇲🇽" },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty", rate: 0.046, decimals: 2, flag: "🇵🇱" },
};

// Quick-Pick destinations for the entry popup and country selector
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

/* ==========================================================================
   STANDALONE CATALOG STORE (Ensures GitHub Pages & Mobile Work 100% Offline)
   ========================================================================== */

const STANDALONE_COUNTRIES = [
  { id: "cnt_in", name: "India", iso_code: "IN", flag: "🇮🇳", currency_id: "cur_inr", currencies: { code: "INR", name: "Indian Rupee", symbol: "₹", decimal_places: 2, rate_to_inr: 1.0 }, is_active: true },
  { id: "cnt_us", name: "United States", iso_code: "US", flag: "🇺🇸", currency_id: "cur_usd", currencies: { code: "USD", name: "US Dollar", symbol: "$", decimal_places: 2, rate_to_inr: 0.0116 }, is_active: true },
  { id: "cnt_gb", name: "United Kingdom", iso_code: "GB", flag: "🇬🇧", currency_id: "cur_gbp", currencies: { code: "GBP", name: "British Pound", symbol: "£", decimal_places: 2, rate_to_inr: 0.0091 }, is_active: true },
  { id: "cnt_ae", name: "United Arab Emirates", iso_code: "AE", flag: "🇦🇪", currency_id: "cur_aed", currencies: { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimal_places: 2, rate_to_inr: 0.0426 }, is_active: true },
  { id: "cnt_ca", name: "Canada", iso_code: "CA", flag: "🇨🇦", currency_id: "cur_cad", currencies: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimal_places: 2, rate_to_inr: 0.0162 }, is_active: true },
  { id: "cnt_au", name: "Australia", iso_code: "AU", flag: "🇦🇺", currency_id: "cur_aud", currencies: { code: "AUD", name: "Australian Dollar", symbol: "AU$", decimal_places: 2, rate_to_inr: 0.0182 }, is_active: true },
  { id: "cnt_de", name: "Germany", iso_code: "DE", flag: "🇩🇪", currency_id: "cur_eur", currencies: { code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108 }, is_active: true },
  { id: "cnt_fr", name: "France", iso_code: "FR", flag: "🇫🇷", currency_id: "cur_eur", currencies: { code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108 }, is_active: true },
  { id: "cnt_it", name: "Italy", iso_code: "IT", flag: "🇮🇹", currency_id: "cur_eur", currencies: { code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108 }, is_active: true },
  { id: "cnt_sg", name: "Singapore", iso_code: "SG", flag: "🇸🇬", currency_id: "cur_sgd", currencies: { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimal_places: 2, rate_to_inr: 0.0152 }, is_active: true },
  { id: "cnt_jp", name: "Japan", iso_code: "JP", flag: "🇯🇵", currency_id: "cur_jpy", currencies: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimal_places: 0, rate_to_inr: 1.78 }, is_active: true },
  { id: "cnt_ch", name: "Switzerland", iso_code: "CH", flag: "🇨🇭", currency_id: "cur_chf", currencies: { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimal_places: 2, rate_to_inr: 0.0102 }, is_active: true },
  { id: "cnt_sa", name: "Saudi Arabia", iso_code: "SA", flag: "🇸🇦", currency_id: "cur_sar", currencies: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimal_places: 2, rate_to_inr: 0.0435 }, is_active: true },
  { id: "cnt_nl", name: "Netherlands", iso_code: "NL", flag: "🇳🇱", currency_id: "cur_eur", currencies: { code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108 }, is_active: true },
  { id: "cnt_es", name: "Spain", iso_code: "ES", flag: "🇪🇸", currency_id: "cur_eur", currencies: { code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108 }, is_active: true },
  { id: "cnt_hk", name: "Hong Kong", iso_code: "HK", flag: "🇭🇰", currency_id: "cur_hkd", currencies: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimal_places: 2, rate_to_inr: 0.0908 }, is_active: true },
];

const STANDALONE_CATEGORIES = [
  { id: "cat_1", name: "iPhone Luxury Editions", slug: "iphone-luxury-editions", is_active: true },
  { id: "cat_2", name: "Leather Folios & Cases", slug: "leather-folios-cases", is_active: true },
  { id: "cat_3", name: "Titanium Accessories", slug: "titanium-accessories", is_active: true },
  { id: "cat_4", name: "Charging & Docks", slug: "charging-docks", is_active: true },
];

const STANDALONE_PRODUCTS = [
  {
    id: "prod_1",
    name: "iPhone 16 Pro — Desert Titanium Bespoke Edition",
    slug: "iphone-16-pro-desert-titanium-bespoke",
    description: "Custom hand-polished Grade 5 aerospace titanium chassis with micro-etched Styvor monogram, matte sapphire crystal rear inlay, and diamond-cut buttons.",
    category_id: "cat_1",
    category: { id: "cat_1", name: "iPhone Luxury Editions" },
    sku: "STY-IP16P-DESERT",
    price_inr: 169900,
    compare_at_price_inr: 184900,
    is_active: true,
    product_images: [
      { id: "img_1_1", image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_1_2", image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_1_1", product_id: "prod_1", name: "256GB / Desert Titanium", sku: "STY-IP16P-DESERT-256", price_inr: 169900, compare_at_price_inr: 184900, stock_quantity: 14 },
      { id: "var_1_2", product_id: "prod_1", name: "512GB / Desert Titanium", sku: "STY-IP16P-DESERT-512", price_inr: 189900, compare_at_price_inr: 204900, stock_quantity: 8 },
      { id: "var_1_3", product_id: "prod_1", name: "1TB / Desert Titanium", sku: "STY-IP16P-DESERT-1TB", price_inr: 219900, compare_at_price_inr: 234900, stock_quantity: 5 },
    ],
  },
  {
    id: "prod_2",
    name: "iPhone 16 Pro Max — 24K Gold & Ceramic Edition",
    slug: "iphone-16-pro-max-24k-gold",
    description: "Mirror-finish 24-karat gold electroplating layered with proprietary nano-ceramic hardcoat for lifelong luster. Includes custom engraved certificate of authenticity.",
    category_id: "cat_1",
    category: { id: "cat_1", name: "iPhone Luxury Editions" },
    sku: "STY-IP16PM-GOLD",
    price_inr: 249900,
    compare_at_price_inr: 269900,
    is_active: true,
    product_images: [
      { id: "img_2_1", image_url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_2_2", image_url: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_2_1", product_id: "prod_2", name: "512GB / 24K Gold Inlay", sku: "STY-IP16PM-GOLD-512", price_inr: 249900, compare_at_price_inr: 269900, stock_quantity: 7 },
      { id: "var_2_2", product_id: "prod_2", name: "1TB / 24K Gold Inlay", sku: "STY-IP16PM-GOLD-1TB", price_inr: 279900, compare_at_price_inr: 299900, stock_quantity: 4 },
    ],
  },
  {
    id: "prod_3",
    name: "French Calfskin Leather MagSafe Folio",
    slug: "french-calfskin-leather-magsafe-folio",
    description: "Supple full-grain French calfskin lined with Italian microfiber. Integrated rare-earth MagSafe magnet array with three concealed card pockets and RFID shielding.",
    category_id: "cat_2",
    category: { id: "cat_2", name: "Leather Folios & Cases" },
    sku: "STY-FOLIO-BLK",
    price_inr: 11900,
    compare_at_price_inr: 13500,
    is_active: true,
    product_images: [
      { id: "img_3_1", image_url: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_3_2", image_url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_3_1", product_id: "prod_3", name: "Midnight Noir", sku: "STY-FOLIO-BLK-01", price_inr: 11900, compare_at_price_inr: 13500, stock_quantity: 48 },
      { id: "var_3_2", product_id: "prod_3", name: "Chestnut Brown", sku: "STY-FOLIO-BRN-02", price_inr: 11900, compare_at_price_inr: 13500, stock_quantity: 35 },
    ],
  },
  {
    id: "prod_4",
    name: "Grade 5 Titanium Magnetic Desk Easel",
    slug: "grade-5-titanium-magnetic-desk-easel",
    description: "Sculpted from a single solid billet of aerospace Grade 5 titanium. Fluid dual-axis friction pivot with weighted micro-suction silicon base pad.",
    category_id: "cat_3",
    category: { id: "cat_3", name: "Titanium Accessories" },
    sku: "STY-STAND-TI",
    price_inr: 14500,
    compare_at_price_inr: 16900,
    is_active: true,
    product_images: [
      { id: "img_4_1", image_url: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_4_2", image_url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_4_1", product_id: "prod_4", name: "Satin Titanium", sku: "STY-STAND-TI-01", price_inr: 14500, compare_at_price_inr: 16900, stock_quantity: 32 },
      { id: "var_4_2", product_id: "prod_4", name: "Matte DLC Black", sku: "STY-STAND-TI-02", price_inr: 15900, compare_at_price_inr: 18500, stock_quantity: 20 },
    ],
  },
  {
    id: "prod_5",
    name: "Bespoke Italian Saddle Leather Sleeve",
    slug: "italian-saddle-leather-sleeve",
    description: "Vegetable-tanned Tuscan saddle leather stitched with waxed linen thread. Hand-burnished edges that develop an extraordinary, distinct patina over decades of use.",
    category_id: "cat_2",
    category: { id: "cat_2", name: "Leather Folios & Cases" },
    sku: "STY-SLEEVE-TAN",
    price_inr: 9500,
    compare_at_price_inr: 10900,
    is_active: true,
    product_images: [
      { id: "img_5_1", image_url: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_5_2", image_url: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_5_1", product_id: "prod_5", name: "Tuscan Cognac", sku: "STY-SLEEVE-TAN-01", price_inr: 9500, compare_at_price_inr: 10900, stock_quantity: 36 },
      { id: "var_5_2", product_id: "prod_5", name: "Obsidian Black", sku: "STY-SLEEVE-BLK-02", price_inr: 9500, compare_at_price_inr: 10900, stock_quantity: 28 },
    ],
  },
  {
    id: "prod_6",
    name: "Precision CNC Aluminum Dual Wireless Station",
    slug: "precision-cnc-dual-wireless-station",
    description: "Anodized space-grey aluminum base with dual 15W Qi2 rapid charging modules, braided aramid fiber cable, and integrated thermal dissipation chambers.",
    category_id: "cat_4",
    category: { id: "cat_4", name: "Charging & Docks" },
    sku: "STY-DOCK-DUAL",
    price_inr: 18900,
    compare_at_price_inr: 21500,
    is_active: true,
    product_images: [
      { id: "img_6_1", image_url: "https://images.unsplash.com/photo-1622445262464-84b14e3235b3?auto=format&fit=crop&w=1000&q=80", sort_order: 0 },
      { id: "img_6_2", image_url: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1000&q=80", sort_order: 1 },
    ],
    product_variants: [
      { id: "var_6_1", product_id: "prod_6", name: "Space Grey Anodized", sku: "STY-DOCK-DUAL-01", price_inr: 18900, compare_at_price_inr: 21500, stock_quantity: 22 },
      { id: "var_6_2", product_id: "prod_6", name: "Silver Frost", sku: "STY-DOCK-DUAL-02", price_inr: 18900, compare_at_price_inr: 21500, stock_quantity: 18 },
    ],
  },
];

// Global Application State (Pre-populated synchronously so UI never appears empty)
const state = {
  countries: [...STANDALONE_COUNTRIES],
  selectedCountry: null,
  draftCountryCode: "IN",
  categories: [...STANDALONE_CATEGORIES],
  activeCategory: "All",
  products: [...STANDALONE_PRODUCTS],
  cart: [],
  searchQuery: "",
  activeProduct: null,
  selectedVariantId: null,
  isCheckoutLoading: false,
};

/* ==========================================================================
   Helper Functions & Dynamic Currency Conversion Logic
   ========================================================================== */

function getCountryCode(country) {
  return String(country?.iso_code || country?.code || "").toUpperCase();
}

function getCurrencyCode(country) {
  const currencies = country?.currencies;
  if (Array.isArray(currencies) && currencies.length > 0) {
    return currencies[0]?.code || "INR";
  }
  return currencies?.code || country?.currency || "INR";
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
 * If 0, null, or invalid, gracefully defaults to DEFAULT_INR_PRICE.
 * GUARANTEE: Never returns 0.
 */
function getProductInrPrice(product, variantId = null) {
  if (!product) return DEFAULT_INR_PRICE;
  const variants = product.product_variants || product.variants || [];
  const variant = variantId
    ? variants.find((v) => String(v.id) === String(variantId))
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
  if (!product) return null;
  const variants = product.product_variants || product.variants || [];
  const variant = variantId
    ? variants.find((v) => String(v.id) === String(variantId))
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
 * Dynamically converts INR base price to the target currency.
 */
function convertInrToCurrency(baseInr, targetCurrency, exchangeRate) {
  const numInr = Number(baseInr) > 0 ? Number(baseInr) : DEFAULT_INR_PRICE;
  const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : (CURRENCY_CONFIG[targetCurrency]?.rate || 1.0);
  
  if (targetCurrency === "INR") {
    return numInr;
  }
  
  const converted = numInr * rate;
  return converted > 0 ? converted : numInr;
}

/**
 * Formats a local price using the currency's official symbol and decimals.
 */
function formatLocalPrice(amount, currencyCode) {
  const config = CURRENCY_CONFIG[currencyCode] || { symbol: currencyCode, decimals: 2 };
  const symbol = config.symbol || currencyCode;
  const val = Number(amount) || 0;

  if (currencyCode === "INR") {
    return `${symbol}${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  const decimals = typeof config.decimals === "number" ? config.decimals : 2;
  const formattedNumber = val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol}${formattedNumber}`;
}

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function getProductImages(product) {
  if (Array.isArray(product.product_images) && product.product_images.length > 0) {
    return product.product_images
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img) => img.image_url || img.url)
      .filter(Boolean);
  }
  if (product.image_url) return [product.image_url];
  return [];
}

/* ==========================================================================
   DOM Element Cache
   ========================================================================== */
const DOM = {
  backdrop: document.getElementById("modal-backdrop"),

  announcementBtn: document.getElementById("announcement-country-btn"),
  announcementFlag: document.getElementById("announcement-flag"),
  announcementCountryName: document.getElementById("announcement-country-name"),

  headerCountryBtn: document.getElementById("header-country-btn"),
  headerCountryFlag: document.getElementById("header-country-flag"),
  headerCountryCode: document.getElementById("header-country-code"),
  headerCurrencySymbol: document.getElementById("header-currency-symbol"),

  openSearchBtn: document.getElementById("open-search-btn"),
  openBagBtn: document.getElementById("open-bag-btn"),
  headerCartBadge: document.getElementById("header-cart-badge"),

  heroCountryFlag: document.getElementById("hero-country-flag"),
  heroCountryLabel: document.getElementById("hero-country-label"),
  heroExploreBtn: document.getElementById("hero-explore-btn"),

  categorySegmented: document.getElementById("category-segmented"),
  catalogSearchInput: document.getElementById("catalog-search-input"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  catalogCount: document.getElementById("catalog-count"),
  productsGrid: document.getElementById("products-grid"),
  emptyProducts: document.getElementById("empty-products"),
  resetFiltersBtn: document.getElementById("reset-filters-btn"),

  footerFlag: document.getElementById("footer-flag"),
  footerCountryText: document.getElementById("footer-country-text"),
  footerChangeCountryBtn: document.getElementById("footer-change-country-btn"),
  footerBagLink: document.getElementById("footer-bag-link"),

  tabHome: document.getElementById("tab-home"),
  tabExplore: document.getElementById("tab-explore"),
  tabBag: document.getElementById("tab-bag"),
  tabBagBadge: document.getElementById("tab-bag-badge"),
  tabProfile: document.getElementById("tab-profile"),
  tabCountryFlag: document.getElementById("tab-country-flag"),

  currIndicatorText: document.getElementById("curr-indicator-text"),

  // Country Modal
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
   Toast Notification (iOS Liquid Style)
   ========================================================================== */
function showToast(message, duration = 3000) {
  let toast = document.getElementById("styvor-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "styvor-toast";
    toast.className = "styvor-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${message}</span>`;
  toast.classList.add("visible");
  
  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, duration);
}

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
   Data Fetching & Background Synchronization
   ========================================================================== */

/**
 * Loads countries with instant fallback to STANDALONE_COUNTRIES.
 * Never leaves state.countries empty.
 */
async function fetchCountries() {
  if (isStaticHost) {
    if (!state.countries || state.countries.length === 0) {
      state.countries = [...STANDALONE_COUNTRIES];
    }
    return;
  }

  try {
    const res = await fetch(`${API_URL}/countries`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.countries || [];
      if (list.length > 0) {
        state.countries = list;
      }
    }
  } catch (err) {
    // Expected on static hosting / offline — standalone store remains active
    console.info("[Styvor] Backend API offline. Standalone countries active.");
  }

  // Ensure state.countries is populated
  if (!state.countries || state.countries.length === 0) {
    state.countries = [...STANDALONE_COUNTRIES];
  }

  // Match saved preference or default to India
  let savedCode = "";
  try {
    savedCode = localStorage.getItem(COUNTRY_STORAGE_KEY) || "";
  } catch {}

  const matched = state.countries.find((c) => getCountryCode(c) === savedCode);
  const fallback = state.countries.find((c) => getCountryCode(c) === "IN") || state.countries[0];
  state.selectedCountry = matched || fallback || STANDALONE_COUNTRIES[0];
  state.draftCountryCode = getCountryCode(state.selectedCountry);

  updateCountryUI();
  renderCountryModalUI();

  // CRITICAL ENTRY POPUP: If first visit, show "Select Your Country" modal popup
  if (!savedCode) {
    setTimeout(() => {
      openModal(DOM.countryModal);
    }, 450);
  }
}

async function fetchCategories() {
  if (isStaticHost) return;
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.categories || [];
      if (list.length > 0) {
        state.categories = list;
        renderCategoryControls();
      }
    }
  } catch (err) {
    console.info("[Styvor] Using standalone categories.");
  }
}

async function fetchProducts() {
  if (isStaticHost) return;
  const countryCode = getCountryCode(state.selectedCountry || { iso_code: "IN" });


  try {
    const res = await fetch(`${API_URL}/products?country=${encodeURIComponent(countryCode)}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.products || [];
      if (rawList.length > 0) {
        // Fetch images for each product if backend provides images endpoint
        state.products = await Promise.all(
          rawList.map(async (prod) => {
            try {
              if (prod.product_images && prod.product_images.length > 0) return prod;
              const imgRes = await fetch(`${API_URL}/products/${encodeURIComponent(prod.id)}/images`);
              if (!imgRes.ok) return { ...prod, product_images: [] };
              const imgData = await imgRes.json();
              return {
                ...prod,
                product_images: Array.isArray(imgData.images) ? imgData.images : [],
              };
            } catch {
              return prod;
            }
          })
        );
        renderProductsGrid();
        return;
      }
    }
  } catch (err) {
    console.info("[Styvor] Backend /api/products unavailable. Standalone catalog preserved.");
  }

  // Ensure products are NEVER wiped out
  if (!state.products || state.products.length === 0) {
    state.products = [...STANDALONE_PRODUCTS];
  }
  renderProductsGrid();
}

/* ==========================================================================
   UI Updates: Country & Dynamic Currency
   ========================================================================== */

function updateCountryUI() {
  const c = state.selectedCountry || STANDALONE_COUNTRIES[0];
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
      <button type="button" class="quick-pick-chip ${isAct ? "active" : ""}" data-country-code="${dest.code}" aria-label="Select ${dest.name}">
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
      <div class="country-row-item ${isAct ? "active" : ""}" data-country-code="${code}" role="button" tabindex="0">
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

  const curr = getActiveCurrency();
  const config = CURRENCY_CONFIG[curr] || { symbol: curr };

  updateCountryUI();
  closeModal(DOM.countryModal);
  closeModal(DOM.profileModal);

  // Recalculate & re-render all product prices with new currency
  renderProductsGrid();
  updateCartTotalsUI();

  showToast(`✦ Region set to ${country.name} (${curr} ${config.symbol})`);

  // Optionally query backend for region-specific pricing if server is online
  if (!isStaticHost) {
    fetchProducts();
  }
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

      <div class="pm-actions-row">
        <button type="button" class="btn btn-primary btn-block" id="pm-add-to-bag-btn">
          <span>Add to Shopping Bag · ${formatLocalPrice(localPrice, curr)}</span>
        </button>
        <button type="button" class="btn btn-secondary btn-block" id="pm-buy-now-btn">
          <span>Instant Checkout ↗</span>
        </button>
      </div>

      <div class="pm-guarantees">
        <div class="pm-guarantee-item">
          <span>✦</span>
          <div>
            <strong>Complimentary Worldwide Delivery</strong>
            <p>Insured courier dispatch with real-time tracking.</p>
          </div>
        </div>
        <div class="pm-guarantee-item">
          <span>✦</span>
          <div>
            <strong>Authenticity & Warranty</strong>
            <p>Includes certificate of authenticity & 2-year warranty.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Gallery thumb click
  const activeImg = document.getElementById("pm-active-image");
  DOM.productModalBody.querySelectorAll(".pm-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      DOM.productModalBody.querySelectorAll(".pm-thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
      if (activeImg) activeImg.src = thumb.dataset.imgUrl;
    });
  });

  // Variant change
  const variantBtns = DOM.productModalBody.querySelectorAll(".pm-variant-btn");
  variantBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      variantBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedVariantId = btn.dataset.variantId;

      const newBase = getProductInrPrice(prod, state.selectedVariantId);
      const newCompare = getProductCompareInrPrice(prod, state.selectedVariantId);
      const newLocal = convertInrToCurrency(newBase, curr, rate);
      const newLocalComp = newCompare ? convertInrToCurrency(newCompare, curr, rate) : null;

      const priceLarge = DOM.productModalBody.querySelector(".pm-price-large");
      const inrNote = DOM.productModalBody.querySelector(".pm-inr-note");
      const addBtn = document.getElementById("pm-add-to-bag-btn");

      if (priceLarge) priceLarge.textContent = formatLocalPrice(newLocal, curr);
      if (inrNote) inrNote.textContent = `Base: ${formatInr(newBase)}`;
      if (addBtn) addBtn.querySelector("span").textContent = `Add to Shopping Bag · ${formatLocalPrice(newLocal, curr)}`;
    });
  });

  // Add to Bag Button
  document.getElementById("pm-add-to-bag-btn")?.addEventListener("click", () => {
    addToCart(prod, state.selectedVariantId);
    closeModal(DOM.productModal);
    openModal(DOM.bagModal);
  });

  // Buy Now Button
  document.getElementById("pm-buy-now-btn")?.addEventListener("click", () => {
    addToCart(prod, state.selectedVariantId);
    closeModal(DOM.productModal);
    openModal(DOM.checkoutModal);
  });

  openModal(DOM.productModal);
}

/* ==========================================================================
   Shopping Bag State & LocalStorage
   ========================================================================== */

function loadSavedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    state.cart = raw ? JSON.parse(raw) : [];
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
  const variants = product.product_variants || product.variants || [];
  const variant = variantId
    ? variants.find((v) => String(v.id) === String(variantId))
    : variants[0];

  const baseInr = getProductInrPrice(product, variant?.id);
  const images = getProductImages(product);

  const cartKey = `${product.id}_${variant?.id || "default"}`;
  const existing = state.cart.find((item) => item.key === cartKey);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      key: cartKey,
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      variantName: variant?.name || "",
      sku: variant?.sku || product.sku || "",
      imageUrl: images[0] || "",
      baseInrPrice: baseInr,
      quantity: 1,
    });
  }

  saveCart();
  showToast(`✦ Added to bag: ${product.name}`);
}

function changeCartQuantity(cartKey, delta) {
  const itemIndex = state.cart.findIndex((i) => i.key === cartKey);
  if (itemIndex < 0) return;

  state.cart[itemIndex].quantity += delta;
  if (state.cart[itemIndex].quantity <= 0) {
    state.cart.splice(itemIndex, 1);
  }

  saveCart();
}

function updateCartTotalsUI() {
  const curr = getActiveCurrency();
  const rate = getExchangeRate();
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Update badge counters
  DOM.headerCartBadge.textContent = String(totalItems);
  DOM.headerCartBadge.style.display = totalItems > 0 ? "flex" : "none";
  DOM.tabBagBadge.textContent = String(totalItems);
  DOM.tabBagBadge.style.display = totalItems > 0 ? "flex" : "none";
  DOM.bagModalCount.textContent = `(${totalItems})`;

  if (totalItems === 0) {
    DOM.emptyBagView.style.display = "flex";
    DOM.bagItemsList.innerHTML = "";
    DOM.bagModalFooter.style.display = "none";
    DOM.proceedToCheckoutBtn.disabled = true;
    return;
  }

  DOM.emptyBagView.style.display = "none";
  DOM.bagModalFooter.style.display = "block";
  DOM.proceedToCheckoutBtn.disabled = false;

  // Render items list
  DOM.bagItemsList.innerHTML = state.cart.map((item) => {
    const localUnitPrice = convertInrToCurrency(item.baseInrPrice, curr, rate);
    const localLineTotal = localUnitPrice * item.quantity;

    return `
      <div class="bag-item-card" data-key="${item.key}">
        <img src="${item.imageUrl || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80"}" alt="${item.name}" class="bag-item-img" />
        <div class="bag-item-details">
          <div class="bag-item-top">
            <h4 class="bag-item-title">${item.name}</h4>
            <button type="button" class="bag-item-remove" data-action="dec-qty" data-key="${item.key}" title="Remove item">×</button>
          </div>
          ${item.variantName ? `<span class="bag-item-variant">${item.variantName}</span>` : ""}
          <div class="bag-item-bottom">
            <div class="bag-item-price-wrap">
              <span class="bag-item-price">${formatLocalPrice(localLineTotal, curr)}</span>
              <span class="bag-item-inr">${formatInr(item.baseInrPrice * item.quantity)}</span>
            </div>
            <div class="bag-item-stepper">
              <button type="button" class="stepper-btn" data-action="dec-qty" data-key="${item.key}">−</button>
              <span class="stepper-val">${item.quantity}</span>
              <button type="button" class="stepper-btn" data-action="inc-qty" data-key="${item.key}">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Subtotal & Shipping calculation
  const subtotalInr = state.cart.reduce((sum, item) => sum + item.baseInrPrice * item.quantity, 0);
  const isFreeShipping = subtotalInr >= 50000 || state.selectedCountry?.iso_code === "IN";
  const shippingFeeInr = isFreeShipping ? 0 : 2500;
  const totalInr = subtotalInr + shippingFeeInr;

  const subtotalLocal = convertInrToCurrency(subtotalInr, curr, rate);
  const shippingFeeLocal = convertInrToCurrency(shippingFeeInr, curr, rate);
  const totalLocal = convertInrToCurrency(totalInr, curr, rate);

  // Bag Drawer totals
  DOM.bagSubtotalVal.textContent = formatLocalPrice(subtotalLocal, curr);
  DOM.bagShippingVal.textContent = shippingFeeInr === 0 ? "Complimentary" : formatLocalPrice(shippingFeeLocal, curr);
  DOM.bagTotalVal.textContent = formatLocalPrice(totalLocal, curr);
  DOM.bagCurrencyNote.textContent = `Includes international priority courier & customs duties. Converted to ${curr}.`;
  DOM.checkoutBtnPreview.textContent = formatLocalPrice(totalLocal, curr);

  // Checkout Sheet totals
  DOM.cosSubtotalVal.textContent = formatLocalPrice(subtotalLocal, curr);
  DOM.cosShippingVal.textContent = shippingFeeInr === 0 ? "Complimentary" : formatLocalPrice(shippingFeeLocal, curr);
  DOM.cosTotalVal.textContent = formatLocalPrice(totalLocal, curr);
  DOM.cosInrReference.textContent = `Base: ${formatInr(totalInr)}`;
  DOM.checkoutPayText.textContent = `Pay ${formatLocalPrice(totalLocal, curr)} via Razorpay`;
}

/* ==========================================================================
   Checkout & Razorpay Order Placement
   ========================================================================== */

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  if (state.cart.length === 0) return;

  const name = DOM.inputCustomerName.value.trim();
  const email = DOM.inputCustomerEmail.value.trim();
  const phone = DOM.inputCustomerPhone.value.trim();
  const address = DOM.inputShippingAddress.value.trim();
  const area = DOM.inputShippingArea.value.trim();
  const city = DOM.inputShippingCity.value.trim();
  const postal = DOM.inputShippingPostal.value.trim();
  const country = state.selectedCountry;

  // Strict required fields validation
  if (!name || !email || !phone || !address || !city || !postal) {
    showCheckoutError("Please complete all required shipping fields before proceeding to payment.");
    return;
  }

  hideCheckoutError();
  setCheckoutLoading(true);

  const curr = getActiveCurrency();
  const rate = getExchangeRate();
  const subtotalInr = state.cart.reduce((sum, item) => sum + item.baseInrPrice * item.quantity, 0);
  const isFreeShipping = subtotalInr >= 50000 || country?.iso_code === "IN";
  const shippingFeeInr = isFreeShipping ? 0 : 2500;
  const totalInr = subtotalInr + shippingFeeInr;
  const totalLocal = convertInrToCurrency(totalInr, curr, rate);

  const fullAddress = `${address}, ${area ? area + ", " : ""}${city}, ${postal}, ${country?.name || "Global"}`;

  try {
    // 1. Attempt to create order via backend API
    let orderData = null;
    try {
      const orderRes = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          country_code: getCountryCode(country),
          shipping_address: fullAddress,
          city,
          postal_code: postal,
          currency_code: curr,
          exchange_rate: rate,
          subtotal_inr: subtotalInr,
          shipping_fee_inr: shippingFeeInr,
          total_inr: totalInr,
          total_local: totalLocal,
          items: state.cart.map((i) => ({
            product_id: i.productId,
            variant_id: i.variantId,
            product_name: i.name,
            variant_name: i.variantName,
            sku: i.sku,
            quantity: i.quantity,
            unit_price_inr: i.baseInrPrice,
            total_price_inr: i.baseInrPrice * i.quantity,
          })),
        }),
      });

      if (orderRes.ok) {
        orderData = await orderRes.json();
      }
    } catch {
      // Backend offline / static mode fallback
    }

    const orderNumber = orderData?.order?.order_number || `STY-${Date.now().toString().slice(-6)}`;

    // 2. Launch Razorpay Checkout (or Simulated Sandbox when keys not configured)
    const razorpayKey = window.RAZORPAY_KEY_ID || "rzp_test_styvor";

    if (typeof window.Razorpay === "function" && window.RAZORPAY_KEY_ID) {
      const options = {
        key: razorpayKey,
        amount: Math.round(totalInr * 100), // In paise
        currency: "INR",
        name: "Styvor Luxury Store",
        description: `Order ${orderNumber} (${curr} ${formatLocalPrice(totalLocal, curr)})`,
        image: "./favicon.svg",
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: "#000000",
        },
        handler: function (response) {
          handleOrderSuccess(orderNumber, name, country.name, formatLocalPrice(totalLocal, curr));
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setCheckoutLoading(false);
        showCheckoutError(resp.error?.description || "Payment failed. Please retry.");
      });
      rzp.open();
    } else {
      // Graceful simulated payment processing for test & static environments
      setTimeout(() => {
        handleOrderSuccess(orderNumber, name, country.name, formatLocalPrice(totalLocal, curr));
      }, 1200);
    }
  } catch (err) {
    console.error("Checkout error:", err);
    setCheckoutLoading(false);
    showCheckoutError("An error occurred during checkout. Please try again.");
  }
}

function handleOrderSuccess(orderNumber, customerName, destination, amountPaid) {
  setCheckoutLoading(false);

  // Clear cart
  state.cart = [];
  saveCart();

  // Populate receipt modal
  DOM.receiptOrderNum.textContent = orderNumber;
  DOM.receiptCustomerName.textContent = customerName;
  DOM.receiptDestination.textContent = destination;
  DOM.receiptAmountPaid.textContent = amountPaid;

  closeModal(DOM.checkoutModal);
  openModal(DOM.successModal);
}

function showCheckoutError(msg) {
  DOM.checkoutErrorText.textContent = msg;
  DOM.checkoutErrorBanner.style.display = "block";
}

function hideCheckoutError() {
  DOM.checkoutErrorBanner.style.display = "none";
}

function setCheckoutLoading(loading) {
  state.isCheckoutLoading = loading;
  DOM.checkoutPayBtn.disabled = loading;
  DOM.checkoutSpinner.style.display = loading ? "inline-block" : "none";
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function setupEventListeners() {
  // Backdrop close
  DOM.backdrop.addEventListener("click", () => closeAllModals());

  // Country selector triggers
  const countryTriggers = [
    DOM.announcementBtn,
    DOM.headerCountryBtn,
    DOM.footerChangeCountryBtn,
    DOM.checkoutChangeCountryBtn,
    DOM.profileSwitchCountryBtn,
  ];

  countryTriggers.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => {
        state.draftCountryCode = getCountryCode(state.selectedCountry);
        renderCountryModalUI();
        openModal(DOM.countryModal);
      });
    }
  });

  DOM.countryModalClose.addEventListener("click", () => closeModal(DOM.countryModal));

  // Quick Pick Click — Instant 1-tap select & apply
  DOM.quickPicksGrid.addEventListener("click", (e) => {
    const chip = e.target.closest(".quick-pick-chip");
    if (!chip) return;
    const code = chip.dataset.countryCode;
    state.draftCountryCode = code;
    applySelectedCountry(code);
  });

  // Country Search Input
  DOM.countrySearchInput.addEventListener("input", (e) => {
    renderCountryList(e.target.value);
  });

  // Country Row Click — Instant 1-tap select & apply
  DOM.countriesScrollList.addEventListener("click", (e) => {
    const row = e.target.closest(".country-row-item");
    if (!row) return;
    const code = row.dataset.countryCode;
    state.draftCountryCode = code;
    applySelectedCountry(code);
  });


  // Country Row Double-Click/Double-Tap for instant apply
  DOM.countriesScrollList.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".country-row-item");
    if (!row) return;
    applySelectedCountry(row.dataset.countryCode);
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
  DOM.menuTrackOrder?.addEventListener("click", () => {
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
   Initialization (Synchronous First-Paint + Resilient Background Sync)
   ========================================================================== */
function initApp() {
  // 1. Initial synchronous paint: UI is rendered immediately, 0-latency!
  loadSavedCart();
  setupEventListeners();

  let savedCode = "";
  try {
    savedCode = localStorage.getItem(COUNTRY_STORAGE_KEY) || "";
  } catch {}

  const matched = state.countries.find((c) => getCountryCode(c) === savedCode);
  const fallback = state.countries.find((c) => getCountryCode(c) === "IN") || state.countries[0];
  state.selectedCountry = matched || fallback || STANDALONE_COUNTRIES[0];
  state.draftCountryCode = getCountryCode(state.selectedCountry);

  updateCountryUI();
  renderCategoryControls();
  renderProductsGrid();
  renderCountryModalUI();

  // Show entry modal on first visit
  if (!savedCode) {
    setTimeout(() => {
      openModal(DOM.countryModal);
    }, 450);
  }

  // 2. Background non-blocking sync with live backend / Supabase (only when backend is present)
  if (!isStaticHost) {
    fetchCountries()
      .then(() => {
        fetchCategories();
        fetchProducts();
      })
      .catch((err) => {
        console.info("[Styvor] Backend sync deferred:", err);
      });
  }
}

// Boot immediately
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
