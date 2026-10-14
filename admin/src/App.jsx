import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "/api";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const emptyForm = {
  name: "",
  category_id: "",
  price: "",
  compare_at_price: "",
  stock: "0",
  description: "",
  sku: "",
};

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function normalizeCategories(data) {
  const list = Array.isArray(data) ? data : data.categories || [];
  return list.filter((item) => item.is_active !== false);
}

function normalizeProducts(data) {
  return (data.products || []).map((item) => {
    const variant = item.product_variants?.[0] || {};

    return {
      id: item.id,
      name: item.name || "",
      slug: item.slug || "",
      description: item.description || "",
      category_id: item.category_id,
      category: item.category?.name || "",
      sku: variant.sku || item.sku || "",
      variant_id: variant.id || null,
      variant_name: variant.name || "Default",
      attributes: variant.attributes || {},
      price: variant.price ?? "",
      compare_at_price: variant.compare_at_price ?? "",
      stock: variant.stock_quantity ?? 0,
      status: item.is_active ? "Active" : "Draft",
      images: item.product_images || [],
    };
  });
}

function StarRating() {
  return (
    <span
      className="styvor-stars"
      aria-label="Rating is not stored in the database"
    >
      <span className="styvor-stars-icons">
        {"★★★★★".split("").map((star, index) => (
          <span className="star-empty" key={index}>
            {star}
          </span>
        ))}
      </span>
      <span className="styvor-rating-number">N/A</span>
    </span>
  );
}

function ImagePreview({ image, alt }) {
  if (!image) {
    return (
      <div className="styvor-product-thumb">
        <span>◇</span>
      </div>
    );
  }

  return (
    <div className="styvor-product-thumb">
      <img
        src={image}
        alt={alt || "Product"}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "inherit",
        }}
      />
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activePage, setActivePage] = useState("Products");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Multiple new images selected for upload.
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageInputKey, setImageInputKey] = useState(0);

  const [deletingImageId, setDeletingImageId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [productData, categoryData] = await Promise.all([
        request("/products?country=IN"),
        request("/categories"),
      ]);

      const nextCategories = normalizeCategories(categoryData);
      const normalizedProducts = normalizeProducts(productData);

      const productsWithImages = await Promise.all(
        normalizedProducts.map(async (product) => {
          try {
            const result = await request(`/products/${product.id}/images`);

            return {
              ...product,
              images: result.images || [],
            };
          } catch (error) {
            console.warn(
              `Could not load images for ${product.name}:`,
              error.message
            );

            return {
              ...product,
              images: product.images || [],
            };
          }
        })
      );

      setCategories(nextCategories);

      setProducts(
        productsWithImages.map((product) => ({
          ...product,
          category:
            nextCategories.find(
              (category) => category.id === product.category_id
            )?.name ||
            product.category ||
            "Uncategorized",
        }))
      );

      setNotice("");
    } catch (error) {
      setNotice(`Could not load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Release temporary browser preview URLs when they change or unmount.
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) =>
      `${product.name} ${product.category}`.toLowerCase().includes(query)
    );
  }, [products, search]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function clearSelectedImages() {
  setImagePreviews((current) => {
    current.forEach((preview) => URL.revokeObjectURL(preview));
    return [];
  });

  setImageFiles([]);
  setImageInputKey((key) => key + 1);
}

  function openAddProduct() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category_id: categories[0]?.id || "",
    });
    clearSelectedImages();
    setNotice("");
    setModalOpen(true);
  }

  function openEditProduct(product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      category_id: product.category_id || "",
      price: String(product.price ?? ""),
      compare_at_price: String(product.compare_at_price ?? ""),
      stock: String(product.stock ?? 0),
      description: product.description || "",
      sku: product.sku || "",
    });

    clearSelectedImages();
    setNotice("");
    setModalOpen(true);
  }

  function handleImageChange(event) {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    const currentProduct = products.find(
      (product) => product.id === editingId
    );
    const existingCount = currentProduct?.images?.length || 0;

    if (existingCount + imageFiles.length + selected.length > MAX_IMAGES) {
      setNotice(
        `Maximum ${MAX_IMAGES} images per product. ` +
          `This product already has ${existingCount} and ` +
          `${imageFiles.length} new image(s) selected.`
      );
      event.target.value = "";
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setNotice("Only JPG, PNG, and WebP images are allowed.");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setNotice(`${file.name} exceeds the 5 MB per-image limit.`);
        event.target.value = "";
        return;
      }
    }

    const previews = selected.map((file) => URL.createObjectURL(file));

    setImageFiles((current) => [...current, ...selected]);
    setImagePreviews((current) => [...current, ...previews]);
    setNotice("");
    event.target.value = "";
  }

  function removeSelectedImage(index) {
    setImageFiles((current) => current.filter((_, i) => i !== index));

    setImagePreviews((current) => {
      const removed = current[index];

      if (removed) URL.revokeObjectURL(removed);

      return current.filter((_, i) => i !== index);
    });

    setImageInputKey((key) => key + 1);
  }

  async function uploadProductImages(productId, files) {
    if (!files.length) return [];

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    formData.append("alt_text", form.name.trim());

    return request(`/products/${productId}/images`, {
      method: "POST",
      body: formData,
    });
  }

  async function deleteProductImage(product, image) {
    const confirmed = window.confirm(
      `Delete this image from "${product.name}"?`
    );

    if (!confirmed) return;

    setDeletingImageId(image.id);
    setNotice("");

    try {
      await request(
        `/products/${product.id}/images/${image.id}`,
        { method: "DELETE" }
      );

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                images: item.images.filter(
                  (savedImage) => savedImage.id !== image.id
                ),
              }
            : item
        )
      );

      setNotice("Image deleted successfully.");
    } catch (error) {
      setNotice(`Could not delete image: ${error.message}`);
    } finally {
      setDeletingImageId(null);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (saving) return;

    setNotice("");

    if (!form.name.trim()) {
      setNotice("Please enter a product name.");
      return;
    }

    if (!form.category_id) {
      setNotice("Please choose a category.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    const compareAt =
      form.compare_at_price === "" ? null : Number(form.compare_at_price);

    if (!Number.isFinite(price) || price < 0) {
      setNotice("Enter a valid, non-negative price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setNotice("Stock must be a whole number of zero or more.");
      return;
    }

    if (
      compareAt !== null &&
      (!Number.isFinite(compareAt) || compareAt < 0)
    ) {
      setNotice("Enter a valid compare-at price.");
      return;
    }

    const currentProduct = products.find(
      (product) => product.id === editingId
    );
    const existingImageCount = currentProduct?.images?.length || 0;

    if (existingImageCount + imageFiles.length > MAX_IMAGES) {
      setNotice(`A product can have a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const payload = {
      country: "IN",
      name: form.name.trim(),
      slug: form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      category_id: form.category_id,
      description: form.description.trim(),
      sku: form.sku.trim() || null,
      price,
      compare_at_price: compareAt,
      stock_quantity: stock,
      variant_name: currentProduct?.variant_name || "Default",
      attributes: currentProduct?.attributes || {},
    };

    setSaving(true);

    let productSaved = false;
    let productId = editingId;
    const newImageCount = imageFiles.length;

    try {
      if (editingId) {
        await request(`/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            variant_id: currentProduct?.variant_id,
          }),
        });

        productSaved = true;
      } else {
        const result = await request("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        productId = result.product?.id;

        if (!productId) {
          throw new Error("The API did not return the new product ID.");
        }

        productSaved = true;
      }

      if (newImageCount > 0) {
        await uploadProductImages(productId, imageFiles);
      }

      clearSelectedImages();
      setModalOpen(false);
      setNotice(
        newImageCount
          ? `Product saved with ${newImageCount} new image(s).`
          : editingId
            ? "Product updated successfully."
            : "Product added successfully."
      );

      await loadData();
    } catch (error) {
      setNotice(
        productSaved
          ? `Product saved, but image upload or refresh failed: ${error.message}`
          : `Could not save product: ${error.message}`
      );

      if (productSaved) {
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}" and its linked database records? ` +
        "This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await request(`/products/${product.id}`, { method: "DELETE" });

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setNotice("Product deleted successfully.");
    } catch (error) {
      setNotice(`Could not delete product: ${error.message}`);
    }
  }

  const pageItems = [
    { name: "Overview", icon: "◫" },
    { name: "Products", icon: "◇" },
    { name: "Categories", icon: "▦" },
    { name: "Inventory", icon: "▤" },
    { name: "Orders", icon: "▧" },
    { name: "Images", icon: "▧" },
    { name: "Shipping", icon: "↗" },
    { name: "Payments", icon: "▣" },
  ];

  return (
    <div className="styvor-app">
      <aside className="styvor-sidebar">
        <div className="styvor-brand">
          <span className="styvor-brand-name">STYVOR</span>
          <span className="styvor-brand-subtitle">ADMIN STUDIO</span>
        </div>

        <div className="styvor-sidebar-label">WORKSPACE</div>

        <nav className="styvor-navigation">
          {pageItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`styvor-nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="styvor-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {item.name === "Products" && (
                <span className="styvor-nav-count">{products.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="styvor-sidebar-bottom">
          <div className="styvor-status-dot" />
          <div>
            <div className="styvor-status-title">Store workspace</div>
            <div className="styvor-status-subtitle">Connected API mode</div>
          </div>
        </div>
      </aside>

      <main className="styvor-main">
        <header className="styvor-topbar">
          <div>
            <div className="styvor-breadcrumb">STYVOR / ADMIN</div>
            <h1>{activePage}</h1>
          </div>

          <div className="styvor-topbar-right">
            <span className="styvor-mode-label">LIVE API</span>
            <div className="styvor-avatar">S</div>
          </div>
        </header>

        <div className="styvor-content">
          {notice && (
            <div className="styvor-notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          )}

          {activePage === "Overview" && (
            <>
              <div className="styvor-section-heading">
                <div>
                  <div className="styvor-eyebrow">YOUR STORE AT A GLANCE</div>
                  <h2>Store overview</h2>
                  <p>Live catalogue data from Styvor.</p>
                </div>
                <button
                  className="styvor-button styvor-button-dark"
                  onClick={openAddProduct}
                  type="button"
                >
                  + Add product
                </button>
              </div>

              <div className="styvor-stats-grid">
                <StatCard label="Total products" value={products.length} />
                <StatCard label="Active products" value={products.length} />
                <StatCard
                  label="Total stock"
                  value={products.reduce(
                    (sum, product) => sum + Number(product.stock || 0),
                    0
                  )}
                />
                <StatCard label="Categories" value={categories.length} />
              </div>

              <div className="styvor-panel">
                <div className="styvor-panel-heading">
                  <div>
                    <h3>Recently managed products</h3>
                    <p>From your database</p>
                  </div>
                  <button
                    className="styvor-button styvor-button-light"
                    onClick={() => setActivePage("Products")}
                    type="button"
                  >
                    View products →
                  </button>
                </div>

                {products.slice(0, 5).map((product) => (
                  <ProductSummary
                    key={product.id}
                    product={product}
                    onEdit={() => openEditProduct(product)}
                  />
                ))}
              </div>
            </>
          )}

          {activePage === "Products" && (
            <>
              <div className="styvor-section-heading">
                <div>
                  <div className="styvor-eyebrow">CATALOGUE MANAGEMENT</div>
                  <h2>Products</h2>
                  <p>Manage product details and up to four images per product.</p>
                </div>
                <button
                  className="styvor-button styvor-button-dark"
                  onClick={openAddProduct}
                  type="button"
                >
                  + Add product
                </button>
              </div>

              <div className="styvor-toolbar">
                <label className="styvor-search">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Search products or categories..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <span className="styvor-result-count">
                  {filteredProducts.length} products
                </span>

                <button
                  type="button"
                  className="styvor-button styvor-button-light"
                  onClick={loadData}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>

              <div className="styvor-panel styvor-products-panel">
                <div className="styvor-products-heading">
                  <span>PRODUCT</span>
                  <span>CATEGORY</span>
                  <span>PRICE</span>
                  <span>RATING</span>
                  <span>STOCK</span>
                  <span>STATUS</span>
                  <span>ACTIONS</span>
                </div>

                {loading ? (
                  <div className="styvor-empty">
                    <h3>Loading products…</h3>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="styvor-empty">
                    <div className="styvor-empty-icon">◇</div>
                    <h3>No products found</h3>
                    <p>Try another search or add a product.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div className="styvor-product-row" key={product.id}>
                      <div className="styvor-product-cell">
                        <ImagePreview
                          image={product.images?.[0]?.image_url}
                          alt={product.name}
                        />
                        <div className="styvor-product-info">
                          <strong>{product.name}</strong>
                          <span>
                            {product.images?.length
                              ? `${product.images.length} image(s)`
                              : "No image uploaded"}
                          </span>
                        </div>
                      </div>

                      <div className="styvor-category-cell">
                        {product.category}
                      </div>

                      <div className="styvor-price-cell">
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </div>

                      <div className="styvor-rating-cell">
                        <StarRating />
                      </div>

                      <div>{product.stock}</div>

                      <div>
                        <span className="styvor-status-pill is-active">
                          {product.status}
                        </span>
                      </div>

                      <div className="styvor-row-actions">
                        <button
                          type="button"
                          className="styvor-icon-button"
                          title="Edit product"
                          onClick={() => openEditProduct(product)}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="styvor-icon-button delete"
                          title="Permanently delete product"
                          onClick={() => deleteProduct(product)}
                        >
                          ×
                        </button>
                      </div>

                      {product.description && (
                        <div className="styvor-product-description">
                          <span>DESCRIPTION</span>
                          <p>{product.description}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activePage === "Categories" && (
            <SimplePage
              title="Product categories"
              subtitle="Categories loaded from your database."
            >
              <div className="styvor-category-grid">
                {categories.map((category, index) => (
                  <div className="styvor-category-card" key={category.id}>
                    <span className="styvor-category-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{category.name}</h3>
                    <p>
                      {
                        products.filter(
                          (product) => product.category_id === category.id
                        ).length
                      }{" "}
                      products
                    </p>
                  </div>
                ))}
              </div>
            </SimplePage>
          )}

          {activePage === "Inventory" && (
            <SimplePage
              title="Inventory"
              subtitle="Stock levels from product variants."
            >
              <div className="styvor-panel">
                {products.map((product) => (
                  <ProductSummary
                    key={product.id}
                    product={product}
                    onEdit={() => openEditProduct(product)}
                  />
                ))}
              </div>
            </SimplePage>
          )}

          {activePage === "Images" && (
            <SimplePage
              title="Product images"
              subtitle="Supabase Storage images linked to your products."
            >
              <div className="styvor-category-grid">
                {products.map((product) => (
                  <div className="styvor-category-card" key={product.id}>
                    <ImagePreview
                      image={product.images?.[0]?.image_url}
                      alt={product.name}
                    />
                    <h3>{product.name}</h3>
                    <p>{product.images?.length || 0} saved image(s)</p>
                    <button
                      type="button"
                      className="styvor-button styvor-button-light"
                      onClick={() => openEditProduct(product)}
                    >
                      Manage images
                    </button>
                  </div>
                ))}
              </div>
            </SimplePage>
          )}

          {["Orders", "Shipping", "Payments"].includes(activePage) && (
            <SimplePage
              title={activePage}
              subtitle="This section has not been connected to the backend yet."
            >
              <div className="styvor-empty">
                <div className="styvor-empty-icon">◇</div>
                <h3>{activePage} workspace</h3>
                <p>This section is not connected yet.</p>
              </div>
            </SimplePage>
          )}
        </div>
      </main>

      {modalOpen && (
        <div
          className="styvor-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
              clearSelectedImages();
            }
          }}
        >
          <section
            className="styvor-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="styvor-modal-title"
          >
            <header className="styvor-modal-header">
              <div>
                <div className="styvor-eyebrow">CATALOGUE EDITOR</div>
                <h2 id="styvor-modal-title">
                  {editingId ? "Edit product" : "Add a product"}
                </h2>
                <p>Product details, INR price, and product gallery.</p>
              </div>

              <button
                type="button"
                className="styvor-modal-close"
                onClick={() => {
                  if (!saving) {
                    setModalOpen(false);
                    clearSelectedImages();
                  }
                }}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <form className="styvor-product-form" onSubmit={saveProduct}>
              <div className="styvor-form-grid">
                <label className="styvor-field styvor-field-full">
                  <span>Product name *</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="styvor-field">
                  <span>Category *</span>
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="styvor-field">
                  <span>SKU</span>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={updateField}
                  />
                </label>

                <label className="styvor-field">
                  <span>Price (INR) *</span>
                  <div className="styvor-input-prefix">
                    <span>₹</span>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={updateField}
                      required
                    />
                  </div>
                </label>

                <label className="styvor-field">
                  <span>Compare-at price</span>
                  <input
                    name="compare_at_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compare_at_price}
                    onChange={updateField}
                  />
                </label>

                <label className="styvor-field">
                  <span>Stock quantity *</span>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="styvor-field styvor-field-full">
                  <span>Product description</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    rows={5}
                    maxLength={3000}
                  />
                  <small className="styvor-field-hint">
                    {form.description.length}/3000 characters
                  </small>
                </label>

                <div className="styvor-field styvor-field-full">
                  <span>
                    Product gallery ({MAX_IMAGES} images maximum)
                  </span>

                  {(() => {
                    const currentProduct = products.find(
                      (product) => product.id === editingId
                    );
                    const savedImages = currentProduct?.images || [];

                    return (
                      <>
                        {savedImages.length > 0 && (
                          <>
                            <p className="styvor-field-hint">
                              Saved images. Remove any image you no longer need.
                            </p>
                            <div className="styvor-image-grid">
                              {savedImages.map((image, index) => (
                                <div
                                  className="styvor-image-card"
                                  key={image.id}
                                >
                                  <img
                                    src={image.image_url}
                                    alt={
                                      image.alt_text ||
                                      `${form.name} image ${index + 1}`
                                    }
                                  />
                                  <span>
                                    {index === 0 ? "Image 1 · Main" : `Image ${index + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    className="styvor-button styvor-button-light"
                                    disabled={saving || deletingImageId === image.id}
                                    onClick={() =>
                                      deleteProductImage(currentProduct, image)
                                    }
                                  >
                                    {deletingImageId === image.id
                                      ? "Removing…"
                                      : "Remove"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {imagePreviews.length > 0 && (
                          <>
                            <p className="styvor-field-hint">
                              New images waiting to upload.
                            </p>
                            <div className="styvor-image-grid">
                              {imagePreviews.map((preview, index) => (
                                <div
                                  className="styvor-image-card"
                                  key={`${preview}-${index}`}
                                >
                                  <img
                                    src={preview}
                                    alt={`New product image ${index + 1}`}
                                  />
                                  <span>
                                    New image {index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    className="styvor-button styvor-button-light"
                                    disabled={saving}
                                    onClick={() => removeSelectedImage(index)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        <p className="styvor-field-hint">
                          {savedImages.length + imageFiles.length} of{" "}
                          {MAX_IMAGES} image slots used.
                        </p>

                        {savedImages.length + imageFiles.length < MAX_IMAGES && (
                          <input
                            key={imageInputKey}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImageChange}
                            disabled={saving}
                          />
                        )}

                        <p className="styvor-field-hint">
                          Select multiple JPG, PNG, or WebP images at once.
                          Maximum 5 MB per image. Existing images stay saved
                          unless you remove them.
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div className="styvor-field styvor-field-full">
                  <span>Rating</span>
                  <p className="styvor-field-hint">
                    Rating is not stored in your current database schema.
                  </p>
                </div>
              </div>

              {notice && (
                <div className="styvor-form-notice" role="status">
                  {notice}
                </div>
              )}

              <footer className="styvor-modal-footer">
                <button
                  type="button"
                  className="styvor-button styvor-button-light"
                  onClick={() => {
                    if (!saving) {
                      setModalOpen(false);
                      clearSelectedImages();
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="styvor-button styvor-button-dark"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Add product"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="styvor-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="styvor-stat-line" />
    </div>
  );
}

function ProductSummary({ product, onEdit }) {
  return (
    <div className="styvor-summary-row">
      <ImagePreview
        image={product.images?.[0]?.image_url}
        alt={product.name}
      />
      <div className="styvor-summary-info">
        <strong>{product.name}</strong>
        <span>
          {product.category} · Stock: {product.stock} ·{" "}
          {product.images?.length || 0} image(s)
        </span>
      </div>
      <button
        type="button"
        className="styvor-button styvor-button-light"
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  );
}

function SimplePage({ title, subtitle, children }) {
  return (
    <>
      <div className="styvor-section-heading">
        <div>
          <div className="styvor-eyebrow">STYVOR WORKSPACE</div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </>
  );
}

export default App;