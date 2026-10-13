
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
        if (!razorpay) {
            return res.status(500).json({
                error: "Razorpay keys are not configured.",
            });
        }

        const amount = Number(req.body.amount);

        // Amount is in INR; convert rupees to paise.
        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            Math.round(amount * 100) !== amount * 100
        ) {
            return res.status(400).json({
                error: "A valid amount in INR is required.",
            });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `styvor_${Date.now()}`,
        });

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
            return res.status(500).json({
                error: "Razorpay secret is not configured.",
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