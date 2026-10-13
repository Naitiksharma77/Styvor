
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/shipping?country=IN
router.get("/", async (req, res) => {
    try {
        const countryCode = (
            req.query.country || "IN"
        ).trim().toUpperCase();

        if (!/^[A-Z]{2}$/.test(countryCode)) {
            return res.status(400).json({
                error: "Country must be a two-letter ISO code, such as IN or US."
            });
        }

        // Find the selected active country.
        const { data: country, error: countryError } =
            await supabase
                .from("countries")
                .select("id, name, iso_code")
                .eq("iso_code", countryCode)
                .eq("is_active", true)
                .maybeSingle();

        if (countryError) {
            console.error("Country lookup error:", countryError);

            return res.status(500).json({
                error: "Failed to fetch country information."
            });
        }

        if (!country) {
            return res.status(404).json({
                error: "Country is not available."
            });
        }

        // Fetch active shipping rates for this country.
        const { data: rates, error: shippingError } =
            await supabase
                .from("shipping_rates")
                .select(`
                    shipping_name,
                    shipping_fee,
                    free_shipping_threshold,
                    estimated_min_days,
                    estimated_max_days
                `)
                .eq("country_id", country.id)
                .eq("is_active", true);

        if (shippingError) {
            console.error("Shipping lookup error:", shippingError);

            return res.status(500).json({
                error: "Failed to fetch shipping rates."
            });
        }

        res.json({
            country: {
                name: country.name,
                code: country.iso_code
            },
            shipping_rates: rates
        });
    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            error: "Internal server error."
        });
    }
});

module.exports = router;