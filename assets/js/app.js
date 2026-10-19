/**
 * Platinum Scissors — Main Application
 * ─────────────────────────────────────
 * Vanilla JS  •  No frameworks  •  No build step
 *
 * Sections handled:
 *  1. Cart (state, localStorage, drawer UI)
 *  2. Product grid (render, search, filter, sort)
 *  3. Product detail modal
 *  4. Product image zoom viewer (pan, drag, pinch, keyboard, up to 3×)
 *  5. Category cards → filter linking
 *  6. Order summary modal + download
 *  7. FAQ accordion
 *  8. Contact form validation
 *  9. Header / mobile menu
 * 10. Toast notifications
 * 11. Accessible focus trap
 */

"use strict";

/* ============================================================
   1.  CART STATE
   ============================================================ */

/**
 * Cart is an array of { id: string, qty: number }.
 * Prices are never stored — they are looked up from PRODUCTS
 * each time the cart is read or displayed.
 */
let cart = [];

/** Read cart from localStorage (safe). */
function loadCart() {
  try {
    const raw = localStorage.getItem("ps_cart");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    // Only keep entries whose product ID still exists in PRODUCTS
    cart = parsed
      .filter((item) => item && typeof item.id === "string" && getProductById(item.id))
      .map((item) => ({
        id: item.id,
        qty: Math.min(99, Math.max(1, parseInt(item.qty, 10) || 1)),
      }));
  } catch {
    cart = [];
  }
}

/** Persist cart to localStorage (safe). */
function saveCart() {
  try {
    localStorage.setItem(
      "ps_cart",
      JSON.stringify(cart.map(({ id, qty }) => ({ id, qty })))
    );
  } catch {
    // Storage quota / private mode — silently ignore
  }
}

/** Get total quantity across all items. */
function cartTotalQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

/** Get total price in cents. */
function cartTotalCents() {
  return cart.reduce((sum, item) => {
    const product = getProductById(item.id);
    return product ? sum + product.priceCents * item.qty : sum;
  }, 0);
}

/**
 * Add a product to the cart.
 * If it already exists, increment qty (capped at 99).
 */
function addToCart(productId, qty = 1) {
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + qty);
  } else {
    cart.push({ id: productId, qty: Math.min(99, Math.max(1, qty)) });
  }
  saveCart();
  renderCartBadge();
  renderCartDrawer();

  const product = getProductById(productId);
  if (product) showToast(`${product.name} added to cart`);
}

/** Update a cart item's quantity. Keeps quantity in 1..99 range. */
function updateCartQty(productId, newQty) {
  const idx = cart.findIndex((item) => item.id === productId);
  if (idx === -1) return;
  if (newQty <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx].qty = Math.min(99, newQty);
  }
  saveCart();
  renderCartBadge();
  renderCartDrawer();
}

/** Remove a product from the cart entirely. */
function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCartBadge();
  renderCartDrawer();
}

/* ============================================================
   2.  PRODUCT GRID
   ============================================================ */

let activeCategory = "All";
let activeSearch = "";
let activeSort = "default";

/** Build category filter buttons from CATEGORIES constant. */
function renderFilterButtons() {
  const container = document.getElementById("shopFilters");
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.setAttribute("data-filter", cat);
    btn.textContent = cat;
    container.appendChild(btn);
  });
}

/** Return filtered + sorted product list. */
function getFilteredProducts() {
  let list = [...PRODUCTS];

  // Category filter
  if (activeCategory !== "All") {
    list = list.filter((p) => p.category === activeCategory);
  }

  // Search
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  // Sort
  if (activeSort === "low") {
    list.sort((a, b) => a.priceCents - b.priceCents);
  } else if (activeSort === "high") {
    list.sort((a, b) => b.priceCents - a.priceCents);
  }

  return list;
}

/** Render the product cards into #productsGrid. */
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const products = getFilteredProducts();

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="empty-state__title">No products found</p>
        <p class="empty-state__text">Try adjusting your search or category filter.</p>
        <button class="btn btn--secondary btn--sm" id="clearFiltersBtn">Clear filters</button>
      </div>`;
    document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-card__image">
        <img src="${p.image}" alt="${p.alt}" loading="lazy" onerror="this.alt='Image unavailable'; this.style.opacity='.3'" />
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${p.category}</span>
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.description}</p>
        <div class="product-card__footer">
          <div class="product-card__price-row">
            <span class="product-card__price">${formatPrice(p.priceCents)}</span>
            <span class="product-card__stock-tag">Sample In Stock</span>
          </div>
          <div class="product-card__actions">
            <button class="btn btn--secondary btn--sm view-details-btn" data-id="${p.id}" aria-label="View details for ${p.name}">View Details</button>
            <button class="btn btn--primary btn--sm add-to-cart-btn" data-id="${p.id}" aria-label="Add ${p.name} to cart">Add to Cart</button>
          </div>
        </div>
      </div>
    </article>`
    )
    .join("");

  // Attach handlers
  grid.querySelectorAll(".view-details-btn").forEach((btn) =>
    btn.addEventListener("click", () => openProductModal(btn.dataset.id, btn))
  );
  grid.querySelectorAll(".add-to-cart-btn").forEach((btn) =>
    btn.addEventListener("click", () => addToCart(btn.dataset.id))
  );
}

/** Reset search, category, sort and re-render. */
function clearFilters() {
  activeCategory = "All";
  activeSearch = "";
  activeSort = "default";
  document.getElementById("shopSearch").value = "";
  document.getElementById("shopSort").value = "default";
  setActiveFilterBtn("All");
  renderProducts();
}

/** Highlight the active filter pill. */
function setActiveFilterBtn(cat) {
  document.querySelectorAll("#shopFilters .filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === cat);
  });
}

/* ============================================================
   3.  PRODUCT DETAIL MODAL
   ============================================================ */

let lastFocusedElement = null; // for returning focus on close
let currentModalProductId = null;

function openProductModal(productId, triggerEl) {
  const product = getProductById(productId);
  if (!product) return;

  currentModalProductId = productId;
  lastFocusedElement = triggerEl || document.activeElement;

  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <div class="modal-product">
      <div class="modal-product__image-wrap">
        <button class="modal-product__image-btn" id="modalImageZoomTrigger" aria-label="Click to enlarge and zoom image for ${product.name}">
          <img src="${product.image}" alt="${product.alt}" id="modalProductImg" onerror="this.alt='Image unavailable'; this.style.opacity='.3'" />
          <span class="modal-product__zoom-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <span>Click to zoom (up to 3×)</span>
          </span>
        </button>
        <button class="btn btn--secondary btn--sm btn--block modal-zoom-btn" id="modalZoomBtn" aria-label="Enlarge and zoom product photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-right:6px;" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          Enlarge &amp; Zoom Photo
        </button>
      </div>

      <div class="modal-product__info">
        <span class="modal-product__category">${product.category}</span>
        <h4 class="modal-product__name">${product.name}</h4>
        <p class="modal-product__desc">${product.description}</p>
        <p class="modal-product__price">${formatPrice(product.priceCents)}</p>

        <div class="qty-selector">
          <span class="qty-selector__label">Quantity</span>
          <button class="qty-btn" id="modalQtyMinus" aria-label="Decrease quantity">−</button>
          <span class="qty-value" id="modalQtyValue">1</span>
          <button class="qty-btn" id="modalQtyPlus" aria-label="Increase quantity">+</button>
        </div>

        <button class="btn btn--primary btn--block" id="modalAddToCart">Add to Cart</button>
        <p class="modal-product__illustrative">High-resolution realistic product photograph. Illustrative sample — demonstration only.</p>
      </div>
    </div>`;

  // Quantity controls
  let qty = 1;
  const qtyVal = document.getElementById("modalQtyValue");
  document.getElementById("modalQtyMinus").addEventListener("click", () => {
    if (qty > 1) { qty--; qtyVal.textContent = qty; }
  });
  document.getElementById("modalQtyPlus").addEventListener("click", () => {
    if (qty < 99) { qty++; qtyVal.textContent = qty; }
  });
  document.getElementById("modalAddToCart").addEventListener("click", () => {
    addToCart(product.id, qty);
    closeProductModal();
  });

  // Zoom triggers
  const zoomTrigger = document.getElementById("modalImageZoomTrigger");
  const zoomBtn = document.getElementById("modalZoomBtn");
  if (zoomTrigger) {
    zoomTrigger.addEventListener("click", () => openZoomModal(product.id, zoomTrigger));
  }
  if (zoomBtn) {
    zoomBtn.addEventListener("click", () => openZoomModal(product.id, zoomBtn));
  }

  const overlay = document.getElementById("productModal");
  overlay.classList.add("open");
  document.body.classList.add("body-no-scroll");

  // Focus the close button
  document.getElementById("modalClose").focus();

  // Trap focus inside modal
  trapFocus(overlay);
}

function closeProductModal() {
  const overlay = document.getElementById("productModal");
  overlay.classList.remove("open");
  document.body.classList.remove("body-no-scroll");
  releaseFocusTrap();
  if (lastFocusedElement) lastFocusedElement.focus();
}

/* ============================================================
   4.  PRODUCT IMAGE ZOOM VIEWER
   ============================================================ */

/**
 * Zoom viewer state.
 * Supports up to 3× zoom, drag/pan, touch pinch, mouse wheel, keyboard.
 */
const zoomState = {
  scale: 1,
  minScale: 1,
  maxScale: 3,
  step: 0.5,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialPanX: 0,
  initialPanY: 0,
  initialTouchDist: 0,
  initialScale: 1,
  lastTap: 0,
  triggerEl: null,
};

/**
 * Clamp pan offset so the image doesn't get dragged off-screen.
 */
function clampZoomPan() {
  if (zoomState.scale <= 1) {
    zoomState.panX = 0;
    zoomState.panY = 0;
    return;
  }
  const viewport = document.getElementById("zoomViewport");
  const img = document.getElementById("zoomImage");
  if (!viewport || !img) return;

  const vpRect = viewport.getBoundingClientRect();
  const imgNaturalW = img.offsetWidth || 500;
  const imgNaturalH = img.offsetHeight || 500;

  const currentW = imgNaturalW * zoomState.scale;
  const currentH = imgNaturalH * zoomState.scale;

  // Maximum pan allowable along each axis (with generous safety margin)
  const maxPanX = Math.max(0, (currentW - vpRect.width) / 2 + 60);
  const maxPanY = Math.max(0, (currentH - vpRect.height) / 2 + 60);

  zoomState.panX = Math.max(-maxPanX, Math.min(maxPanX, zoomState.panX));
  zoomState.panY = Math.max(-maxPanY, Math.min(maxPanY, zoomState.panY));
}

/**
 * Apply current zoom scale and pan to the image.
 */
function applyZoomTransform(smooth = true) {
  const img = document.getElementById("zoomImage");
  const viewport = document.getElementById("zoomViewport");
  const badge = document.getElementById("zoomLevel");
  const inBtn = document.getElementById("zoomInBtn");
  const outBtn = document.getElementById("zoomOutBtn");
  if (!img) return;

  clampZoomPan();

  // Smooth CSS transitions for button/wheel adjustments, instant during dragging
  img.style.transition = smooth ? "transform 0.22s cubic-bezier(0.2, 0, 0, 1)" : "none";
  img.style.transform = `translate(${zoomState.panX}px, ${zoomState.panY}px) scale(${zoomState.scale})`;

  // Update cursor
  if (viewport) {
    if (zoomState.scale > 1) {
      viewport.style.cursor = zoomState.isDragging ? "grabbing" : "grab";
    } else {
      viewport.style.cursor = "zoom-in";
    }
  }

  // Update badge and controls
  const pct = Math.round(zoomState.scale * 100);
  if (badge) badge.textContent = `${pct}%`;
  if (inBtn) inBtn.disabled = zoomState.scale >= zoomState.maxScale - 0.01;
  if (outBtn) outBtn.disabled = zoomState.scale <= zoomState.minScale + 0.01;
}

/**
 * Set a new zoom scale (clamped between 1× and 3×).
 */
function setZoomScale(targetScale, smooth = true) {
  const clamped = Math.min(zoomState.maxScale, Math.max(zoomState.minScale, targetScale));
  zoomState.scale = Math.round(clamped * 100) / 100;

  if (zoomState.scale === 1) {
    zoomState.panX = 0;
    zoomState.panY = 0;
  }
  applyZoomTransform(smooth);
}

/**
 * Reset zoom to 1× and centered pan.
 */
function resetZoom() {
  zoomState.scale = 1;
  zoomState.panX = 0;
  zoomState.panY = 0;
  applyZoomTransform(true);
}

/**
 * Open the dedicated full-screen / lightbox Zoom Modal.
 */
function openZoomModal(productId, triggerEl) {
  const product = getProductById(productId);
  if (!product) return;

  zoomState.triggerEl = triggerEl || document.activeElement;
  zoomState.scale = 1;
  zoomState.panX = 0;
  zoomState.panY = 0;
  zoomState.isDragging = false;

  const modal = document.getElementById("zoomModal");
  const title = document.getElementById("zoomTitle");
  const img = document.getElementById("zoomImage");

  if (title) title.textContent = product.name;
  if (img) {
    img.src = product.image;
    img.alt = product.alt;
  }

  applyZoomTransform(false);

  modal.classList.add("open");
  document.body.classList.add("body-no-scroll");

  const closeBtn = document.getElementById("zoomCloseBtn");
  if (closeBtn) closeBtn.focus();

  trapFocus(modal);
}

/**
 * Close the Zoom Modal.
 */
function closeZoomModal() {
  const modal = document.getElementById("zoomModal");
  modal.classList.remove("open");
  resetZoom();

  // If product modal is still open, keep body-no-scroll
  if (!document.getElementById("productModal").classList.contains("open")) {
    document.body.classList.remove("body-no-scroll");
  }

  // Restore focus trap to parent product modal if open
  const prodModal = document.getElementById("productModal");
  if (prodModal.classList.contains("open")) {
    trapFocus(prodModal);
    if (zoomState.triggerEl) zoomState.triggerEl.focus();
  } else {
    releaseFocusTrap();
    if (zoomState.triggerEl) zoomState.triggerEl.focus();
  }
}

/**
 * Initialise zoom viewer event listeners (mouse, touch, wheel, keyboard).
 */
function initZoomViewer() {
  const modal = document.getElementById("zoomModal");
  const viewport = document.getElementById("zoomViewport");
  const inBtn = document.getElementById("zoomInBtn");
  const outBtn = document.getElementById("zoomOutBtn");
  const resetBtn = document.getElementById("zoomResetBtn");
  const closeBtn = document.getElementById("zoomCloseBtn");

  if (!modal || !viewport) return;

  // Zoom In / Out / Reset
  inBtn.addEventListener("click", () => setZoomScale(zoomState.scale + zoomState.step, true));
  outBtn.addEventListener("click", () => setZoomScale(zoomState.scale - zoomState.step, true));
  resetBtn.addEventListener("click", resetZoom);
  closeBtn.addEventListener("click", closeZoomModal);

  // Close when clicking modal backdrop
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeZoomModal();
  });

  // Mouse wheel zoom
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoomScale(zoomState.scale + delta, true);
    },
    { passive: false }
  );

  // Mouse click & drag to pan
  viewport.addEventListener("mousedown", (e) => {
    // Left mouse button only
    if (e.button !== 0) return;
    if (zoomState.scale > 1) {
      zoomState.isDragging = true;
      zoomState.dragStartX = e.clientX;
      zoomState.dragStartY = e.clientY;
      zoomState.initialPanX = zoomState.panX;
      zoomState.initialPanY = zoomState.panY;
      applyZoomTransform(false);
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!zoomState.isDragging) return;
    const dx = e.clientX - zoomState.dragStartX;
    const dy = e.clientY - zoomState.dragStartY;
    zoomState.panX = zoomState.initialPanX + dx;
    zoomState.panY = zoomState.initialPanY + dy;
    applyZoomTransform(false);
  });

  window.addEventListener("mouseup", () => {
    if (zoomState.isDragging) {
      zoomState.isDragging = false;
      applyZoomTransform(true);
    }
  });

  // Double click to toggle 1× / 2.5×
  viewport.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (zoomState.scale > 1.2) {
      setZoomScale(1, true);
    } else {
      setZoomScale(2.5, true);
    }
  });

  // Single click when at 1× zooms in
  viewport.addEventListener("click", (e) => {
    if (zoomState.scale === 1 && !zoomState.isDragging && e.target.id === "zoomImage") {
      setZoomScale(2, true);
    }
  });

  // Touch interactions (pan, double-tap, and two-finger pinch-to-zoom)
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        const now = Date.now();
        // Double-tap
        if (now - zoomState.lastTap < 300) {
          e.preventDefault();
          if (zoomState.scale > 1.2) {
            setZoomScale(1, true);
          } else {
            setZoomScale(2.5, true);
          }
          zoomState.lastTap = 0;
          return;
        }
        zoomState.lastTap = now;

        if (zoomState.scale > 1) {
          zoomState.isDragging = true;
          zoomState.dragStartX = e.touches[0].clientX;
          zoomState.dragStartY = e.touches[0].clientY;
          zoomState.initialPanX = zoomState.panX;
          zoomState.initialPanY = zoomState.panY;
        }
      } else if (e.touches.length === 2) {
        // Pinch-to-zoom start
        zoomState.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        zoomState.initialTouchDist = Math.hypot(dx, dy);
        zoomState.initialScale = zoomState.scale;
      }
    },
    { passive: false }
  );

  viewport.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 1 && zoomState.isDragging && zoomState.scale > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - zoomState.dragStartX;
        const dy = e.touches[0].clientY - zoomState.dragStartY;
        zoomState.panX = zoomState.initialPanX + dx;
        zoomState.panY = zoomState.initialPanY + dy;
        applyZoomTransform(false);
      } else if (e.touches.length === 2 && zoomState.initialTouchDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const factor = newDist / zoomState.initialTouchDist;
        const targetScale = Math.min(3, Math.max(1, zoomState.initialScale * factor));
        setZoomScale(targetScale, false);
      }
    },
    { passive: false }
  );

  viewport.addEventListener("touchend", () => {
    zoomState.isDragging = false;
    zoomState.initialTouchDist = 0;
    applyZoomTransform(true);
  });

  // Keyboard navigation inside zoom viewer
  viewport.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;

    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setZoomScale(zoomState.scale + zoomState.step, true);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setZoomScale(zoomState.scale - zoomState.step, true);
    } else if (e.key === "0" || e.key === "r" || e.key === "R") {
      e.preventDefault();
      resetZoom();
    } else if (zoomState.scale > 1) {
      const panStep = 40;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        zoomState.panX += panStep;
        applyZoomTransform(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        zoomState.panX -= panStep;
        applyZoomTransform(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        zoomState.panY += panStep;
        applyZoomTransform(true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        zoomState.panY -= panStep;
        applyZoomTransform(true);
      }
    }
  });
}

/* ============================================================
   5.  CATEGORY CARDS → FILTER LINKING
   ============================================================ */

function initCategoryCards() {
  document.querySelectorAll(".category-card[data-category]").forEach((card) => {
    card.addEventListener("click", () => {
      const cat = card.dataset.category;
      activeCategory = cat;
      activeSearch = "";
      document.getElementById("shopSearch").value = "";
      setActiveFilterBtn(cat);
      renderProducts();

      // Scroll to shop section
      document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* ============================================================
   6.  ORDER SUMMARY MODAL + DOWNLOAD
   ============================================================ */

function openOrderModal() {
  if (cart.length === 0) return;

  const body = document.getElementById("orderModalBody");
  let rows = "";
  cart.forEach((item) => {
    const p = getProductById(item.id);
    if (!p) return;
    const lineTotal = p.priceCents * item.qty;
    rows += `<tr>
      <td>${p.name}</td>
      <td>${item.qty}</td>
      <td>${formatPrice(p.priceCents)}</td>
      <td>${formatPrice(lineTotal)}</td>
    </tr>`;
  });

  body.innerHTML = `
    <p class="order-demo-note">This is a demo order summary. No order has been placed and no payment will be taken.</p>
    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table class="order-table">
        <thead>
          <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="order-table__total">
            <td colspan="3">Items Total</td>
            <td>${formatPrice(cartTotalCents())}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="order-actions">
      <button class="btn btn--secondary btn--sm" id="orderEditCart">Edit Cart</button>
      <button class="btn btn--primary btn--sm" id="orderDownload">Download Summary</button>
    </div>`;

  document.getElementById("orderEditCart").addEventListener("click", () => {
    closeOrderModal();
    openCartDrawer();
  });
  document.getElementById("orderDownload").addEventListener("click", downloadOrderSummary);

  const overlay = document.getElementById("orderModal");
  overlay.classList.add("open");
  document.body.classList.add("body-no-scroll");
  document.getElementById("orderModalClose").focus();
  trapFocus(overlay);
}

function closeOrderModal() {
  const overlay = document.getElementById("orderModal");
  overlay.classList.remove("open");
  document.body.classList.remove("body-no-scroll");
  releaseFocusTrap();
}

/** Download order summary as a plain-text file. */
function downloadOrderSummary() {
  let text = "PLATINUM SCISSORS — ORDER SUMMARY (DEMO)\n";
  text += "==========================================\n\n";
  text += "This is a demo summary. No order has been placed.\n\n";

  const colProduct = 30;
  const colQty = 6;
  const colUnit = 12;
  const colTotal = 12;

  text += "Product".padEnd(colProduct) +
          "Qty".padStart(colQty) +
          "Unit Price".padStart(colUnit) +
          "Total".padStart(colTotal) + "\n";
  text += "-".repeat(colProduct + colQty + colUnit + colTotal) + "\n";

  cart.forEach((item) => {
    const p = getProductById(item.id);
    if (!p) return;
    const lineTotal = p.priceCents * item.qty;
    text += p.name.padEnd(colProduct) +
            String(item.qty).padStart(colQty) +
            formatPrice(p.priceCents).padStart(colUnit) +
            formatPrice(lineTotal).padStart(colTotal) + "\n";
  });

  text += "-".repeat(colProduct + colQty + colUnit + colTotal) + "\n";
  text += "Items Total".padEnd(colProduct + colQty + colUnit) +
          formatPrice(cartTotalCents()).padStart(colTotal) + "\n\n";
  text += "Shipping and taxes are not calculated in this demo.\n";
  text += "No payment has been taken.\n";

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "platinum-scissors-order-summary.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   7.  CART DRAWER UI
   ============================================================ */

function openCartDrawer() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartOverlay").setAttribute("aria-hidden", "false");
  document.body.classList.add("body-no-scroll");
  renderCartDrawer();
  document.getElementById("cartClose").focus();
}

function closeCartDrawer() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("cartOverlay").setAttribute("aria-hidden", "true");
  document.body.classList.remove("body-no-scroll");
}

/** Render the cart badge in the header. */
function renderCartBadge() {
  const badge = document.getElementById("cartBadge");
  const total = cartTotalQty();
  badge.textContent = total;
  badge.dataset.count = total;
  badge.setAttribute("aria-label", `${total} item${total !== 1 ? "s" : ""} in cart`);
}

/** Render the cart drawer contents. */
function renderCartDrawer() {
  const body = document.getElementById("cartBody");
  const footer = document.getElementById("cartFooter");

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg class="cart-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p class="cart-empty__title">Your cart is empty</p>
        <p class="cart-empty__text">Browse the shop and add some scissors.</p>
        <button class="btn btn--secondary btn--sm" id="cartContinueShopping">Continue Shopping</button>
      </div>`;
    footer.innerHTML = "";
    body.querySelector("#cartContinueShopping").addEventListener("click", () => {
      closeCartDrawer();
      document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
    });
    return;
  }

  // Items
  body.innerHTML = cart
    .map((item) => {
      const p = getProductById(item.id);
      if (!p) return "";
      const lineTotal = p.priceCents * item.qty;
      return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item__image">
          <img src="${p.image}" alt="${p.alt}" />
        </div>
        <div class="cart-item__details">
          <span class="cart-item__name">${p.name}</span>
          <span class="cart-item__price">${formatPrice(p.priceCents)} each</span>
          <div class="cart-item__controls">
            <div class="cart-item__qty">
              <button class="cart-item__qty-btn cart-qty-minus" data-id="${p.id}" aria-label="Decrease quantity of ${p.name}">−</button>
              <span class="cart-item__qty-value">${item.qty}</span>
              <button class="cart-item__qty-btn cart-qty-plus" data-id="${p.id}" aria-label="Increase quantity of ${p.name}">+</button>
            </div>
            <span class="cart-item__line-total">${formatPrice(lineTotal)}</span>
          </div>
          <button class="cart-item__remove cart-remove-btn" data-id="${p.id}" aria-label="Remove ${p.name} from cart">Remove</button>
        </div>
      </div>`;
    })
    .join("");

  // Footer
  footer.innerHTML = `
    <div class="cart-totals">
      <div class="cart-totals__row cart-totals__row--total">
        <span>Items Total</span>
        <span>${formatPrice(cartTotalCents())}</span>
      </div>
    </div>
    <p class="cart-demo-note">Shipping and taxes are not calculated in this demo.</p>
    <div class="cart-drawer__actions">
      <button class="btn btn--primary btn--block" id="reviewOrderBtn" ${cart.length === 0 ? "disabled" : ""}>Review Order</button>
      <button class="btn btn--ghost btn--block" id="cartContinueShopping2">Continue Shopping</button>
    </div>`;

  // Quantity button listeners
  body.querySelectorAll(".cart-qty-minus").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = cart.find((i) => i.id === btn.dataset.id);
      if (item && item.qty > 1) updateCartQty(btn.dataset.id, item.qty - 1);
    })
  );
  body.querySelectorAll(".cart-qty-plus").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = cart.find((i) => i.id === btn.dataset.id);
      if (item && item.qty < 99) updateCartQty(btn.dataset.id, item.qty + 1);
    })
  );
  body.querySelectorAll(".cart-remove-btn").forEach((btn) =>
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id))
  );

  document.getElementById("reviewOrderBtn").addEventListener("click", () => {
    closeCartDrawer();
    openOrderModal();
  });
  document.getElementById("cartContinueShopping2").addEventListener("click", () => {
    closeCartDrawer();
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  });
}

/* ============================================================
   8.  FAQ ACCORDION
   ============================================================ */

function initFAQ() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isOpen = item.classList.contains("open");

      // Close all others
      document.querySelectorAll(".faq-item.open").forEach((openItem) => {
        openItem.classList.remove("open");
        openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
        openItem.querySelector(".faq-answer").style.maxHeight = null;
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
}

/* ============================================================
   9.  CONTACT FORM VALIDATION
   ============================================================ */

function initContactForm() {
  const form = document.getElementById("contactForm");
  const success = document.getElementById("formSuccess");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;

    // Name
    const name = document.getElementById("contactName").value.trim();
    toggleError("nameGroup", "nameError", !name);
    if (!name) valid = false;

    // Email
    const email = document.getElementById("contactEmail").value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    toggleError("emailGroup", "emailError", !emailValid);
    if (!emailValid) valid = false;

    // Message
    const message = document.getElementById("contactMessage").value.trim();
    toggleError("messageGroup", "messageError", !message);
    if (!message) valid = false;

    if (valid) {
      form.style.display = "none";
      success.classList.add("show");
    }
  });

  // Clear errors on input
  ["contactName", "contactEmail", "contactMessage"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      const group = document.getElementById(id).closest(".form-group");
      group.classList.remove("has-error");
    });
  });
}

function toggleError(groupId, errorId, hasError) {
  const group = document.getElementById(groupId);
  if (group) group.classList.toggle("has-error", hasError);
}

/* ============================================================
   10. HEADER / MOBILE MENU
   ============================================================ */

function initHeader() {
  const header = document.getElementById("header");
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");
  const menuIcon = document.getElementById("menuIcon");

  // Sticky shadow on scroll
  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    },
    { passive: true }
  );

  // Mobile hamburger menu toggle
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");

    if (isOpen) {
      menuIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    } else {
      menuIcon.innerHTML = '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>';
    }
  });

  // Close mobile menu on link click
  nav.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      menuIcon.innerHTML = '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>';
    });
  });
}

/* ============================================================
   11. TOAST NOTIFICATIONS
   ============================================================ */

function showToast(message, duration = 2500) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.setAttribute("role", "status");
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   12. FOCUS TRAP (for accessible modals)
   ============================================================ */

let focusTrapHandler = null;

/**
 * Trap keyboard focus inside a modal container element.
 * Also handles Escape to close modals gracefully.
 */
function trapFocus(container) {
  releaseFocusTrap();

  focusTrapHandler = function (e) {
    if (e.key === "Escape") {
      // Prioritize top-most modal
      if (document.getElementById("zoomModal").classList.contains("open")) {
        closeZoomModal();
      } else if (document.getElementById("productModal").classList.contains("open")) {
        closeProductModal();
      } else if (document.getElementById("orderModal").classList.contains("open")) {
        closeOrderModal();
      } else if (document.getElementById("cartDrawer").classList.contains("open")) {
        closeCartDrawer();
      }
      return;
    }

    if (e.key !== "Tab") return;

    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener("keydown", focusTrapHandler);
}

function releaseFocusTrap() {
  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
    focusTrapHandler = null;
  }
}

/* ============================================================
   13. EVENT WIRING & INITIALISATION
   ============================================================ */

function initShopToolbar() {
  // Search
  document.getElementById("shopSearch").addEventListener("input", (e) => {
    activeSearch = e.target.value.trim();
    renderProducts();
  });

  // Filter buttons
  document.getElementById("shopFilters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    activeCategory = btn.dataset.filter;
    setActiveFilterBtn(activeCategory);
    renderProducts();
  });

  // Sort
  document.getElementById("shopSort").addEventListener("change", (e) => {
    activeSort = e.target.value;
    renderProducts();
  });
}

function initCartUI() {
  // Open cart
  document.getElementById("cartToggle").addEventListener("click", openCartDrawer);

  // Close cart
  document.getElementById("cartClose").addEventListener("click", closeCartDrawer);
  document.getElementById("cartOverlay").addEventListener("click", closeCartDrawer);
}

function initModals() {
  // Product modal close
  document.getElementById("modalClose").addEventListener("click", closeProductModal);
  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  // Order modal close
  document.getElementById("orderModalClose").addEventListener("click", closeOrderModal);
  document.getElementById("orderModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeOrderModal();
  });
}

/* Initialise everything once DOM is ready */
document.addEventListener("DOMContentLoaded", () => {
  // Load saved cart state
  loadCart();

  // Render initial interface
  renderFilterButtons();
  renderProducts();
  renderCartBadge();
  renderCartDrawer();

  // Wire interactive features
  initHeader();
  initCategoryCards();
  initShopToolbar();
  initCartUI();
  initModals();
  initZoomViewer();
  initFAQ();
  initContactForm();
});
