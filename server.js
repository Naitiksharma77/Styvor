import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const categoriesRoutes = require("./backend/routes/categories.js");
const productsRoutes = require("./backend/routes/products.js");
const countriesRoutes = require("./backend/routes/countries.js");
const shippingRoutes = require("./backend/routes/shipping.js");
const paymentMethodsRoutes = require("./backend/routes/paymentMethods.js");
const paymentsRoutes = require("./backend/routes/payments.js");
const ordersRoutes = require("./backend/routes/orders.js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));

// Mount API routes
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/payment-methods", paymentMethodsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/orders", ordersRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Styvor Luxury Store",
    time: new Date().toISOString(),
  });
});

const frontendPath = path.resolve(__dirname, "frontend");
const adminDistPath = path.resolve(__dirname, "admin/dist");

// Serve Admin Dashboard from admin/dist
app.use("/admin", express.static(adminDistPath));
app.use("/admin", (req, res) => {
  res.sendFile(path.resolve(adminDistPath, "index.html"));
});

// High-speed, lightweight static serving of pure HTML/CSS/JS frontend
app.use(express.static(frontendPath));
app.use(express.static(__dirname));

// Store fallback
app.use((req, res) => {
  res.sendFile(path.resolve(frontendPath, "index.html"));
});



const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Styvor] Store & API server running at http://0.0.0.0:${PORT}`);
});
