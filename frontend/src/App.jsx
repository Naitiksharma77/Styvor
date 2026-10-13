
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "https://styvor.onrender.com/api";
const COUNTRY_STORAGE_KEY = "styvor_country";

function getCountryCode(country) {
  return String(country?.iso_code || country?.code || "").toUpperCase();
}

function getCurrency(country) {
  const currencies = country?.currencies;

  if (Array.isArray(currencies)) return currencies[0]?.code || "INR";

  return currencies?.code || "INR";
}

function getImages(product) {
  const images = Array.isArray(product?.product_images)
    ? product.product_images
    : Array.isArray(product?.images)
      ? product.images
      : [];

  const validImages = images.filter((image) => image?.image_url);

  if (validImages.length) return validImages;

  const fallback = product?.image_url || product?.image;

  return fallback ? [{ image_url: fallback }] : [];
}

function getProductVariants(product) {
  if (Array.isArray(product?.product_variants)) {
    return product.product_variants;
  }

  if (Array.isArray(product?.variants)) {
    return product.variants;
  }

  return [];
}

function getPrice(product) {
  const variants = getProductVariants(product);

  const variant = variants.find(
    (item) =>
      item?.price !== null &&
      item?.price !== undefined &&
      item?.price !== ""
  );

  return Number(variant?.price ?? product?.price ?? 0);
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });

      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

async function postJSON(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }

  return data;
}

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryDraft, setCountryDraft] = useState("");
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryReady, setCountryReady] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const currency = useMemo(
    () => getCurrency(selectedCountry),
    [selectedCountry]
  );

  // Load available countries.
  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch(`${API_URL}/countries`);

        if (!response.ok) {
          throw new Error("Could not load countries.");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : data.countries || [];

        if (cancelled) return;

        setCountries(list);

        let savedCode = "";

        try {
          savedCode = localStorage.getItem(COUNTRY_STORAGE_KEY) || "";
        } catch {
          savedCode = "";
        }

        const savedCountry = list.find(
          (item) => getCountryCode(item) === savedCode
        );

        const defaultCountry =
          savedCountry ||
          list.find((item) => getCountryCode(item) === "IN") ||
          list[0] ||
          null;

        setSelectedCountry(defaultCountry);
        setCountryDraft(getCountryCode(defaultCountry));

        if (!savedCountry) setCountryModalOpen(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load countries.");
        }
      } finally {
        if (!cancelled) setCountryReady(true);
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load categories.
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`);

        if (!response.ok) return;

        const data = await response.json();
        const list = Array.isArray(data) ? data : data.categories || [];

        if (!cancelled) setCategories(list);
      } catch (err) {
        console.error("Could not load categories:", err);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load products and their images for the selected country.
  useEffect(() => {
    if (!countryReady || !selectedCountry) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const countryCode = getCountryCode(selectedCountry);

        const response = await fetch(
          `${API_URL}/products?country=${encodeURIComponent(countryCode)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load products.");
        }

        const list = Array.isArray(data) ? data : data.products || [];

        const productsWithImages = await Promise.all(
          list.map(async (product) => {
            try {
              const imageResponse = await fetch(
                `${API_URL}/products/${encodeURIComponent(product.id)}/images`
              );

              if (!imageResponse.ok) {
                return { ...product, product_images: [] };
              }

              const imageData = await imageResponse.json();

              return {
                ...product,
                product_images: Array.isArray(imageData.images)
                  ? imageData.images
                  : [],
              };
            } catch {
              return { ...product, product_images: [] };
            }
          })
        );

        if (!cancelled) setProducts(productsWithImages);
      } catch (err) {
        if (!cancelled) {
          setProducts([]);
          setError(err.message || "Could not load products.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [countryReady, selectedCountry]);

  function saveCountry() {
    const country = countries.find(
      (item) => getCountryCode(item) === countryDraft
    );

    if (!country) return;

    setSelectedCountry(country);
    setCountryModalOpen(false);
    setPaymentMessage("");

    try {
      localStorage.setItem(
        COUNTRY_STORAGE_KEY,
        getCountryCode(country)
      );
    } catch (err) {
      console.warn("Could not save country preference.", err);
    }
  }

  function openProduct(product) {
    setActiveImageIndex(0);
    setActiveProduct(product);
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });

    setActiveProduct(null);
    setCartOpen(true);
    setPaymentMessage("");
  }

  function changeQuantity(productId, amount) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );

    setPaymentMessage("");
  }

  function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "Price unavailable";

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(number);
    } catch {
      return `${currency} ${number.toFixed(2)}`;
    }
  }

  // Create a Razorpay order, open Checkout and verify the result on the server.
  async function handleCheckout() {
    if (checkoutLoading) return;

    setPaymentMessage("");

    if (!cart.length) {
      setPaymentMessage("Your shopping bag is empty.");
      return;
    }

    if (!selectedCountry) {
      setPaymentMessage("Please select your country first.");
      return;
    }

    // The current backend payment route creates INR orders only.
    if (currency !== "INR") {
      setPaymentMessage(
        "Online checkout is currently configured for INR orders only."
      );
      return;
    }

    if (
      cart.some(
        (item) =>
          !Number.isFinite(getPrice(item)) ||
          getPrice(item) <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
      )
    ) {
      setPaymentMessage(
        "One or more items have an invalid price or quantity."
      );
      return;
    }

    setCheckoutLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Could not load Razorpay Checkout. Check your internet connection."
        );
      }

      const amount = Number(
        cart
          .reduce((total, item) => total + getPrice(item) * item.quantity, 0)
          .toFixed(2)
      );

      // This calls the backend route created in payments.js.
      const order = await postJSON("/payments/create-order", {
        amount,
        currency: "INR",
      });

      if (!order.order_id || !order.key_id) {
        throw new Error("The server did not return a valid Razorpay order.");
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Styvor",
        description: "Styvor order payment",
        order_id: order.order_id,

        handler: async function (paymentResponse) {
          setCheckoutLoading(true);
          setPaymentMessage("Verifying your payment...");

          try {
            const verification = await postJSON("/payments/verify", {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (!verification.verified) {
              throw new Error("Payment could not be verified.");
            }

            setPaymentMessage(
              `Payment verified successfully. Payment ID: ${verification.payment_id}`
            );

            // Do not clear the cart until your actual order is persisted.
            // The current integration verifies payment but does not save an order.
          } catch (err) {
            setPaymentMessage(
              err.message ||
                "We could not verify the payment. Please contact support before trying again."
            );
          } finally {
            setCheckoutLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
            setPaymentMessage("Checkout closed. No confirmation was received.");
          },
        },

        theme: {
          color: "#222222",
        },
      };

      const razorpayCheckout = new window.Razorpay(options);

      razorpayCheckout.on("payment.failed", function (response) {
        setCheckoutLoading(false);
        setPaymentMessage(
          response.error?.description ||
            "Payment failed. Please try again."
        );
      });

      razorpayCheckout.open();
    } catch (err) {
      setPaymentMessage(err.message || "Could not start checkout.");
      setCheckoutLoading(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    const name = String(product.name || product.title || "");

    const categoryName =
      typeof product.category === "object"
        ? product.category?.name
        : product.category;

    const categoryId =
      typeof product.category === "object"
        ? product.category?.id
        : product.category_id;

    const query = search.trim().toLowerCase();

    const matchesSearch =
      name.toLowerCase().includes(query) ||
      String(product.description || "").toLowerCase().includes(query);

    const matchesCategory =
      activeCategory === "All" ||
      categoryName === activeCategory ||
      categoryId === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + getPrice(item) * item.quantity,
    0
  );

  const modalImages = activeProduct ? getImages(activeProduct) : [];
  const safeImageIndex = Math.min(
    activeImageIndex,
    Math.max(0, modalImages.length - 1)
  );
  const currentImage = modalImages[safeImageIndex];

  return (
    <div className="styvor-app" id="top">
      <div className="announcement-bar">
        Thoughtfully chosen. Made for everyday.
      </div>

      <header className="site-header">
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <a
          className="wordmark"
          href="#top"
          onClick={() => setMobileMenuOpen(false)}
        >
          STYVOR
          <span>THE ART OF EVERYDAY LUXURY</span>
        </a>

        <nav
          className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`}
          aria-label="Main navigation"
        >
          <a href="#shop" onClick={() => setMobileMenuOpen(false)}>
            Shop
          </a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>
            Our Story
          </a>
          <a href="#footer" onClick={() => setMobileMenuOpen(false)}>
            Contact
          </a>
        </nav>

        <div className="header-actions">
          <button
            className="country-button"
            type="button"
            onClick={() => {
              setCountryDraft(getCountryCode(selectedCountry));
              setCountryModalOpen(true);
            }}
          >
            {getCountryCode(selectedCountry) || "—"} / {currency}
          </button>

          <button
            className="icon-button cart-button"
            type="button"
            onClick={() => setCartOpen(true)}
          >
            Bag ({cartCount})
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">LESS, BUT BETTER</p>
            <h1>
              Everyday essentials.
              <br />
              Elevated.
            </h1>
            <p className="hero-description">
              Thoughtfully chosen. Made for everyday.
            </p>
            <a className="button button-dark" href="#shop">
              Explore the collection <span>↗</span>
            </a>
          </div>

          <div className="hero-art">
            <div className="hero-art-label">
              <span>STYVOR EDITION 01</span>
              <span>TIMELESS BY DESIGN</span>
            </div>
            <div className="hero-art-center">
              <span className="hero-monogram">S.</span>
              <span>THE EVERYDAY COLLECTION</span>
            </div>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURATED FOR YOU</p>
              <h2>Shop the collection</h2>
            </div>
            <p className="product-count">
              {loading ? "Loading collection..." : `${filteredProducts.length} items`}
            </p>
          </div>

          <div className="shop-toolbar">
            <div className="category-list" aria-label="Filter by category">
              <button
                type="button"
                className={activeCategory === "All" ? "filter-active" : ""}
                onClick={() => setActiveCategory("All")}
              >
                All
              </button>

              {categories.map((category) => {
                const name =
                  typeof category === "string" ? category : category.name;
                const id =
                  typeof category === "string" ? category : category.id;

                return (
                  <button
                    type="button"
                    key={id || name}
                    className={
                      activeCategory === name || activeCategory === id
                        ? "filter-active"
                        : ""
                    }
                    onClick={() => setActiveCategory(name || id)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products"
              />
            </label>
          </div>

          {error && (
            <div className="status-message error-message">
              <p>{error}</p>
              <button
                className="button button-outline"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
              <p className="small-note">
                Check that your backend is running at {API_URL}.
              </p>
            </div>
          )}

          {loading ? (
            <div className="status-message">Curating your collection...</div>
          ) : !error && filteredProducts.length === 0 ? (
            <div className="status-message">
              No products found. Try another search or category.
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const images = getImages(product);
                const image = images[0]?.image_url;
                const name = product.name || product.title || "Untitled";

                return (
                  <article className="product-card" key={product.id}>
                    <button
                      className="product-image-button"
                      type="button"
                      onClick={() => openProduct(product)}
                      aria-label={`View ${name}`}
                    >
                      <div className="product-image">
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="image-fallback">
                            <span>STYVOR</span>
                            <small>EVERYDAY LUXURY</small>
                          </div>
                        )}
                        <span className="quick-view">Quick view ↗</span>
                      </div>
                    </button>

                    <div className="product-info">
                      <div>
                        <h3>{name}</h3>
                        <p className="product-category">
                          {typeof product.category === "object"
                            ? product.category?.name
                            : product.category || "The collection"}
                        </p>
                      </div>
                      <span className="product-price">
                        {formatPrice(getPrice(product))}
                      </span>
                    </div>

                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(product)}
                    >
                      Add to bag <span>+</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="story-section" id="about">
          <p className="eyebrow">THE STYVOR PHILOSOPHY</p>
          <h2>
            Designed to live with.
            <br />
            Made to last.
          </h2>
          <p>
            We believe luxury is found in the details — considered design,
            useful essentials and pieces that feel right every day.
          </p>
          <a href="#shop" className="text-link">
            Discover the collection ↗
          </a>
        </section>
      </main>

      <footer className="site-footer" id="footer">
        <div className="footer-brand">
          <a className="wordmark footer-wordmark" href="#top">
            STYVOR
            <span>THE ART OF EVERYDAY LUXURY</span>
          </a>
          <p>Thoughtfully chosen. Made for everyday.</p>
        </div>

        <div className="footer-links">
          <a href="#shop">Shop</a>
          <a href="#about">Our story</a>
          <button
            type="button"
            onClick={() => {
              setCountryDraft(getCountryCode(selectedCountry));
              setCountryModalOpen(true);
            }}
          >
            Country &amp; currency
          </button>
        </div>

        <p className="copyright">
          © {new Date().getFullYear()} Styvor. All rights reserved.
        </p>
      </footer>

      {/* Country selector */}
      {countryModalOpen && (
        <div className="modal-backdrop country-backdrop">
          <section
            className="country-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-title"
          >
            <div className="modal-topline">
              <span className="eyebrow">A PERSONALIZED EXPERIENCE</span>
              {selectedCountry && (
                <button
                  type="button"
                  className="icon-button modal-close"
                  aria-label="Close country selector"
                  onClick={() => setCountryModalOpen(false)}
                >
                  ×
                </button>
              )}
            </div>

            <div className="country-monogram">S.</div>
            <h2 id="country-title">Where are you shopping from?</h2>
            <p>
              Choose your country to see the available collection and local
              pricing.
            </p>

            {countries.length > 0 ? (
              <>
                <label className="field-label" htmlFor="country-select">
                  Country / Region
                </label>

                <select
                  id="country-select"
                  value={countryDraft}
                  onChange={(event) => setCountryDraft(event.target.value)}
                >
                  {countries.map((country) => (
                    <option
                      key={country.id || getCountryCode(country)}
                      value={getCountryCode(country)}
                    >
                      {country.name} — {getCurrency(country)}
                    </option>
                  ))}
                </select>

                <button
                  className="button button-dark country-continue"
                  type="button"
                  onClick={saveCountry}
                >
                  Continue <span>→</span>
                </button>

                <p className="small-note">
                  You can change this preference later.
                </p>
              </>
            ) : (
              <p className="status-message">
                No countries are available. Check your countries API.
              </p>
            )}
          </section>
        </div>
      )}

      {/* Product details and image gallery */}
      {activeProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveProduct(null);
            }
          }}
        >
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <button
              type="button"
              className="icon-button product-modal-close"
              aria-label="Close product details"
              onClick={() => setActiveProduct(null)}
            >
              ×
            </button>

            <div className="product-modal-gallery">
              <div className="product-modal-image">
                {currentImage ? (
                  <img
                    key={currentImage.image_url}
                    src={currentImage.image_url}
                    alt={
                      currentImage.alt_text ||
                      activeProduct.name ||
                      activeProduct.title ||
                      "Product"
                    }
                  />
                ) : (
                  <div className="image-fallback">
                    <span>STYVOR</span>
                    <small>EVERYDAY LUXURY</small>
                  </div>
                )}

                {modalImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="gallery-arrow gallery-prev"
                      aria-label="Previous image"
                      onClick={() =>
                        setActiveImageIndex(
                          (safeImageIndex - 1 + modalImages.length) %
                            modalImages.length
                        )
                      }
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="gallery-arrow gallery-next"
                      aria-label="Next image"
                      onClick={() =>
                        setActiveImageIndex(
                          (safeImageIndex + 1) % modalImages.length
                        )
                      }
                    >
                      ›
                    </button>

                    <span className="gallery-counter">
                      {safeImageIndex + 1} / {modalImages.length}
                    </span>
                  </>
                )}
              </div>

              {modalImages.length > 1 && (
                <div className="gallery-thumbnails">
                  {modalImages.map((image, index) => (
                    <button
                      type="button"
                      key={image.id || image.image_url}
                      className={
                        index === safeImageIndex ? "thumbnail-active" : ""
                      }
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={image.image_url}
                        alt={image.alt_text || `Product image ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="product-modal-details">
              <p className="eyebrow">THE STYVOR COLLECTION</p>
              <h2 id="product-modal-title">
                {activeProduct.name || activeProduct.title || "Product"}
              </h2>

              <p className="modal-price">
                {formatPrice(getPrice(activeProduct))}
              </p>

              <p className="modal-description">
                {activeProduct.description ||
                  "Thoughtfully chosen, designed for everyday living."}
              </p>

              <button
                className="button button-dark modal-add-button"
                type="button"
                onClick={() => addToCart(activeProduct)}
              >
                Add to bag <span>+</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Shopping bag */}
      {cartOpen && (
        <div
          className="drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCartOpen(false);
            }
          }}
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">YOUR SELECTION</p>
                <h2 id="cart-title">Shopping bag ({cartCount})</h2>
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Close cart"
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-cart-mark">S.</span>
                <h3>Your bag is waiting.</h3>
                <p>Discover pieces designed for everyday living.</p>

                <button
                  className="button button-dark"
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explore the collection
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => {
                    const image = getImages(item)[0]?.image_url;

                    return (
                      <article className="cart-item" key={item.id}>
                        <div className="cart-item-image">
                          {image ? (
                            <img
                              src={image}
                              alt={item.name || item.title || "Product"}
                            />
                          ) : (
                            <span>S.</span>
                          )}
                        </div>

                        <div className="cart-item-info">
                          <h3>{item.name || item.title || "Product"}</h3>
                          <p>{formatPrice(getPrice(item))}</p>

                          <div className="quantity-control">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => changeQuantity(item.id, -1)}
                            >
                              −
                            </button>

                            <span>{item.quantity}</span>

                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => changeQuantity(item.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="remove-item"
                          onClick={() => {
                            setCart((current) =>
                              current.filter((product) => product.id !== item.id)
                            );
                            setPaymentMessage("");
                          }}
                        >
                          Remove
                        </button>
                      </article>
                    );
                  })}
                </div>

                <div className="cart-summary">
                  <div className="subtotal-row">
                    <span>Subtotal</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>

                  <p>Shipping and taxes are calculated at checkout.</p>

                  {paymentMessage && (
                    <p className="small-note" role="status" aria-live="polite">
                      {paymentMessage}
                    </p>
                  )}

                  <button
                    className="button button-dark checkout-button"
                    type="button"
                    disabled={checkoutLoading}
                    onClick={handleCheckout}
                  >
                    {checkoutLoading
                      ? "Processing..."
                      : "Continue to checkout"}
                    {!checkoutLoading && <span> →</span>}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;