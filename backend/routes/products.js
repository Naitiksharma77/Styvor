const multer = require("multer");
const path = require("path");

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WebP images are allowed.")
      );
    }

    callback(null, true);
  },
});

const express = require("express");
const supabase = require("../config/supabase");
const crypto = require("crypto");

const router = express.Router();

async function getCountry(isoCode = "IN") {
  const { data, error } = await supabase
    .from("countries")
    .select("id, name, iso_code, currency_id")
    .eq("iso_code", isoCode.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Active country not found: ${isoCode}`);

  const { data: currency, error: currencyError } = await supabase
    .from("currencies")
    .select("id, code, name, symbol, decimal_places")
    .eq("id", data.currency_id)
    .eq("is_active", true)
    .maybeSingle();

  if (currencyError) throw currencyError;
  if (!currency) throw new Error("Active currency not found");

  return { country: data, currency };
}

function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateProduct(body) {
  if (!body.name?.trim()) return "Product name is required.";
  if (!body.category_id) return "Category is required.";

  const price = Number(body.price);
  const stock = Number(body.stock_quantity ?? 0);

  if (!Number.isFinite(price) || price < 0) {
    return "Price must be a valid non-negative number.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "Stock must be a non-negative whole number.";
  }

  if (
    body.compare_at_price !== "" &&
    body.compare_at_price != null &&
    (!Number.isFinite(Number(body.compare_at_price)) ||
      Number(body.compare_at_price) < 0)
  ) {
    return "Compare-at price must be a valid non-negative number.";
  }

  return null;
}

// GET /api/products?country=IN
router.get("/", async (req, res) => {
  try {
    const { country, currency } = await getCountry(
      req.query.country || "IN"
    );

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const productIds = (products || []).map((p) => p.id);

    let variants = [];
    let prices = [];

    if (productIds.length) {
      const variantResult = await supabase
        .from("product_variants")
        .select("*")
        .in("product_id", productIds)
        .eq("is_active", true);

      if (variantResult.error) throw variantResult.error;
      variants = variantResult.data || [];

      const priceResult = await supabase
        .from("product_prices")
        .select("*")
        .eq("country_id", country.id)
        .in("product_id", productIds);

      if (priceResult.error) throw priceResult.error;
      prices = priceResult.data || [];
    }

    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true);

    if (categoryError) throw categoryError;

    const result = (products || []).map((product) => ({
      ...product,
      category: (categories || []).find(
        (c) => c.id === product.category_id
      ) || null,
      product_variants: variants
        .filter((v) => v.product_id === product.id)
        .map((variant) => {
          const price = prices.find(
            (p) =>
              p.product_id === product.id &&
              p.variant_id === variant.id
          );

          return {
            ...variant,
            price: price?.price ?? null,
            compare_at_price: price?.compare_at_price ?? null,
            currency: currency.code,
            currency_symbol: currency.symbol,
            decimal_places: currency.decimal_places,
          };
        }),
    }));

    res.json({
      country: { name: country.name, code: country.iso_code },
      currency,
      products: result,
    });
  } catch (error) {
    console.error("Fetch products error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  let createdProductId = null;

  try {
    const validationError = validateProduct(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      country: countryCode = "IN",
      name,
      slug,
      description = "",
      category_id,
      sku = null,
      variant_name = "Default",
      attributes = {},
      price,
      compare_at_price,
      stock_quantity = 0,
    } = req.body;

    const { country } = await getCountry(countryCode);

    const finalSlug = makeSlug(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ error: "A valid slug is required." });
    }

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", category_id)
      .eq("is_active", true)
      .maybeSingle();

    if (categoryError) throw categoryError;
    if (!category) {
      return res.status(400).json({ error: "Selected category is invalid." });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        slug: finalSlug,
        description,
        category_id,
        sku,
        is_active: true,
      })
      .select()
      .single();

    if (productError) throw productError;
    createdProductId = product.id;

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .insert({
        product_id: product.id,
        name: variant_name || "Default",
        sku,
        attributes: attributes || {},
        stock_quantity: Number(stock_quantity),
        is_active: true,
      })
      .select()
      .single();

    if (variantError) throw variantError;

    const { error: priceError } = await supabase
      .from("product_prices")
      .insert({
        product_id: product.id,
        variant_id: variant.id,
        country_id: country.id,
        price: Number(price),
        compare_at_price:
          compare_at_price === "" || compare_at_price == null
            ? null
            : Number(compare_at_price),
      });

    if (priceError) throw priceError;

    res.status(201).json({
      message: "Product created successfully.",
      product: { ...product, product_variants: [variant] },
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    // Clean up the product if creation failed partway through.
    if (createdProductId) {
      await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", createdProductId);
    }

    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/products/:id
router.patch("/:id", async (req, res) => {
  try {
    const {
      country: countryCode = "IN",
      name,
      slug,
      description,
      category_id,
      sku,
      variant_id,
      variant_name,
      attributes,
      price,
      compare_at_price,
      stock_quantity,
    } = req.body;

    if (!req.params.id) {
      return res.status(400).json({ error: "Product ID is required." });
    }

    const { data: existing, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) {
      return res.status(404).json({ error: "Product not found." });
    }

    const productUpdate = {};
    if (name !== undefined) productUpdate.name = name.trim();
    if (slug !== undefined || name !== undefined) {
      productUpdate.slug = makeSlug(slug || name || existing.name);
    }
    if (description !== undefined) productUpdate.description = description;
    if (category_id !== undefined) productUpdate.category_id = category_id;
    if (sku !== undefined) productUpdate.sku = sku;

    if (Object.keys(productUpdate).length) {
      const { error } = await supabase
        .from("products")
        .update(productUpdate)
        .eq("id", req.params.id);

      if (error) throw error;
    }

    if (
      variant_id &&
      (variant_name !== undefined ||
        attributes !== undefined ||
        stock_quantity !== undefined ||
        sku !== undefined)
    ) {
      const variantUpdate = {};
      if (variant_name !== undefined) variantUpdate.name = variant_name;
      if (attributes !== undefined) variantUpdate.attributes = attributes;
      if (stock_quantity !== undefined) {
        const stock = Number(stock_quantity);
        if (!Number.isInteger(stock) || stock < 0) {
          return res.status(400).json({
            error: "Stock must be a non-negative whole number.",
          });
        }
        variantUpdate.stock_quantity = stock;
      }
      if (sku !== undefined) variantUpdate.sku = sku;

      const { error } = await supabase
        .from("product_variants")
        .update(variantUpdate)
        .eq("id", variant_id)
        .eq("product_id", req.params.id);

      if (error) throw error;
    }

    if (price !== undefined || compare_at_price !== undefined) {
      if (!variant_id) {
        return res.status(400).json({
          error: "A variant_id is required to update its price.",
        });
      }

      const { country } = await getCountry(countryCode);

      const { data: existingPrice, error: priceFindError } = await supabase
        .from("product_prices")
        .select("id, price, compare_at_price")
        .eq("product_id", req.params.id)
        .eq("variant_id", variant_id)
        .eq("country_id", country.id)
        .maybeSingle();

      if (priceFindError) throw priceFindError;

      const priceUpdate = {};
      if (price !== undefined) {
        if (!Number.isFinite(Number(price)) || Number(price) < 0) {
          return res.status(400).json({ error: "Invalid price." });
        }
        priceUpdate.price = Number(price);
      }

      if (compare_at_price !== undefined) {
        priceUpdate.compare_at_price =
          compare_at_price === "" || compare_at_price == null
            ? null
            : Number(compare_at_price);
      }

      if (existingPrice) {
        const { error } = await supabase
          .from("product_prices")
          .update(priceUpdate)
          .eq("id", existingPrice.id);

        if (error) throw error;
      } else if (price !== undefined) {
        const { error } = await supabase.from("product_prices").insert({
          product_id: req.params.id,
          variant_id,
          country_id: country.id,
          price: Number(price),
          compare_at_price:
            compare_at_price === "" || compare_at_price == null
              ? null
              : Number(compare_at_price),
        });

        if (error) throw error;
      }
    }

    res.json({ message: "Product updated successfully." });
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

 

 // DELETE /api/products/:id
// Permanently delete a product and its related records.
router.delete("/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    console.log("DELETE request received for product:", productId);

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .select("id, name")
      .maybeSingle();

    if (error) {
      console.error("Delete product error:", error.message);
      return res.status(500).json({
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Product not found or could not be deleted.",
      });
    }

    console.log("Product permanently deleted:", data);

    return res.status(200).json({
      message: "Product deleted successfully.",
      product: data,
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      error: error.message,
    });
  }
});


/* POST /api/products/:id/images
   Upload image to Supabase Storage and save its URL. */

// GET /api/products/:id/images
router.get("/:id/images", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", req.params.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    res.json({ images: data || [] });
  } catch (error) {
    console.error("Load product images:", error.message);
    res.status(500).json({ error: "Could not load product images." });
  }
});

// POST /api/products/:id/images
// FormData field name: images (up to 4 files)
router.post(
  "/:id/images",
  imageUpload.array("images", 4),
  async (req, res) => {
    const uploadedPaths = [];

    try {
      const productId = req.params.id;
      const files = req.files || [];

      if (files.length === 0) {
        return res.status(400).json({
          error: "Select at least one image.",
        });
      }

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", productId)
        .maybeSingle();

      if (productError) throw productError;

      if (!product) {
        return res.status(404).json({ error: "Product not found." });
      }

      const { data: existingImages, error: existingError } = await supabase
        .from("product_images")
        .select("id, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });

      if (existingError) throw existingError;

      if ((existingImages?.length || 0) + files.length > 4) {
        return res.status(400).json({
          error: "A product can have a maximum of 4 images.",
        });
      }

      const newRecords = [];

      for (const [index, file] of files.entries()) {
        const safeName = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .slice(-100);

        const storagePath =
          `${productId}/${Date.now()}-${index}-${safeName}`;

        const { error: storageError } = await supabase.storage
          .from("new buket")
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (storageError) throw storageError;

        uploadedPaths.push(storagePath);

        const { data: publicData } = supabase.storage
          .from("new buket")
          .getPublicUrl(storagePath);

        newRecords.push({
          product_id: productId,
          image_url: publicData.publicUrl,
          alt_text: product.name,
          sort_order: (existingImages?.length || 0) + index,
        });
      }

      const { data: savedImages, error: insertError } = await supabase
        .from("product_images")
        .insert(newRecords)
        .select("*");

      if (insertError) throw insertError;

      res.status(201).json({ images: savedImages || [] });
    } catch (error) {
      console.error("Upload product images:", error.message);

      // Clean up newly uploaded Storage files if the DB insert fails.
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from("new buket")
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("Storage cleanup:", cleanupError.message);
        }
      }

      res.status(500).json({
        error: error.message || "Could not upload product images.",
      });
    }
  }
);

// DELETE /api/products/:id/images/:imageId
router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const { data: image, error: findError } = await supabase
      .from("product_images")
      .select("*")
      .eq("id", req.params.imageId)
      .eq("product_id", req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!image) {
      return res.status(404).json({ error: "Image not found." });
    }

    // Delete the database record first, so the UI does not retain a dead link.
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", image.id);

    if (deleteError) throw deleteError;

    // Public URL format: .../storage/v1/object/public/new%20buket/<path>
    try {
      const marker = "/storage/v1/object/public/";
      const markerIndex = image.image_url.indexOf(marker);

      if (markerIndex !== -1) {
        const encodedObjectPath = image.image_url.slice(
          markerIndex + marker.length
        );
        const decodedObjectPath = decodeURIComponent(encodedObjectPath);
        const bucketPrefix = "new buket/";

        if (decodedObjectPath.startsWith(bucketPrefix)) {
          const storagePath = decodedObjectPath.slice(bucketPrefix.length);

          const { error: storageError } = await supabase.storage
            .from("new buket")
            .remove([storagePath]);

          if (storageError) {
            console.error("Storage deletion:", storageError.message);
          }
        }
      }
    } catch (storageError) {
      console.error("Storage cleanup:", storageError.message);
    }

    res.json({ message: "Image deleted successfully." });
  } catch (error) {
    console.error("Delete product image:", error.message);
    res.status(500).json({ error: "Could not delete product image." });
  }
});

module.exports = router;