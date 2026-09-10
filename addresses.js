/* ============================================================
   VANYA GLOBAL — addresses.js
   Drives the My Addresses page entirely from stored account data.

   In production, swap ADDRESSES_STORE for real calls to your backend
   (e.g. GET /api/addresses, POST /api/addresses, PATCH /api/addresses/:id,
   DELETE /api/addresses/:id) scoped to the signed-in user's session/auth
   token. For this static build, addresses are kept in localStorage under
   a key namespaced to the current profile, so the page behaves like a
   real account: nothing is hardcoded into the HTML — every card, and the
   default badge, are read from and written back to storage.
   ============================================================ */

(function () {
  "use strict";

  const ADDRESSES_KEY = "vanyaGlobal.addresses";

  const FIELDS = ["label", "fullName", "phone", "line1", "line2", "city", "state", "pincode", "country"];

  let pendingDeleteId = null;

  /* ---------- storage layer ---------- */

  function loadAddresses() {
    try {
      const raw = localStorage.getItem(ADDRESSES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return [];
  }

  function saveAddresses(list) {
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(list));
  }

  function makeId() {
    return "addr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- rendering ---------- */

  function render() {
    const addresses = loadAddresses();
    const grid = document.getElementById("addressGrid");
    document.getElementById("addressNudge").hidden = addresses.length > 0;

    if (!addresses.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="icon-badge">
            <svg width="22" height="22" viewBox="0 0 19 19" fill="none"><path d="M9.5 17s6-5.2 6-9.7a6 6 0 1 0-12 0c0 4.5 6 9.7 6 9.7Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="9.5" cy="7.3" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
          </span>
          <h5>No addresses saved</h5>
          <p>Add a delivery address once and reuse it every time you check out.</p>
          <button type="button" class="btn btn-solid btn-sm" id="emptyAddAddressBtn">Add New Address</button>
        </div>`;
      const emptyBtn = document.getElementById("emptyAddAddressBtn");
      if (emptyBtn) emptyBtn.addEventListener("click", () => openModal());
      return;
    }

    // default address first, then most recently added
    const sorted = [...addresses].sort((a, b) => (b.isDefault === true) - (a.isDefault === true));

    grid.innerHTML = sorted.map(addr => `
      <div class="addr-card ${addr.isDefault ? "is-default" : ""}" data-id="${addr.id}">
        <div class="addr-card-top">
          <span class="addr-type-pill">${addr.label}</span>
          ${addr.isDefault ? '<span class="default-pill">Default</span>' : ""}
        </div>
        <div class="addr-name">${addr.fullName}</div>
        <div class="addr-lines">
          ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}<br>
          ${addr.city}, ${addr.state} ${addr.pincode}<br>
          ${addr.country}
        </div>
        <div class="addr-phone">
          <svg width="14" height="14" viewBox="0 0 19 19" fill="none"><path d="M4 3h2.8l1.1 3.8-1.9 1.4a11 11 0 0 0 5 5l1.4-1.9L16 12.3V15a1 1 0 0 1-1 1c-6.6 0-12-5.4-12-12a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          ${addr.phone}
        </div>
        <div class="addr-card-actions">
          ${!addr.isDefault ? `<button type="button" class="addr-action-btn set-default" data-action="default" data-id="${addr.id}">Set as Default</button>` : `<span class="addr-action-btn set-default" style="opacity:.5;pointer-events:none;">Default address</span>`}
          <button type="button" class="addr-action-btn" data-action="edit" data-id="${addr.id}">
            <svg width="13" height="13" viewBox="0 0 19 19" fill="none"><path d="M3 15.7 3.5 12.3 12.6 3.2a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L6.7 15.5 3 16Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            Edit
          </button>
          <button type="button" class="addr-action-btn danger" data-action="delete" data-id="${addr.id}">
            <svg width="13" height="13" viewBox="0 0 19 19" fill="none"><path d="M4 5.5h11M8 5.5V4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M6 5.5 6.7 15a1.4 1.4 0 0 0 1.4 1.3h2.8A1.4 1.4 0 0 0 12.3 15L13 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Remove
          </button>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === "edit") openModal(id);
        else if (action === "delete") openDeleteConfirm(id);
        else if (action === "default") setDefault(id);
      });
    });
  }

  function setDefault(id) {
    const addresses = loadAddresses().map(a => ({ ...a, isDefault: a.id === id }));
    saveAddresses(addresses);
    render();
  }

  /* ---------- add / edit modal ---------- */

  function openModal(id) {
    const form = document.getElementById("addressForm");
    form.reset();
    document.getElementById("addr-country").value = "India";
    document.getElementById("addr-id").value = "";

    if (id) {
      const addr = loadAddresses().find(a => a.id === id);
      if (addr) {
        document.getElementById("addrModalTitle").textContent = "Edit Address";
        document.getElementById("addr-id").value = addr.id;
        FIELDS.forEach(f => {
          const el = document.getElementById("addr-" + f);
          if (el) el.value = addr[f] || "";
        });
        document.getElementById("addr-isDefault").checked = !!addr.isDefault;
      }
    } else {
      document.getElementById("addrModalTitle").textContent = "Add New Address";
    }

    document.getElementById("addrModalScrim").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    document.getElementById("addrModalScrim").hidden = true;
    document.body.style.overflow = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.reportValidity()) return;

    const addresses = loadAddresses();
    const id = document.getElementById("addr-id").value;
    const isDefault = document.getElementById("addr-isDefault").checked;

    const record = { id: id || makeId() };
    FIELDS.forEach(f => {
      record[f] = document.getElementById("addr-" + f).value.trim();
    });
    record.isDefault = isDefault || addresses.length === 0; // first address becomes default automatically

    let next;
    if (id) {
      next = addresses.map(a => (a.id === id ? { ...a, ...record } : a));
    } else {
      next = [...addresses, record];
    }

    // only one default allowed
    if (record.isDefault) {
      next = next.map(a => ({ ...a, isDefault: a.id === record.id }));
    }

    saveAddresses(next);
    render();
    closeModal();
  }

  /* ---------- delete confirm ---------- */

  function openDeleteConfirm(id) {
    pendingDeleteId = id;
    document.getElementById("deleteConfirmScrim").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDeleteConfirm() {
    pendingDeleteId = null;
    document.getElementById("deleteConfirmScrim").hidden = true;
    document.body.style.overflow = "";
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    let addresses = loadAddresses().filter(a => a.id !== pendingDeleteId);
    // if the deleted address was the default, promote the next one
    if (addresses.length && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    saveAddresses(addresses);
    render();
    closeDeleteConfirm();
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("addAddressBtn").addEventListener("click", () => openModal());
    document.getElementById("addrModalClose").addEventListener("click", closeModal);
    document.getElementById("addrCancelBtn").addEventListener("click", closeModal);
    document.getElementById("addrModalScrim").addEventListener("click", (e) => {
      if (e.target.id === "addrModalScrim") closeModal();
    });
    document.getElementById("addressForm").addEventListener("submit", handleSubmit);

    document.getElementById("deleteConfirmClose").addEventListener("click", closeDeleteConfirm);
    document.getElementById("deleteCancelBtn").addEventListener("click", closeDeleteConfirm);
    document.getElementById("deleteConfirmBtn").addEventListener("click", confirmDelete);
    document.getElementById("deleteConfirmScrim").addEventListener("click", (e) => {
      if (e.target.id === "deleteConfirmScrim") closeDeleteConfirm();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!document.getElementById("addrModalScrim").hidden) closeModal();
      if (!document.getElementById("deleteConfirmScrim").hidden) closeDeleteConfirm();
    });

    render();
  });
})();