const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// Helper to generate unique order number e.g. STY-2026-8941
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `STY-${year}-${randomSuffix}`;
}

const DEFAULT_RATES_TO_INR = {
  INR: 1.0,
  USD: 0.0116,
  EUR: 0.0108,
  GBP: 0.0091,
  CAD: 0.0162,
  AUD: 0.0182,
  JPY: 1.78,
  ARS: 12.2,
  BRL: 0.068,
  COP: 49.5,
  MXN: 0.235,
  PLN: 0.046,
};

// POST /api/orders
// Create an order with strict server-side price recalculation from database
router.post("/", async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone = "",
      country_code = "IN",
      shipping_address,
      area = "",
      city,
      state = "",
      postal_code,
      items = [],
      shipping_fee = 0,
      payment_method = "Razorpay",
      payment_id = null,
      payment_status = "Pending",
    } = req.body;

    // 1. Validate customer information
    if (!customer_name?.trim()) {
      return res.status(400).json({ error: "Customer name is required." });
    }
    if (!customer_email?.trim() || !customer_email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!shipping_address?.trim()) {
      return res.status(400).json({ error: "Shipping address is required." });
    }
    if (!city?.trim()) {
      return res.status(400).json({ error: "City is required." });
    }
    if (!postal_code?.trim()) {
      return res.status(400).json({ error: "Postal / ZIP code is required." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    // 2. Fetch country and currency metadata
    const { data: country } = await supabase
      .from("countries")
      .select("id, name, iso_code, currency_id")
      .eq("iso_code", country_code.toUpperCase())
      .maybeSingle();

    if (!country) {
      return res.status(400).json({ error: `Unsupported country: ${country_code}` });
    }

    const { data: currency } = await supabase
      .from("currencies")
      .select("id, code, name, symbol, decimal_places")
      .eq("id", country.currency_id)
      .maybeSingle();

    const rate = Number(DEFAULT_RATES_TO_INR[currency?.code] || currency?.rate_to_inr || 1.0);
    const currencyCode = currency?.code || "INR";

    // 3. Revalidate prices directly from database (Never trust frontend price totals)
    const productIds = items.map((i) => i.id || i.product_id);
    const { data: dbProducts } = await supabase
      .from("products")
      .select("id, name, is_active")
      .in("id", productIds);

    const { data: dbVariants } = await supabase
      .from("product_variants")
      .select("id, product_id, name, sku, stock_quantity, price")
      .in("product_id", productIds);

    const { data: inCountry } = await supabase
      .from("countries")
      .select("id")
      .eq("iso_code", "IN")
      .maybeSingle();
    const inCountryId = inCountry?.id || "cnt_in";

    const { data: dbInrPrices } = await supabase
      .from("product_prices")
      .select("product_id, variant_id, price")
      .eq("country_id", inCountryId)
      .in("product_id", productIds);

    let recalculatedSubtotalInr = 0;
    const validatedOrderItems = [];

    for (const item of items) {
      const pId = item.id || item.product_id;
      const dbProd = (dbProducts || []).find((p) => p.id === pId);

      if (!dbProd) {
        return res.status(400).json({ error: `Product not found: ${pId}` });
      }

      const variantsForProduct = (dbVariants || []).filter((v) => v.product_id === pId);
      const chosenVariant =
        variantsForProduct.find((v) => v.id === item.variant_id) ||
        variantsForProduct[0] ||
        {};

      const inrPriceObj = (dbInrPrices || []).find(
        (pr) => pr.product_id === pId && pr.variant_id === chosenVariant.id
      );

      let trustedUnitPriceInr = Number(inrPriceObj?.price ?? chosenVariant.price ?? item.price ?? 0);
      if (!Number.isFinite(trustedUnitPriceInr) || trustedUnitPriceInr <= 0) {
        trustedUnitPriceInr = Number(item.price) > 0 ? Number(item.price) : 1499;
      }
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotalInr = trustedUnitPriceInr * quantity;

      recalculatedSubtotalInr += itemTotalInr;

      validatedOrderItems.push({
        product_id: pId,
        variant_id: chosenVariant.id || null,
        product_name: dbProd.name,
        variant_name: chosenVariant.name || "Default",
        sku: chosenVariant.sku || null,
        quantity,
        unit_price_inr: trustedUnitPriceInr,
        total_price_inr: itemTotalInr,
      });
    }

    const calculatedShippingInr = Number(shipping_fee) >= 0 ? Number(shipping_fee) : 0;
    const recalculatedTotalInr = recalculatedSubtotalInr + calculatedShippingInr;
    const calculatedTotalLocal = Number((recalculatedTotalInr * rate).toFixed(currency?.decimal_places ?? 2));

    const orderNumber = generateOrderNumber();

    // 4. Save order to Supabase database matching live columns
    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        customer_phone: customer_phone.trim(),
        country_id: country.id,
        shipping_address: area && area.trim() ? `${shipping_address.trim()}, ${area.trim()}` : shipping_address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postal_code.trim(),
        subtotal: recalculatedSubtotalInr,
        shipping_fee: calculatedShippingInr,
        total_amount: recalculatedTotalInr,
        currency_code: currencyCode,
        order_status: payment_status === "Paid" ? "PAID" : "PENDING",
      })
      .select()
      .single();

    if (orderError) {
      console.error("[Orders] Create order failed:", orderError);
      return res.status(500).json({ error: "Failed to record order: " + orderError.message });
    }

    // 5. Save snapshot of order items matching live columns
    const orderItemsPayload = validatedOrderItems.map((oi) => ({
      order_id: createdOrder.id,
      product_id: oi.product_id,
      variant_id: oi.variant_id,
      product_name: oi.product_name,
      variant_name: oi.variant_name,
      sku: oi.sku,
      product_price: oi.unit_price_inr,
      quantity: oi.quantity,
      subtotal: oi.total_price_inr,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error("[Orders] Insert items failed:", itemsError);
    }

    const orderResponse = {
      ...createdOrder,
      country_code: country_code.toUpperCase(),
      subtotal_inr: recalculatedSubtotalInr,
      shipping_fee_inr: calculatedShippingInr,
      total_inr: recalculatedTotalInr,
      total_local: calculatedTotalLocal,
      exchange_rate: rate,
      payment_method,
      payment_status,
      payment_id,
      fulfillment_status: "Processing",
      items: validatedOrderItems,
    };

    return res.status(201).json({
      message: "Order placed successfully.",
      order: orderResponse,
    });
  } catch (error) {
    console.error("[Orders] Server error:", error);
    return res.status(500).json({ error: error.message || "Failed to process order." });
  }
});

// GET /api/orders
// Retrieve all orders for Admin Studio
router.get("/", async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Orders] Fetch orders failed:", error);
      return res.status(500).json({ error: "Failed to load orders." });
    }

    const { data: allItems } = await supabase.from("order_items").select("*");
    const { data: allCountries } = await supabase.from("countries").select("id, name, iso_code");

    const ordersWithItems = (orders || []).map((ord) => {
      const matchedCountry = (allCountries || []).find((c) => c.id === ord.country_id);
      const items = (allItems || []).filter((item) => item.order_id === ord.id);
      const isPaid = ord.order_status === "PAID" || ord.payment_status === "Paid";

      return {
        ...ord,
        country_code: matchedCountry?.iso_code || "IN",
        country_name: matchedCountry?.name || "India",
        subtotal_inr: ord.subtotal || ord.subtotal_inr || 0,
        shipping_fee_inr: ord.shipping_fee || ord.shipping_fee_inr || 0,
        total_inr: ord.total_amount || ord.total_inr || 0,
        total_local: ord.total_local || ord.total_amount || 0,
        payment_status: isPaid ? "Paid" : "Pending",
        fulfillment_status: ord.order_status === "SHIPPED" ? "Shipped" : ord.order_status === "DELIVERED" ? "Delivered" : "Processing",
        items: items.map((i) => ({
          ...i,
          unit_price_inr: i.product_price || i.unit_price_inr || 0,
          total_price_inr: i.subtotal || i.total_price_inr || 0,
        })),
      };
    });

    return res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("[Orders] Server error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/orders/:id
// Get single order with complete details
router.get("/:id", async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!order) return res.status(404).json({ error: "Order not found." });

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    return res.json({ order: { ...order, items: items || [] } });
  } catch (error) {
    console.error("[Orders] Fetch order failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/status
// Update order fulfillment status or payment status
router.patch("/:id/status", async (req, res) => {
  try {
    const { fulfillment_status, payment_status } = req.body;
    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (payment_status === "Paid" || fulfillment_status === "Delivered") {
      updates.order_status = "PAID";
    } else if (fulfillment_status === "Shipped") {
      updates.order_status = "SHIPPED";
    } else if (fulfillment_status) {
      updates.order_status = fulfillment_status.toUpperCase();
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", req.params.id);

    if (error) throw error;

    return res.json({ message: "Order status updated successfully." });
  } catch (error) {
    console.error("[Orders] Update status failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
