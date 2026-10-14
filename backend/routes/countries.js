const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

const COUNTRY_FLAGS = {
    AR: "🇦🇷",
    AU: "🇦🇺",
    BR: "🇧🇷",
    CA: "🇨🇦",
    CO: "🇨🇴",
    FR: "🇫🇷",
    DE: "🇩🇪",
    IN: "🇮🇳",
    IT: "🇮🇹",
    JP: "🇯🇵",
    MX: "🇲🇽",
    NL: "🇳🇱",
    PL: "🇵🇱",
    ES: "🇪🇸",
    GB: "🇬🇧",
    US: "🇺🇸",
};

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

// GET /api/countries
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("countries")
            .select(`
                id,
                name,
                iso_code,
                is_active,
                currencies (
                    id,
                    code,
                    name,
                    symbol,
                    decimal_places
                )
            `)
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (error) {
            console.error("Countries lookup error:", error);
            return res.status(500).json({
                error: "Failed to fetch countries."
            });
        }

        const enriched = (data || []).map((country) => {
            const iso = String(country.iso_code || "").toUpperCase();
            const curr = Array.isArray(country.currencies)
                ? country.currencies[0]
                : country.currencies;

            const currCode = curr?.code || "INR";
            const rate = DEFAULT_RATES_TO_INR[currCode] || 1.0;

            return {
                ...country,
                flag: country.flag || COUNTRY_FLAGS[iso] || "🌐",
                currencies: curr ? {
                    ...curr,
                    rate_to_inr: curr.rate_to_inr ?? rate,
                } : {
                    code: "INR",
                    name: "Indian Rupee",
                    symbol: "₹",
                    decimal_places: 2,
                    rate_to_inr: 1.0,
                },
            };
        });

        res.json({
            count: enriched.length,
            countries: enriched,
        });
    } catch (error) {
        console.error("Server error in countries:", error);
        res.status(500).json({
            error: "Internal server error."
        });
    }
});

module.exports = router;
