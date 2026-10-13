const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/countries
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("countries")
            .select(`
                id,
                name,
                iso_code,
                currencies (
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

        res.json({
            count: data.length,
            countries: data
        });
    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            error: "Internal server error."
        });
    }
});

module.exports = router;

