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

const isProduction = process.env.NODE_ENV === "production";
const distPath = path.resolve(__dirname, "frontend/dist");
const adminDistPath = path.resolve(__dirname, "admin/dist");

// Seamlessly serve Admin Dashboard from admin/dist
app.use("/admin", express.static(adminDistPath));
app.use("/admin", (req, res) => {
  res.sendFile(path.resolve(adminDistPath, "index.html"));
});

if (!isProduction) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: {
      middlewareMode: true,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    appType: "spa",
    root: path.resolve(__dirname, "frontend"),
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Styvor] Store & API server running at http://0.0.0.0:${PORT}`);
});
