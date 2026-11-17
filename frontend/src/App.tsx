
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./premium.css";
import { initFX } from "./fx";

import {
  getProducts,
  type ApiProduct,
} from "./services/productService";

import {
  getCurrentUser,
  logout,
  type AuthResponse,
} from "./services/authService";

import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  type CartResponse,
} from "./services/cartService";

import AuthModal from "./components/AuthModal";
import ProductDetailsModal from "./components/ProductDetailsModal";
import CheckoutModal from "./components/CheckoutModal";
import OrdersModal from "./components/OrdersModal";
import AdminPanel from "./components/AdminPanel";
import ProductPack from "./components/ProductPack";

function App() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState("Toate");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<ApiProduct | null>(null);

  const [currentUser, setCurrentUser] = useState(
    () => getCurrentUser()
  );

  // Premium motion layer (scroll reveal, cursor glow, parallax).
  useEffect(() => initFX(), []);

  // Load products from PostgreSQL.
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getProducts();

        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load products."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Live inventory synchronization through WebSocket.
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryDelay = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      socket = new WebSocket("ws://localhost:8080/ws/inventory");

      socket.onopen = () => {
        retryDelay = 1000;
        console.info("TRENIX WebSocket connected.");
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
          };

          if (message.type === "INVENTORY_UPDATED") {
            const updatedProducts = await getProducts();
            setProducts(updatedProducts);
          }
        } catch (socketError) {
          console.error(
            "Inventory synchronization failed:",
            socketError
          );
        }
      };

      socket.onclose = () => {
        if (!stopped) {
          retryTimer = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      stopped = true;

      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }

      socket?.close();
    };
  }, []);

  // Load the authenticated user's cart.
  const userId = currentUser?.userId;

  useEffect(() => {
    let cancelled = false;

    if (userId === undefined) {
      setCart(null);
      setCartLoading(false);
      setCartError(null);
      return;
    }

    async function loadCart() {
      try {
        setCartLoading(true);
        setCartError(null);

        const data = await getCart();

        if (!cancelled) {
          setCart(data);
        }
      } catch (err) {
        if (!cancelled) {
          setCartError(
            err instanceof Error
              ? err.message
              : "Could not load your cart."
          );
        }
      } finally {
        if (!cancelled) {
          setCartLoading(false);
        }
      }
    }

    void loadCart();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Categories are derived from the real product data.
  const categories = useMemo(() => {
    const uniqueCategories = new Map<number, string>();

    products.forEach((product) => {
      uniqueCategories.set(
        product.category.id,
        product.category.name
      );
    });

    return Array.from(uniqueCategories.entries()).map(
      ([id, name], index) => ({
        id,
        name,
        number: String(index + 1).padStart(2, "0"),
      })
    );
  }, [products]);

  // Search and category filtering.
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Toate" ||
        product.category.name === activeCategory;

      const searchContent = [
        product.name,
        product.brand,
        product.description ?? "",
        product.category.name,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchContent.includes(
        searchTerm.toLowerCase()
      );

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  const featuredProduct = useMemo(() => {
    return (
      products.find((product) =>
        product.name.toLowerCase().includes("whey")
      ) ?? products[0]
    );
  }, [products]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
    }).format(price);

  const getProductInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 4)
      .toUpperCase();

  const getProductVisual = (name: string) => {
    const normalized = name.toLowerCase();

    if (
      normalized.includes("whey") ||
      normalized.includes("protein")
    ) {
      return "protein";
    }

    if (normalized.includes("creatine")) {
      return "creatine";
    }

    if (normalized.includes("pre-workout")) {
      return "energy";
    }

    if (
      normalized.includes("vitamin") ||
      normalized.includes("omega")
    ) {
      return "wellness";
    }

    if (normalized.includes("collagen")) {
      return "recovery";
    }

    return "performance";
  };

  const getCategoryDescription = (name: string) => {
    const normalized = name.toLowerCase();

    if (normalized.includes("protein")) {
      return "Build your foundation. Support strength and recovery.";
    }

    if (normalized.includes("creatin")) {
      return "Power, performance and everyday training support.";
    }

    if (normalized.includes("vitamin")) {
      return "Daily essentials to support your routine.";
    }

    if (normalized.includes("recuper")) {
      return "Make recovery part of your performance.";
    }

    if (normalized.includes("pre")) {
      return "Get focused. Bring intensity to every session.";
    }

    if (normalized.includes("amino")) {
      return "Support your training with targeted nutrition.";
    }

    return "Find the right support for your training goals.";
  };

  const scrollToShop = () => {
    document.getElementById("shop")?.scrollIntoView({
      behavior: "smooth",
    });
    setMenuOpen(false);
  };

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    scrollToShop();
  };

  // Successful authentication.
  const handleAuthSuccess = (user: AuthResponse) => {
    setCurrentUser({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });

    setAuthOpen(false);
    setCartOpen(false);
  };

  // Logout.
  const handleLogout = () => {
    logout();

    setCurrentUser(null);
    setCart(null);
    setCartOpen(false);
    setCartError(null);
    setCheckoutOpen(false);
    setOrdersOpen(false);
    setAdminOpen(false);
    setSelectedProduct(null);
  };

  // Reload cart and inventory after checkout.
  const handleOrderCreated = async () => {
    setCartOpen(false);

    try {
      const updatedCart = await getCart();
      setCart(updatedCart);
      setCartError(null);
    } catch (err) {
      setCartError(
        err instanceof Error
          ? err.message
          : "Order created, but cart could not be refreshed."
      );
    }

    try {
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
    } catch {
      // Keep the previously loaded products.
    }
  };

  // Add product to the real cart.
  const handleAddToCart = async (
    product: ApiProduct,
    quantity: number = 1
  ) => {
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }

    try {
      setCartError(null);
      setCartLoading(true);

      const updatedCart = await addToCart(
        product.id,
        quantity
      );

      setCart(updatedCart);
      setSelectedProduct(null);
      setCartOpen(true);
    } catch (err) {
      setCartError(
        err instanceof Error
          ? err.message
          : "Could not add product to cart."
      );

      setCartOpen(true);
    } finally {
      setCartLoading(false);
    }
  };

  // Update cart quantity.
  const handleUpdateQuantity = async (
    productId: number,
    quantity: number
  ) => {
    if (quantity < 1) {
      await handleRemoveProduct(productId);
      return;
    }

    try {
      setCartError(null);
      setCartLoading(true);

      const updatedCart = await updateCartItem(
        productId,
        quantity
      );

      setCart(updatedCart);
    } catch (err) {
      setCartError(
        err instanceof Error
          ? err.message
          : "Could not update quantity."
      );
    } finally {
      setCartLoading(false);
    }
  };

  // Remove one product.
  const handleRemoveProduct = async (productId: number) => {
    try {
      setCartError(null);
      setCartLoading(true);

      const updatedCart = await removeFromCart(productId);
      setCart(updatedCart);
    } catch (err) {
      setCartError(
        err instanceof Error
          ? err.message
          : "Could not remove product."
      );
    } finally {
      setCartLoading(false);
    }
  };

  // Clear the cart.
  const handleClearCart = async () => {
    try {
      setCartError(null);
      setCartLoading(true);

      const updatedCart = await clearCart();
      setCart(updatedCart);
    } catch (err) {
      setCartError(
        err instanceof Error
          ? err.message
          : "Could not clear cart."
      );
    } finally {
      setCartLoading(false);
    }
  };

  const cartItemCount = cart?.totalItems ?? 0;
  const isAdmin = String(currentUser?.role ?? "")
    .toUpperCase()
    .includes("ADMIN");

  return (
    <div className="tnx-app">
      <div className="tnx-preloader" aria-hidden="true">
        <b>Trenix<span>.</span></b>
        <i />
      </div>
      <div className="tnx-progress" aria-hidden="true" />
      <div className="tnx-cursor" aria-hidden="true" />

      {/* ANNOUNCEMENT */}
      <div className="tnx-announcement">
        <span>INDEPENDENT PERFORMANCE NUTRITION</span>
        <span>TRAIN WITH INTENTION. RECOVER WITH PURPOSE.</span>
        <span>EST. TRENIX / 2026</span>
      </div>

      {/* HEADER */}
      <header className="tnx-header">
        <a href="#home" className="tnx-logo" aria-label="TRENIX home">
          TRENIX<span>.</span>
        </a>

        <nav className={`tnx-nav ${menuOpen ? "is-open" : ""}`}>
          <a href="#shop" onClick={() => setMenuOpen(false)}>SHOP</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>COLLECTIONS</a>
          <a href="#story" onClick={() => setMenuOpen(false)}>OUR APPROACH</a>
        </nav>

        <div className="tnx-header-actions">
          <button
            className="tnx-search-trigger"
            type="button"
            aria-label="Search products"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <span>SEARCH</span>
            <span className="tnx-search-icon">⌕</span>
          </button>

          {currentUser ? (
            <>
              <button
                className="tnx-account-button"
                type="button"
                onClick={handleLogout}
                title={`Signed in as ${currentUser.email}`}
              >
                <span>ACCOUNT</span>
                <span className="tnx-avatar">
                  {currentUser.firstName.charAt(0).toUpperCase()}
                </span>
              </button>

              <button
                className="tnx-header-link"
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setOrdersOpen(true);
                }}
              >
                ORDERS
              </button>

              {isAdmin && (
                <button
                  className="tnx-header-link tnx-admin-link"
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setOrdersOpen(false);
                    setAdminOpen(true);
                  }}
                >
                  ADMIN
                </button>
              )}
            </>
          ) : (
            <button
              className="tnx-header-link"
              type="button"
              onClick={() => setAuthOpen(true)}
            >
              ACCOUNT
            </button>
          )}

          <button
            className={`tnx-bag-button ${cartOpen ? "is-active" : ""}`}
            type="button"
            onClick={() => setCartOpen((open) => !open)}
          >
            BAG <span>{cartItemCount}</span>
          </button>

          <button
            className="tnx-menu-toggle"
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "×" : "＋"}
          </button>
        </div>
      </header>

      {/* SEARCH */}
      {searchOpen && (
        <div className="tnx-search-panel">
          <div className="tnx-search-inner">
            <span>FIND YOUR PRODUCT</span>
            <input
              type="search"
              placeholder="Search protein, creatine, recovery..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setActiveCategory("Toate");
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchOpen(false);
              }}
            >
              CLOSE ×
            </button>
          </div>
        </div>
      )}

      <main>
        {/* CINEMATIC HERO */}
        <section className="tnx-hero" id="home">
          <div className="tnx-hero-background" />

          <div className="tnx-hero-topline">
            <span>01 — PERFORMANCE SERIES</span>
            <span>BUILT FOR THE DISCIPLINED</span>
          </div>

          <div className="tnx-hero-layout">
            <div className="tnx-hero-copy">
              <span className="tnx-eyebrow">
                <i />
                PREMIUM SPORTS NUTRITION
              </span>

              <h1>
                Nothing
                <br />
                <span>average.</span>
                <br />
                <em>Only</em> <b>better.</b>
              </h1>

              <div className="tnx-hero-description">
                <p>
                  Performance is built through discipline.
                  Your nutrition should be no different.
                </p>

                <p>
                  Purposeful essentials for people who
                  expect more from every session.
                </p>
              </div>

              <div className="tnx-hero-actions">
                <button
                  className="tnx-button-primary"
                  type="button"
                  onClick={scrollToShop}
                >
                  EXPLORE THE COLLECTION
                  <span>↗</span>
                </button>

                <a href="#story" className="tnx-text-link">
                  OUR PHILOSOPHY <span>↓</span>
                </a>
              </div>

              <div className="tnx-hero-index">
                <span>TNX / 001</span>
                <span>MADE FOR THE WORK</span>
              </div>
            </div>

            <div className="tnx-hero-visual">
              <div className="tnx-visual-caption tnx-caption-top">
                PERFORMANCE
                <br />
                WITHOUT NOISE
              </div>

              <div className="tnx-visual-orbit tnx-orbit-one" />
              <div className="tnx-visual-orbit tnx-orbit-two" />

              <div className="tnx-hero-product">
                {featuredProduct?.imageUrl ? (
                  <img
                    src={featuredProduct.imageUrl}
                    alt={featuredProduct.name}
                  />
                ) : (
                  <div className="tnx-pack3d tnx-pack-hero">
                    <ProductPack
                      name={featuredProduct?.name ?? "Performance"}
                      category={featuredProduct?.category.name}
                    />
                  </div>
                )}
              </div>

              <div className="tnx-visual-caption tnx-caption-bottom">
                <span>THE ESSENTIALS</span>
                <strong>
                  {featuredProduct
                    ? formatPrice(featuredProduct.price)
                    : "TRENIX"}
                </strong>
              </div>

              <span className="tnx-visual-side-note">
                FORM FOLLOWS FUNCTION — TRENIX
              </span>
            </div>
          </div>

          <div className="tnx-hero-bottom">
            <span>BUILT FOR STRENGTH.</span>
            <span>TRAIN HARD. RECOVER SMART.</span>
            <span>SCROLL TO DISCOVER ↓</span>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="tnx-marquee" aria-hidden="true">
          <div className="tnx-marquee-track">
            {[0, 1].flatMap((k) =>
              ["Built for strength", "Train hard", "Recover smart", "No shortcuts", "Pure performance", "Repeat"].map((t) => (
                <span key={`${k}-${t}`}>{t}</span>
              ))
            )}
          </div>
        </div>

        {/* EDITORIAL INTRO STRIP */}
        <section className="tnx-manifest">
          <span className="tnx-manifest-label">THE TRENIX STANDARD</span>
          <p>
            Not a shortcut.
            <span> A commitment.</span>
            <br />
            Not more noise.
            <span> Just what matters.</span>
          </p>
          <span className="tnx-manifest-number">TNX / 2026</span>
        </section>

        {/* COLLECTIONS */}
        <section className="tnx-collections" id="categories">
          <div className="tnx-section-heading">
            <div>
              <span className="tnx-eyebrow">
                <i />
                FIND YOUR EDGE / 02
              </span>
              <h2>
                Choose your
                <br />
                <span>focus.</span>
              </h2>
            </div>

            <p>
              Every goal requires a different approach.
              <br />
              Start with what moves you forward.
            </p>
          </div>

          <div className="tnx-collection-list">
            {categories.map((category, index) => (
              <button
                type="button"
                className={`tnx-collection-card tnx-collection-${index % 4}`}
                key={category.id}
                onClick={() => selectCategory(category.name)}
              >
                <span className="tnx-collection-number">
                  {category.number}
                </span>

                <span className="tnx-collection-description">
                  {getCategoryDescription(category.name)}
                </span>

                <strong>{category.name}</strong>

                <span className="tnx-collection-arrow">↗</span>
              </button>
            ))}

            {categories.length === 0 && !isLoading && (
              <p className="tnx-empty">
                Collections will appear here when products are available.
              </p>
            )}
          </div>
        </section>

        {/* SHOP */}
        <section className="tnx-shop" id="shop">
          <div className="tnx-shop-heading">
            <div>
              <span className="tnx-eyebrow">
                <i />
                THE TRENIX SELECTION / 03
              </span>

              <h2>
                The
                <span> essentials.</span>
              </h2>

              <p>
                No unnecessary extras. Just purposeful products
                for your training and recovery routine.
              </p>
            </div>

            <div className="tnx-shop-count">
              <strong>{filteredProducts.length.toString().padStart(2, "0")}</strong>
              <span>PRODUCTS</span>
            </div>
          </div>

          {/* FILTERS */}
          <div className="tnx-filters">
            <div className="tnx-filter-list">
              {["Toate", ...categories.map((category) => category.name)].map(
                (category) => (
                  <button
                    type="button"
                    key={category}
                    className={
                      activeCategory === category ? "is-active" : ""
                    }
                    onClick={() => setActiveCategory(category)}
                  >
                    {category === "Toate" ? "ALL PRODUCTS" : category.toUpperCase()}
                  </button>
                )
              )}
            </div>

            <span>
              {searchTerm
                ? `SEARCH: ${searchTerm}`
                : "CURATED FOR PERFORMANCE"}
            </span>
          </div>

          {isLoading && (
            <div className="tnx-shop-state">
              <span className="tnx-loading-mark">T.</span>
              <p>LOADING THE COLLECTION...</p>
            </div>
          )}

          {error && (
            <div className="tnx-shop-state tnx-shop-error">
              <p>THE COLLECTION IS TEMPORARILY UNAVAILABLE.</p>
              <span>{error}</span>
              <button
                className="tnx-button-primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                TRY AGAIN <span>↗</span>
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="tnx-product-grid">
                {filteredProducts.map((product, index) => {
                  const visual = getProductVisual(product.name);

                  return (
                    <article className={`tnx-product-card tnx-v${index % 6}`} key={product.id}>
                      <div className={`tnx-product-art tnx-art-${visual}`}>
                        <span className="tnx-product-art-index">
                          TNX / {String(index + 1).padStart(2, "0")}
                        </span>

                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={`${product.brand} ${product.name}`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="tnx-pack3d">
                            <ProductPack name={product.name} category={product.category.name} />
                          </div>
                        )}

                        <span className="tnx-product-index">
                          {product.stock > 0
                            ? `${product.stock} IN STOCK`
                            : "SOLD OUT"}
                        </span>
                      </div>

                      <div className="tnx-product-details">
                        <div className="tnx-product-meta">
                          <span>{product.category.name.toUpperCase()}</span>
                          <span>{product.brand}</span>
                        </div>

                        <h3>{product.name}</h3>

                        <p>
                          {product.description ||
                            "Purposeful nutrition for your performance routine."}
                        </p>

                        <div className="tnx-product-actions">
                          <strong>{formatPrice(product.price)}</strong>

                          <button
                            type="button"
                            className="tnx-product-view"
                            onClick={() => setSelectedProduct(product)}
                          >
                            DETAILS <span>↗</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          className="tnx-add-button"
                          disabled={product.stock <= 0 || cartLoading}
                          onClick={() => handleAddToCart(product, 1)}
                        >
                          {product.stock <= 0
                            ? "CURRENTLY UNAVAILABLE"
                            : "ADD TO BAG"}
                          <span>+</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="tnx-shop-state">
                  <span className="tnx-loading-mark">T.</span>
                  <p>NO PRODUCTS FOUND.</p>
                  <button
                    type="button"
                    className="tnx-text-link"
                    onClick={() => {
                      setActiveCategory("Toate");
                      setSearchTerm("");
                    }}
                  >
                    CLEAR FILTERS ↗
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* BRAND STORY */}
        <section className="tnx-story" id="story">
          <div className="tnx-story-topline">
            <span>04 / THE TRENIX APPROACH</span>
            <span>DISCIPLINE IS THE DIFFERENCE</span>
          </div>

          <div className="tnx-story-layout">
            <div className="tnx-story-title">
              <span className="tnx-eyebrow">
                <i />
                BUILT FOR THE DRIVEN
              </span>

              <h2>
                The work
                <br />
                <span>comes first.</span>
              </h2>
            </div>

            <div className="tnx-story-copy">
              <div className="tnx-story-symbol">T.</div>

              <p>
                Progress isn't built in a day. It's built through
                consistency, commitment and the decision to keep showing up.
              </p>

              <p>
                TRENIX is about keeping your routine focused:
                purposeful nutrition, clear goals and no shortcuts.
              </p>

              <a href="#shop" className="tnx-text-link">
                FIND YOUR ESSENTIALS <span>↗</span>
              </a>
            </div>
          </div>

          <div className="tnx-story-footer">
            <span>TRAIN HARD.</span>
            <span>RECOVER SMART.</span>
            <span>REPEAT.</span>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="tnx-final-cta">
          <div>
            <span>YOUR NEXT SESSION STARTS HERE</span>
            <h2>
              Show up.
            <br />
            <em>Level up.</em>
            </h2>
          </div>

          <button
            className="tnx-cta-circle"
            type="button"
            onClick={scrollToShop}
          >
            EXPLORE
            <span>↗</span>
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="tnx-footer" id="contact">
        <div className="tnx-footer-main">
          <div>
            <a href="#home" className="tnx-logo tnx-footer-logo">
              TRENIX<span>.</span>
            </a>
            <p>BUILT FOR STRENGTH.</p>
          </div>

          <div className="tnx-footer-links">
            <a href="#shop">SHOP</a>
            <a href="#categories">COLLECTIONS</a>
            <a href="#story">OUR APPROACH</a>
            <a href="mailto:hello@trenix.store">CONTACT</a>
          </div>
        </div>

        <div className="tnx-footer-bottom">
          <span>© 2026 TRENIX. ALL RIGHTS RESERVED.</span>
          <span>TRAIN HARD. RECOVER SMART.</span>
          <a href="#home">BACK TO TOP ↑</a>
        </div>
      </footer>

      {/* CART BACKDROP */}
      {cartOpen && (
        <button
          type="button"
          className="tnx-cart-backdrop"
          aria-label="Close shopping bag"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <aside
          className="tnx-cart-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping bag"
        >
          <div className="tnx-drawer-header">
            <div>
              <span>YOUR SELECTION</span>
              <h2>THE BAG<span>.</span></h2>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              aria-label="Close bag"
            >
              ×
            </button>
          </div>

          {!currentUser && (
            <div className="tnx-drawer-empty">
              <span>TNX / ACCOUNT</span>
              <h3>YOUR BAG IS LOCKED.</h3>
              <p>Sign in to access your personal shopping bag.</p>
              <button
                type="button"
                className="tnx-button-primary"
                onClick={() => {
                  setCartOpen(false);
                  setAuthOpen(true);
                }}
              >
                SIGN IN <span>↗</span>
              </button>
            </div>
          )}

          {currentUser && cartLoading && (
            <div className="tnx-drawer-state">
              UPDATING YOUR BAG...
            </div>
          )}

          {currentUser && cartError && (
            <div className="tnx-drawer-error" role="alert">
              {cartError}
            </div>
          )}

          {currentUser && !cartLoading && !cartError && cart && (
            <>
              <div className="tnx-drawer-count">
                <span>YOUR ITEMS</span>
                <strong>{cart.totalItems.toString().padStart(2, "0")}</strong>
              </div>

              {cart.items.length === 0 ? (
                <div className="tnx-drawer-empty">
                  <span>TNX / 000</span>
                  <h3>NOTHING HERE. YET.</h3>
                  <p>Your bag is waiting for something purposeful.</p>
                  <button
                    type="button"
                    className="tnx-button-primary"
                    onClick={() => {
                      setCartOpen(false);
                      scrollToShop();
                    }}
                  >
                    EXPLORE PRODUCTS <span>↗</span>
                  </button>
                </div>
              ) : (
                <div className="tnx-cart-items">
                  {cart.items.map((item) => (
                    <article className="tnx-cart-item" key={item.id}>
                      <div className="tnx-cart-item-visual">
                        <span>
                          {getProductInitials(item.productName)}
                        </span>
                      </div>

                      <div className="tnx-cart-item-info">
                        <h3>{item.productName}</h3>
                        <span>{formatPrice(item.unitPrice)} / UNIT</span>

                        <div className="tnx-quantity-control">
                          <button
                            type="button"
                            disabled={cartLoading}
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.quantity - 1
                              )
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            disabled={cartLoading}
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="tnx-cart-item-total">
                        <strong>{formatPrice(item.subtotal)}</strong>
                        <button
                          type="button"
                          disabled={cartLoading}
                          onClick={() =>
                            handleRemoveProduct(item.productId)
                          }
                        >
                          REMOVE
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {cart.items.length > 0 && (
                <div className="tnx-drawer-footer">
                  <div className="tnx-drawer-total">
                    <span>SUBTOTAL</span>
                    <strong>{formatPrice(cart.totalPrice)}</strong>
                  </div>

                  <p>Shipping is calculated during checkout.</p>

                  <button
                    type="button"
                    className="tnx-clear-button"
                    disabled={cartLoading}
                    onClick={handleClearCart}
                  >
                    CLEAR BAG
                  </button>

                  <button
                    type="button"
                    className="tnx-button-primary tnx-checkout-button"
                    disabled={cartLoading}
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    PROCEED TO CHECKOUT <span>↗</span>
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      )}

      {/* AUTHENTICATION */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* CHECKOUT */}
      {checkoutOpen && currentUser && cart && cart.items.length > 0 && (
        <CheckoutModal
          cart={cart}
          customer={{
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
          }}
          onClose={() => setCheckoutOpen(false)}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {/* ADMIN */}
      {adminOpen && currentUser && isAdmin && (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          onProductsChanged={async () => {
            const refreshed = await getProducts();
            setProducts(refreshed);
          }}
        />
      )}

      {/* ORDER HISTORY */}
      {ordersOpen && currentUser && (
        <OrdersModal onClose={() => setOrdersOpen(false)} />
      )}

      {/* PRODUCT DETAILS */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}

export default App;
