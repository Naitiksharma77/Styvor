-- ============================================================================
-- STYVOR — Complete E-Commerce Database Schema Migration (Supabase PostgreSQL)
-- Safe, idempotent migration script for review. Run in Supabase SQL Editor.
-- ============================================================================

-- 1. Currencies & Exchange Rates
CREATE TABLE IF NOT EXISTS public.currencies (
    id TEXT PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_places INTEGER DEFAULT 2,
    rate_to_inr NUMERIC(12, 6) DEFAULT 1.000000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Countries & Regional Localization
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(2) NOT NULL UNIQUE,
    flag VARCHAR(10) DEFAULT '',
    currency_id TEXT REFERENCES public.currencies(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products (Authoritative Base Storefront)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    description TEXT,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Product Variants & Inventory Stock
CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default',
    sku VARCHAR(100),
    attributes JSONB DEFAULT '{}'::jsonb,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(12, 2), -- Authoritative INR base price fallback
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Product Regional Prices (Overrides per Country in INR or Local Currency)
CREATE TABLE IF NOT EXISTS public.product_prices (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL,
    compare_at_price NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variant_id, country_id)
);

-- 7. Product Image Gallery (Supabase Storage Asset references)
CREATE TABLE IF NOT EXISTS public.product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Shipping Rates Matrix
CREATE TABLE IF NOT EXISTS public.shipping_rates (
    id TEXT PRIMARY KEY,
    country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    shipping_name VARCHAR(120) NOT NULL,
    shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 0.00,
    estimated_min_days INTEGER DEFAULT 2,
    estimated_max_days INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Supported Payment Methods per Country
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY,
    country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    provider VARCHAR(60) NOT NULL, -- 'Razorpay', 'Stripe', 'PayPal', 'Concierge'
    method_code VARCHAR(60) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Orders (Customer purchases with historical snapshots)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number VARCHAR(40) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(180) NOT NULL,
    customer_phone VARCHAR(50),
    country_code VARCHAR(2) NOT NULL,
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(30) NOT NULL,
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    shipping_fee_inr NUMERIC(10, 2) DEFAULT 0.00,
    total_inr NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    exchange_rate NUMERIC(12, 6) DEFAULT 1.000000,
    total_local NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(80) NOT NULL,
    payment_status VARCHAR(40) DEFAULT 'Pending', -- 'Pending', 'Paid', 'Failed', 'Refunded'
    fulfillment_status VARCHAR(40) DEFAULT 'Processing', -- 'Processing', 'Shipped', 'Delivered', 'Cancelled'
    payment_id VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Order Items (Itemized historical price snapshot)
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(100) DEFAULT 'Default',
    sku VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_inr NUMERIC(12, 2) NOT NULL,
    total_price_inr NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public read access for active catalog items
CREATE POLICY "Public read active currencies" ON public.currencies FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active countries" ON public.countries FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Public read prices" ON public.product_prices FOR SELECT USING (true);
CREATE POLICY "Public read images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Public read shipping" ON public.shipping_rates FOR SELECT USING (is_active = true);
CREATE POLICY "Public read payments" ON public.payment_methods FOR SELECT USING (is_active = true);

-- Orders are protected: privileged backend access only (Service role bypasses RLS)
-- End of migration
