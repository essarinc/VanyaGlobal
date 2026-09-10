/* ============================================================
   VANYA GLOBAL — orders.js
   Full order history for the signed-in account, read from
   VanyaAccount ("orders" key, namespaced per user by
   account-store.js). Swap loadOrders() for GET /api/orders
   in production — nothing else on this page needs to change.
   ============================================================ */

(function () {
  "use strict";

  let state = { status: "all", query: "" };

  /* ---------- storage ---------- */

  function loadOrders() {
    return VanyaAccount.get("orders", []);
  }

  /* ---------- helpers ---------- */

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatPrice(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  }

  function trackingStepsFor(status) {
    const order = ["Processing", "Shipped", "Delivered"];
    if (status === "Cancelled") {
      return [{ label: "Order placed", done: true }, { label: "Cancelled", done: true }];
    }
    const idx = order.indexOf(status);
    return order.map((label, i) => ({ label, done: i <= idx }));
  }

  /* ---------- rendering ---------- */

  function filteredOrders() {
    const orders = loadOrders();
    const q = state.query.trim().toLowerCase();
    return orders.filter(o => {
      const statusMatch = state.status === "all" || o.status === state.status;
      const queryMatch = !q || String(o.id).toLowerCase().includes(q) || String(o.name).toLowerCase().includes(q);
      return statusMatch && queryMatch;
    });
  }

  function render() {
    const list = document.getElementById("ordersFullList");
    const orders = filteredOrders();

    if (!orders.length) {
      const hasAny = loadOrders().length > 0;
      list.innerHTML = `
        <div class="empty-state">
          <span class="icon-badge">
            <svg width="22" height="22" viewBox="0 0 19 19" fill="none"><path d="M4.5 6.5h10l-.7 9.2a1.4 1.4 0 0 1-1.4 1.3H6.6a1.4 1.4 0 0 1-1.4-1.3L4.5 6.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 6.5V5a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </span>
          <h5>${hasAny ? "No orders match" : "No orders yet"}</h5>
          <p>${hasAny ? "Try a different status or search term." : "Once you place an order, it'll show up here with live status and delivery updates."}</p>
          ${hasAny ? "" : '<a href="index.html#order" class="btn btn-solid btn-sm">Shop KordiSure</a>'}
        </div>`;
      return;
    }

    list.innerHTML = orders.map(order => `
      <div class="order-row" data-id="${order.id}" tabindex="0" role="button" aria-label="View details for order ${order.id}">
        <div class="order-thumb"><img src="${order.image}" alt="${order.name}"></div>
        <div class="order-info">
          <h5>${order.name}</h5>
          <p>Order ID: #${order.id}</p>
          <p>${formatDate(order.date)}</p>
        </div>
        <span class="status-pill">${order.status}</span>
        <span class="order-price">${formatPrice(order.price)}</span>
        <svg class="order-chevron" width="18" height="18" viewBox="0 0 19 19" fill="none"><path d="M7 4l6 5.5L7 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `).join("");

    list.querySelectorAll(".order-row").forEach(row => {
      row.addEventListener("click", () => openDrawer(row.dataset.id));
      row.addEventListener("keydown", e => { if (e.key === "Enter") openDrawer(row.dataset.id); });
    });
  }

  /* ---------- detail drawer ---------- */

  function openDrawer(id) {
    const order = loadOrders().find(o => String(o.id) === String(id));
    if (!order) return;

    const items = order.items && order.items.length ? order.items : [{ name: order.name, qty: 1, price: order.price }];
    const subtotal = items.reduce((sum, it) => sum + Number(it.price) * (it.qty || 1), 0);
    const shipping = order.shipping != null ? order.shipping : 0;

    document.getElementById("orderDrawerBody").innerHTML = `
      <div class="drawer-order-head">
        <img src="${order.image}" alt="${order.name}">
        <div>
          <h4>${order.name}</h4>
          <p>Order ID: #${order.id} · ${formatDate(order.date)}</p>
          <span class="status-pill">${order.status}</span>
        </div>
      </div>

      <div class="drawer-section">
        <h5>Tracking</h5>
        <div class="tracking-steps">
          ${trackingStepsFor(order.status).map(s => `
            <div class="tracking-step ${s.done ? "done" : ""}">
              <span class="tracking-dot"></span>
              <div><p>${s.label}</p></div>
            </div>`).join("")}
        </div>
      </div>

      <div class="drawer-section">
        <h5>Items</h5>
        ${items.map(it => `
          <div class="drawer-row"><span>${it.name} × ${it.qty || 1}</span><span>${formatPrice(it.price * (it.qty || 1))}</span></div>
        `).join("")}
        <div class="drawer-row"><span>Shipping</span><span>${shipping ? formatPrice(shipping) : "Free"}</span></div>
        <div class="drawer-row total"><span>Total</span><span>${formatPrice(subtotal + shipping)}</span></div>
      </div>

      ${order.address ? `
      <div class="drawer-section">
        <h5>Delivery Address</h5>
        <p style="font-size:.88rem; color:var(--ink); margin:0;">${order.address}</p>
      </div>` : ""}
    `;

    document.getElementById("orderDrawer").classList.add("open");
    document.getElementById("orderDrawer").setAttribute("aria-hidden", "false");
    document.getElementById("orderDrawerScrim").classList.add("open");
  }

  function closeDrawer() {
    document.getElementById("orderDrawer").classList.remove("open");
    document.getElementById("orderDrawer").setAttribute("aria-hidden", "true");
    document.getElementById("orderDrawerScrim").classList.remove("open");
  }

  /* ---------- controls ---------- */

  function initControls() {
    document.getElementById("orderFilters").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      document.querySelectorAll(".filter-chip").forEach(c => { c.classList.remove("active"); c.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      state.status = btn.dataset.status;
      render();
    });

    document.getElementById("orderSearch").addEventListener("input", (e) => {
      state.query = e.target.value;
      render();
    });

    document.getElementById("orderDrawerClose").addEventListener("click", closeDrawer);
    document.getElementById("orderDrawerScrim").addEventListener("click", closeDrawer);
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initControls();
    render();
  });
})();