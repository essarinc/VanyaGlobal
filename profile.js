/* ============================================================
   VANYA GLOBAL — profile.js
   Drives the My Profile page entirely from stored account data.

   In production, swap PROFILE_STORE / ORDERS_STORE for real calls
   to your backend (e.g. GET /api/account, PATCH /api/account,
   GET /api/orders) using the signed-in user's session/auth token.
   For this static build, the same data is kept in localStorage so
   the page behaves like a real account: nothing below is hardcoded
   into the HTML — it's all read from and written back to storage.
   ============================================================ */

(function () {
  "use strict";

  const PROFILE_KEY = "vanyaGlobal.profile";
  const ORDERS_KEY   = "vanyaGlobal.orders";

  const FIELDS = ["fullName", "email", "phone", "dob", "gender", "location"];

  /* ---------- storage layer ---------- */

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return null;
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function loadOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return [];
  }

  /* ---------- helpers ---------- */

  function formatDate(iso, opts) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", opts || { day: "numeric", month: "long", year: "numeric" });
  }

  function initialsAvatar(name) {
    const initials = (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0] ? w[0].toUpperCase() : "")
      .join("") || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
      <rect width="240" height="240" fill="#24402b"/>
      <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
        font-family="Manrope, sans-serif" font-size="88" font-weight="700" fill="#f7f2e6">${initials}</text>
    </svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
  }

  /* ---------- rendering ---------- */

  function render() {
    const profile = loadProfile() || {};
    const hasAnyDetail = FIELDS.some(f => profile[f]);

    document.getElementById("profileNudge").hidden = hasAnyDetail;

    // hero
    document.getElementById("heroAvatar").src = profile.avatar || initialsAvatar(profile.fullName);
    document.getElementById("heroName").textContent = profile.fullName || "Add your name";
    document.getElementById("heroEmail").textContent = profile.email || "Add your email address";
    document.getElementById("heroPhone").textContent = profile.phone || "Add your phone number";
    document.getElementById("heroMemberSince").textContent = profile.memberSince
      ? "Member since " + formatDate(profile.memberSince, { month: "long", year: "numeric" })
      : "Member since —";

    // personal information rows
    document.querySelectorAll("#infoRows .info-row").forEach(row => {
      const field = row.dataset.field;
      const view = row.querySelector("[data-view]");
      const input = row.querySelector(".info-input");
      const value = profile[field] || "";

      input.value = value;

      if (field === "dob") {
        view.textContent = value ? formatDate(value) : "Add your date of birth";
      } else if (field === "email" || field === "phone") {
        view.childNodes[0].textContent = (value || (field === "email" ? "Add your email address" : "Add your phone number")) + " ";
        const badge = row.querySelector("[data-verified-badge]");
        const verifiedFlag = field === "email" ? profile.emailVerified : profile.phoneVerified;
        badge.hidden = !(value && verifiedFlag);
      } else {
        view.textContent = value || `Add your ${field === "fullName" ? "full name" : field}`;
      }

      row.classList.toggle("empty", !value);
    });

    renderOrders();
  }

  function renderOrders() {
    const orders = loadOrders();
    const list = document.getElementById("ordersList");

    if (!orders.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="icon-badge">
            <svg width="22" height="22" viewBox="0 0 19 19" fill="none"><path d="M4.5 6.5h10l-.7 9.2a1.4 1.4 0 0 1-1.4 1.3H6.6a1.4 1.4 0 0 1-1.4-1.3L4.5 6.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 6.5V5a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </span>
          <h5>No orders yet</h5>
          <p>Once you place an order, it'll show up here with live status and delivery updates.</p>
          <a href="index.html#order" class="btn btn-solid btn-sm">Shop KordiSure</a>
        </div>`;
      return;
    }

    list.innerHTML = orders.slice(0, 5).map(order => `
      <div class="order-row">
        <div class="order-thumb">
          <img src="${order.image}" alt="${order.name}">
        </div>
        <div class="order-info">
          <h5>${order.name}</h5>
          <p>Order ID: #${order.id}</p>
          <p>${formatDate(order.date)}</p>
        </div>
        <span class="status-pill">${order.status}</span>
        <span class="order-price">₹${Number(order.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        <svg class="order-chevron" width="18" height="18" viewBox="0 0 19 19" fill="none"><path d="M7 4l6 5.5L7 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `).join("");
  }

  /* ---------- edit mode ---------- */

  function setEditMode(on) {
    document.getElementById("infoRows").querySelectorAll(".info-row").forEach(row => {
      row.querySelector("[data-view]").hidden = on;
      row.querySelector(".info-input").hidden = !on;
    });
    document.getElementById("editProfileBtn").hidden = on;
    document.getElementById("cancelProfileBtn").hidden = !on;
    document.getElementById("saveProfileBtn").hidden = !on;
  }

  function initEditing() {
    const form = document.getElementById("profileForm");

    document.getElementById("editProfileBtn").addEventListener("click", () => setEditMode(true));

    document.getElementById("cancelProfileBtn").addEventListener("click", () => {
      render(); // discard any unsaved changes
      setEditMode(false);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const profile = loadProfile() || {};
      FIELDS.forEach(field => {
        const input = document.getElementById("in-" + field);
        profile[field] = input.value.trim();
      });
      // editing email/phone clears their verified state until re-verified
      const prev = loadProfile() || {};
      profile.emailVerified = prev.email === profile.email ? !!prev.emailVerified : false;
      profile.phoneVerified = prev.phone === profile.phone ? !!prev.phoneVerified : false;
      if (!profile.memberSince) profile.memberSince = new Date().toISOString();

      saveProfile(profile);
      render();
      setEditMode(false);
    });
  }

  /* ---------- avatar upload ---------- */

  function initAvatar() {
    const btn = document.getElementById("avatarEditBtn");
    const input = document.getElementById("avatarFileInput");

    btn.addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const profile = loadProfile() || {};
        profile.avatar = reader.result;
        saveProfile(profile);
        render();
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initEditing();
    initAvatar();
    render();
  });
})();
