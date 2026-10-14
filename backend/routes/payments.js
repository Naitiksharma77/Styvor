
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const router = express.Router();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (keyId && keySecret) {
    razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
    try {
        const requestedCurrency = String(req.body.currency || "INR").toUpperCase();
        const amount = Number(req.body.amount);

        if (!razorpay) {
            return res.json({
                key_id: "rzp_test_styvor_demo",
                order_id: `order_styvor_${Date.now()}`,
                amount: Math.round((Number.isFinite(amount) && amount > 0 ? amount : 100) * 100),
                currency: requestedCurrency,
                demo_mode: true,
            });
        }

        // Validate amount
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                error: "A valid positive amount is required.",
            });
        }

        let order;
        try {
            order = await razorpay.orders.create({
                amount: Math.round(amount * 100),
                currency: requestedCurrency,
                receipt: `styvor_${Date.now()}`,
            });
        } catch (currErr) {
            console.warn(`Razorpay order with ${requestedCurrency} failed, falling back to INR:`, currErr.message);
            const inrAmount = Number(req.body.inr_amount || req.body.amount);
            order = await razorpay.orders.create({
                amount: Math.round((Number.isFinite(inrAmount) && inrAmount > 0 ? inrAmount : amount) * 100),
                currency: "INR",
                receipt: `styvor_${Date.now()}`,
            });
        }

        return res.json({
            key_id: keyId,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Razorpay order error:", error.message);

        return res.status(500).json({
            error: "Could not create Razorpay order.",
        });
    }
});

// POST /api/payments/verify
router.post("/verify", async (req, res) => {
    try {
        if (!keySecret) {
            return res.json({
                verified: true,
                message: "Payment simulated successfully (Demo Mode).",
                payment_id: req.body.razorpay_payment_id || `pay_demo_${Date.now()}`,
                order_id: req.body.razorpay_order_id || `order_demo_${Date.now()}`,
                demo_mode: true,
            });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                verified: false,
                error: "Missing payment verification fields.",
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        const received = Buffer.from(razorpay_signature, "hex");
        const expected = Buffer.from(expectedSignature, "hex");

        const valid =
            received.length === expected.length &&
            crypto.timingSafeEqual(received, expected);

        if (!valid) {
            return res.status(400).json({
                verified: false,
                error: "Payment signature verification failed.",
            });
        }

        // Signature verified. Confirm capture/order status before
        // marking an actual store order as paid.
        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        if (
            payment.order_id !== razorpay_order_id ||
            payment.status !== "captured"
        ) {
            return res.status(400).json({
                verified: false,
                error: "Payment is not captured for this order.",
            });
        }

        return res.json({
            verified: true,
            message: "Payment verified successfully.",
            payment_id: payment.id,
            order_id: payment.order_id,
        });
    } catch (error) {
        console.error("Razorpay verification error:", error.message);

        return res.status(500).json({
            verified: false,
            error: "Payment verification failed.",
        });
    }
});

module.exports = router;