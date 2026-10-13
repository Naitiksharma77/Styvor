
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/payment-methods?country=IN
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

        // Fetch active payment methods for this country.
        const { data: methods, error: methodsError } =
            await supabase
                .from("payment_methods")
                .select(`
                    provider,
                    method_code,
                    display_name
                `)
                .eq("country_id", country.id)
                .eq("is_active", true)
                .order("display_name", {
                    ascending: true
                });

        if (methodsError) {
            console.error("Payment methods lookup error:", methodsError);

            return res.status(500).json({
                error: "Failed to fetch payment methods."
            });
        }

        res.json({
            country: {
                name: country.name,
                code: country.iso_code
            },
            count: methods.length,
            payment_methods: methods
        });
    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            error: "Internal server error."
        });
    }
});

module.exports = router;