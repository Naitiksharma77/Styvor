const express = require("express");
const cors = require("cors");

const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const countriesRoutes = require("./routes/countries");
const shippingRoutes = require("./routes/shipping");
const paymentMethodsRoutes = require("./routes/paymentMethods");
const paymentsRoutes = require("./routes/payments");

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
    res.json({
        message: "iPhone Luxury Store API is running"
    });
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/payment-methods", paymentMethodsRoutes);
app.use("/api/payments", paymentsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});