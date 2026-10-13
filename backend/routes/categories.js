const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({
                error: "Failed to fetch categories"
            });
        }

        res.json(data);
    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;