const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;

if (supabaseUrl && supabaseKey) {
  try {
    client = createClient(supabaseUrl, supabaseKey);
    console.log("[Styvor] Connected to live Supabase project");
  } catch (err) {
    console.warn("[Styvor] Failed to initialize Supabase client, using in-memory mock:", err.message);
  }
}

if (!client) {
  console.warn("[Styvor] Supabase credentials not configured — active in-memory catalog store enabled.");

  // Currencies list with authoritative exchange rates relative to INR
  const currencies = [
    { id: "cur_inr", code: "INR", name: "Indian Rupee", symbol: "₹", decimal_places: 2, rate_to_inr: 1.0, is_active: true },
    { id: "cur_usd", code: "USD", name: "US Dollar", symbol: "$", decimal_places: 2, rate_to_inr: 0.0116, is_active: true },
    { id: "cur_gbp", code: "GBP", name: "British Pound", symbol: "£", decimal_places: 2, rate_to_inr: 0.0091, is_active: true },
    { id: "cur_eur", code: "EUR", name: "Euro", symbol: "€", decimal_places: 2, rate_to_inr: 0.0108, is_active: true },
    { id: "cur_aed", code: "AED", name: "UAE Dirham", symbol: "د.إ", decimal_places: 2, rate_to_inr: 0.0426, is_active: true },
    { id: "cur_cad", code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimal_places: 2, rate_to_inr: 0.0162, is_active: true },
    { id: "cur_aud", code: "AUD", name: "Australian Dollar", symbol: "AU$", decimal_places: 2, rate_to_inr: 0.0182, is_active: true },
    { id: "cur_sgd", code: "SGD", name: "Singapore Dollar", symbol: "S$", decimal_places: 2, rate_to_inr: 0.0152, is_active: true },
    { id: "cur_jpy", code: "JPY", name: "Japanese Yen", symbol: "¥", decimal_places: 0, rate_to_inr: 1.78, is_active: true },
    { id: "cur_chf", code: "CHF", name: "Swiss Franc", symbol: "CHF", decimal_places: 2, rate_to_inr: 0.0102, is_active: true },
    { id: "cur_sar", code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimal_places: 2, rate_to_inr: 0.0435, is_active: true },
    { id: "cur_hkd", code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimal_places: 2, rate_to_inr: 0.0908, is_active: true },
  ];

  // Exactly 16 supported international countries
  const countries = [
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

  const categories = [
    { id: "cat_1", name: "iPhone Luxury Editions", slug: "iphone-luxury-editions", is_active: true, created_at: new Date().toISOString() },
    { id: "cat_2", name: "Leather Folios & Cases", slug: "leather-folios-cases", is_active: true, created_at: new Date().toISOString() },
    { id: "cat_3", name: "Titanium Accessories", slug: "titanium-accessories", is_active: true, created_at: new Date().toISOString() },
    { id: "cat_4", name: "Charging & Docks", slug: "charging-docks", is_active: true, created_at: new Date().toISOString() },
  ];

  const products = [
    {
      id: "prod_1",
      name: "iPhone 16 Pro — Desert Titanium Bespoke Edition",
      slug: "iphone-16-pro-desert-titanium-bespoke",
      description: "Custom hand-polished Grade 5 aerospace titanium chassis with micro-etched Styvor monogram, matte sapphire crystal rear inlay, and diamond-cut buttons.",
      category_id: "cat_1",
      sku: "STY-IP16P-DESERT",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: "prod_2",
      name: "iPhone 16 Pro Max — 24K Gold & Ceramic Edition",
      slug: "iphone-16-pro-max-24k-gold",
      description: "Mirror-finish 24-karat gold electroplating layered with proprietary nano-ceramic hardcoat for lifelong luster. Includes custom engraved certificate of authenticity.",
      category_id: "cat_1",
      sku: "STY-IP16PM-GOLD",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "prod_3",
      name: "French Calfskin Leather MagSafe Folio",
      slug: "french-calfskin-leather-magsafe-folio",
      description: "Supple full-grain French calfskin lined with Italian microfiber. Integrated rare-earth MagSafe magnet array with three concealed card pockets and RFID shielding.",
      category_id: "cat_2",
      sku: "STY-FOLIO-BLK",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "prod_4",
      name: "Grade 5 Titanium Magnetic Desk Easel",
      slug: "grade-5-titanium-magnetic-desk-easel",
      description: "Sculpted from a single solid billet of aerospace Grade 5 titanium. Fluid dual-axis friction pivot with weighted micro-suction silicon base pad.",
      category_id: "cat_3",
      sku: "STY-STAND-TI",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: "prod_5",
      name: "Bespoke Italian Saddle Leather Sleeve",
      slug: "italian-saddle-leather-sleeve",
      description: "Vegetable-tanned Tuscan saddle leather stitched with waxed linen thread. Hand-burnished edges that develop an extraordinary, distinct patina over decades of use.",
      category_id: "cat_2",
      sku: "STY-SLEEVE-TAN",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "prod_6",
      name: "Precision CNC Aluminum Dual Wireless Station",
      slug: "precision-cnc-dual-wireless-station",
      description: "Anodized space-grey aluminum base with dual 15W Qi2 rapid charging modules, braided aramid fiber cable, and integrated thermal dissipation chambers.",
      category_id: "cat_4",
      sku: "STY-DOCK-DUAL",
      is_active: true,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ];

  const product_variants = [
    { id: "var_1", product_id: "prod_1", name: "256GB / Desert Titanium", sku: "STY-IP16P-DESERT-256", attributes: { storage: "256GB" }, stock_quantity: 14, is_active: true },
    { id: "var_2", product_id: "prod_2", name: "512GB / 24K Gold Inlay", sku: "STY-IP16PM-GOLD-512", attributes: { storage: "512GB" }, stock_quantity: 7, is_active: true },
    { id: "var_3", product_id: "prod_3", name: "Midnight Noir", sku: "STY-FOLIO-BLK-01", attributes: { color: "Midnight Noir" }, stock_quantity: 48, is_active: true },
    { id: "var_4", product_id: "prod_4", name: "Satin Titanium", sku: "STY-STAND-TI-01", attributes: { finish: "Satin Titanium" }, stock_quantity: 32, is_active: true },
    { id: "var_5", product_id: "prod_5", name: "Tuscan Cognac", sku: "STY-SLEEVE-TAN-01", attributes: { color: "Tuscan Cognac" }, stock_quantity: 36, is_active: true },
    { id: "var_6", product_id: "prod_6", name: "Space Grey Anodized", sku: "STY-DOCK-DUAL-01", attributes: { finish: "Space Grey" }, stock_quantity: 22, is_active: true },
  ];

  // Base prices are authoritative in INR (₹)
  const product_prices = [
    { id: "pri_1", product_id: "prod_1", variant_id: "var_1", country_id: "cnt_in", price: 169900, compare_at_price: 184900 },
    { id: "pri_2", product_id: "prod_2", variant_id: "var_2", country_id: "cnt_in", price: 249900, compare_at_price: 269900 },
    { id: "pri_3", product_id: "prod_3", variant_id: "var_3", country_id: "cnt_in", price: 11900, compare_at_price: 13500 },
    { id: "pri_4", product_id: "prod_4", variant_id: "var_4", country_id: "cnt_in", price: 14500, compare_at_price: 16900 },
    { id: "pri_5", product_id: "prod_5", variant_id: "var_5", country_id: "cnt_in", price: 9500, compare_at_price: 10900 },
    { id: "pri_6", product_id: "prod_6", variant_id: "var_6", country_id: "cnt_in", price: 18900, compare_at_price: 21500 },
  ];

  const product_images = [
    { id: "img_1_1", product_id: "prod_1", image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80", alt_text: "iPhone 16 Pro Desert Titanium chassis rear", sort_order: 0 },
    { id: "img_1_2", product_id: "prod_1", image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80", alt_text: "iPhone 16 Pro Desert Titanium side profile", sort_order: 1 },
    { id: "img_2_1", product_id: "prod_2", image_url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80", alt_text: "iPhone 16 Pro Max 24K Gold edition luxury rear", sort_order: 0 },
    { id: "img_2_2", product_id: "prod_2", image_url: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=1000&q=80", alt_text: "Gold edition detail bezel close-up", sort_order: 1 },
    { id: "img_3_1", product_id: "prod_3", image_url: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=1000&q=80", alt_text: "French Calfskin Leather Folio closed view", sort_order: 0 },
    { id: "img_3_2", product_id: "prod_3", image_url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1000&q=80", alt_text: "French Calfskin Leather Folio interior card slots", sort_order: 1 },
    { id: "img_4_1", product_id: "prod_4", image_url: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1000&q=80", alt_text: "Titanium Magnetic Desk Stand front perspective", sort_order: 0 },
    { id: "img_4_2", product_id: "prod_4", image_url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80", alt_text: "Titanium Magnetic Desk Stand rear hinge precision", sort_order: 1 },
    { id: "img_5_1", product_id: "prod_5", image_url: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=1000&q=80", alt_text: "Tuscan Saddle Leather Sleeve texture detail", sort_order: 0 },
    { id: "img_6_1", product_id: "prod_6", image_url: "https://images.unsplash.com/photo-1622445262464-84b14e3235b3?auto=format&fit=crop&w=1000&q=80", alt_text: "Precision CNC Aluminum Dual Wireless Station top view", sort_order: 0 },
  ];

  // Shipping rates matrix for countries
  const shipping_rates = [
    // India
    { id: "shp_in_1", country_id: "cnt_in", shipping_name: "Complimentary Insured Courier", shipping_fee: 0, free_shipping_threshold: 0, estimated_min_days: 2, estimated_max_days: 4, is_active: true },
    { id: "shp_in_2", country_id: "cnt_in", shipping_name: "White-Glove VIP Express Hand Delivery", shipping_fee: 999, free_shipping_threshold: 50000, estimated_min_days: 1, estimated_max_days: 2, is_active: true },
    // International standard
    ...countries.filter(c => c.iso_code !== "IN").flatMap(c => [
      { id: `shp_${c.iso_code.toLowerCase()}_1`, country_id: c.id, shipping_name: "DHL Express Worldwide Insured", shipping_fee: 2500, free_shipping_threshold: 150000, estimated_min_days: 3, estimated_max_days: 6, is_active: true },
      { id: `shp_${c.iso_code.toLowerCase()}_2`, country_id: c.id, shipping_name: "Priority Air Courier", shipping_fee: 4500, free_shipping_threshold: 250000, estimated_min_days: 2, estimated_max_days: 4, is_active: true }
    ])
  ];

  // Payment methods per country
  const payment_methods = [
    // India
    { id: "pm_in_1", country_id: "cnt_in", provider: "Razorpay", method_code: "razorpay_upi", display_name: "Razorpay (UPI, Netbanking & Cards)", is_active: true },
    { id: "pm_in_2", country_id: "cnt_in", provider: "Styvor Concierge", method_code: "wire_transfer", display_name: "Private Concierge Wire Transfer", is_active: true },
    // International
    ...countries.filter(c => c.iso_code !== "IN").flatMap(c => [
      { id: `pm_${c.iso_code.toLowerCase()}_1`, country_id: c.id, provider: "Razorpay International", method_code: "razorpay_intl", display_name: "International Credit/Debit Card (Visa, Mastercard, Amex)", is_active: true },
      { id: `pm_${c.iso_code.toLowerCase()}_2`, country_id: c.id, provider: "Stripe", method_code: "stripe_card", display_name: "Stripe Global Pay (Cards, Apple Pay)", is_active: true },
      { id: `pm_${c.iso_code.toLowerCase()}_3`, country_id: c.id, provider: "Styvor Concierge", method_code: "wire_transfer", display_name: "Private Concierge Swift Wire Transfer", is_active: true },
    ])
  ];

  const orders = [
    {
      id: "ord_init_1",
      order_number: "STY-2026-8812",
      customer_name: "Aarav Singhania",
      customer_email: "aarav.singhania@luxuryholdings.in",
      customer_phone: "+91 98200 45110",
      country_code: "IN",
      shipping_address: "Penthouse 4B, Worli Sea Face, Worli",
      city: "Mumbai",
      state: "Maharashtra",
      postal_code: "400018",
      subtotal_inr: 169900,
      shipping_fee_inr: 0,
      total_inr: 169900,
      currency_code: "INR",
      exchange_rate: 1.0,
      total_local: 169900,
      payment_method: "Razorpay (UPI / Cards)",
      payment_status: "Paid",
      fulfillment_status: "Processing",
      payment_id: "pay_rzp_mock_8812",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "ord_init_2",
      order_number: "STY-2026-9430",
      customer_name: "Alexander Vance",
      customer_email: "a.vance@mayfairpartners.co.uk",
      customer_phone: "+44 7700 900142",
      country_code: "GB",
      shipping_address: "14 Grosvenor Square, Mayfair",
      city: "London",
      state: "Greater London",
      postal_code: "W1K 6DJ",
      subtotal_inr: 249900,
      shipping_fee_inr: 2500,
      total_inr: 252400,
      currency_code: "GBP",
      exchange_rate: 0.0091,
      total_local: 2296.84,
      payment_method: "International Credit Card",
      payment_status: "Paid",
      fulfillment_status: "Shipped",
      payment_id: "pay_rzp_intl_9430",
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    }
  ];

  const order_items = [
    {
      id: "oi_1",
      order_id: "ord_init_1",
      product_id: "prod_1",
      product_name: "iPhone 16 Pro — Desert Titanium Bespoke Edition",
      variant_name: "256GB / Desert Titanium",
      sku: "STY-IP16P-DESERT-256",
      quantity: 1,
      unit_price_inr: 169900,
      total_price_inr: 169900,
      currency_code: "INR",
    },
    {
      id: "oi_2",
      order_id: "ord_init_2",
      product_id: "prod_2",
      product_name: "iPhone 16 Pro Max — 24K Gold & Ceramic Edition",
      variant_name: "512GB / 24K Gold Inlay",
      sku: "STY-IP16PM-GOLD-512",
      quantity: 1,
      unit_price_inr: 249900,
      total_price_inr: 249900,
      currency_code: "GBP",
    }
  ];

  const tables = {
    currencies,
    countries,
    categories,
    products,
    product_variants,
    product_prices,
    product_images,
    shipping_rates,
    payment_methods,
    orders,
    order_items,
  };

  const uploadedFiles = new Map();

  class MockQueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.inFilters = [];
      this.orderRules = [];
      this.fieldsToSelect = "*";
      this.action = "select";
      this.insertData = null;
      this.updateData = null;
      this.singleMode = false;
      this.maybeSingleMode = false;
    }

    select(fields = "*") {
      this.fieldsToSelect = fields;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value });
      return this;
    }

    in(column, values) {
      this.inFilters.push({ column, values: Array.isArray(values) ? values : [values] });
      return this;
    }

    order(column, { ascending = true } = {}) {
      this.orderRules.push({ column, ascending });
      return this;
    }

    insert(data) {
      this.action = "insert";
      this.insertData = data;
      return this;
    }

    update(data) {
      this.action = "update";
      this.updateData = data;
      return this;
    }

    delete() {
      this.action = "delete";
      return this;
    }

    single() {
      this.singleMode = true;
      return this;
    }

    maybeSingle() {
      this.maybeSingleMode = true;
      return this;
    }

    async execute() {
      if (!tables[this.tableName]) {
        tables[this.tableName] = [];
      }
      const collection = tables[this.tableName];

      if (this.action === "insert") {
        const toInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
        const inserted = toInsert.map((item) => {
          const record = {
            id: item.id || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
            ...item,
          };
          collection.push(record);
          return record;
        });

        const resultData = Array.isArray(this.insertData) ? inserted : inserted[0];
        if (this.singleMode || this.maybeSingleMode) {
          return { data: inserted[0] || null, error: null };
        }
        return { data: resultData, error: null };
      }

      if (this.action === "update") {
        let matched = collection;
        for (const f of this.filters) {
          matched = matched.filter((row) => String(row[f.column]).toLowerCase() === String(f.value).toLowerCase());
        }
        for (const item of matched) {
          Object.assign(item, this.updateData);
        }
        return { data: matched, error: null };
      }

      if (this.action === "delete") {
        let deletedRecords = [];
        tables[this.tableName] = collection.filter((row) => {
          let matches = true;
          for (const f of this.filters) {
            if (String(row[f.column]).toLowerCase() !== String(f.value).toLowerCase()) {
              matches = false;
              break;
            }
          }
          if (matches) {
            deletedRecords.push(row);
            return false;
          }
          return true;
        });

        if (this.singleMode || this.maybeSingleMode) {
          return { data: deletedRecords[0] || null, error: null };
        }
        return { data: deletedRecords, error: null };
      }

      // SELECT
      let rows = [...collection];
      for (const f of this.filters) {
        rows = rows.filter((row) => {
          if (typeof f.value === "boolean") {
            return Boolean(row[f.column]) === f.value;
          }
          return String(row[f.column]).toLowerCase() === String(f.value).toLowerCase();
        });
      }

      for (const inF of this.inFilters) {
        const valSet = new Set(inF.values.map((v) => String(v).toLowerCase()));
        rows = rows.filter((row) => valSet.has(String(row[inF.column]).toLowerCase()));
      }

      for (const rule of this.orderRules) {
        rows.sort((a, b) => {
          const valA = a[rule.column] ?? "";
          const valB = b[rule.column] ?? "";
          if (valA < valB) return rule.ascending ? -1 : 1;
          if (valA > valB) return rule.ascending ? 1 : -1;
          return 0;
        });
      }

      if (this.singleMode) {
        const item = rows[0] || null;
        return { data: item, error: item ? null : new Error("Record not found") };
      }

      if (this.maybeSingleMode) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }
  }

  client = {
    from: (table) => new MockQueryBuilder(table),
    storage: {
      from: (bucket) => ({
        upload: async (storagePath, buffer, options = {}) => {
          const publicUrl = `https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80`;
          uploadedFiles.set(storagePath, { publicUrl });
          return { data: { path: storagePath }, error: null };
        },
        getPublicUrl: (storagePath) => {
          const found = uploadedFiles.get(storagePath);
          return {
            data: {
              publicUrl: found ? found.publicUrl : `https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80`,
            },
          };
        },
        remove: async (paths = []) => {
          for (const p of paths) uploadedFiles.delete(p);
          return { data: paths, error: null };
        },
      }),
    },
  };
}

module.exports = client;