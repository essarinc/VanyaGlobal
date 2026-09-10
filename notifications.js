/* ============================================================
   VANYA GLOBAL — notifications.js
   Drives the Notifications page entirely from stored account data.

   In production, swap PREFS_STORE / HISTORY_STORE for real calls
   to your backend (e.g. GET /api/notifications/preferences,
   PATCH /api/notifications/preferences, GET /api/notifications)
   scoped to the signed-in user's session/auth token. For this
   static build, the same data is kept in localStorage so each
   visitor's choices persist for them, exactly like My Profile.
   ============================================================ */

(function () {
  "use strict";

  const PROFILE_KEY = "vanyaGlobal.profile";          // shared with profile.js, read-only here
  const PREFS_KEY    = "vanyaGlobal.notificationPrefs";
  const HISTORY_KEY  = "vanyaGlobal.notificationHistory";

  // sensible defaults for a brand-new account
  const DEFAULT_PREFS = {
    channelEmail: true,
    channelSms: false,
    channelPush: false,
    orderUpdates: true,
    restockAlerts: false,
    offersPromos: false,
    wellnessTips: false,
    accountSecurity: true
  };

  const PREF_KEYS = Object.keys(DEFAULT_PREFS);

  /* ---------- storage layer ---------- */

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return null;
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) return Object.assign({}, DEFAULT_PREFS, JSON.parse(raw));
    } catch (e) { /* ignore corrupt data */ }
    return Object.assign({}, DEFAULT_PREFS);
  }

  function savePrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return [];
  }

  function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  /* ---------- helpers ---------- */

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  let toastTimer = null;
  function showToast() {
    const toast = document.getElementById("saveToast");
    toast.hidden = false;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { toast.hidden = true; }, 200);
    }, 1800);
  }

  /* ---------- rendering ---------- */

  function render() {
    const profile = loadProfile() || {};
    const prefs = loadPrefs();

    // contextual notes so the channel rows reflect the account on file
    const emailNote = document.getElementById("channelEmailNote");
    emailNote.textContent = profile.email
      ? "Sent to " + profile.email
      : "Add an email on your profile to enable this";

    const smsNote = document.getElementById("channelSmsNote");
    smsNote.textContent = profile.phone
      ? "Sent to " + profile.phone
      : "Add a phone number on your profile to enable this";

    PREF_KEYS.forEach(key => {
      const input = document.getElementById("pref-" + key);
      if (input) input.checked = !!prefs[key];
    });

    // channels with no contact detail on file can't actually be enabled
    document.getElementById("pref-channelEmail").disabled = !profile.email;
    document.getElementById("pref-channelSms").disabled = !profile.phone;

    renderHistory();
  }

  function renderHistory() {
    const items = loadHistory();
    const list = document.getElementById("historyList");
    const clearBtn = document.getElementById("clearHistoryBtn");

    clearBtn.hidden = items.length === 0;

    if (!items.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="icon-badge">
            <svg width="22" height="22" viewBox="0 0 19 19" fill="none"><circle cx="9.5" cy="9.5" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M9.5 5.5v4.3l3 1.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <h5>Nothing here yet</h5>
          <p>Order updates, restock alerts and offers you receive will show up here.</p>
        </div>`;
      return;
    }

    const typeMeta = {
      order: { label: "Order", icon: "📦" },
      restock: { label: "Restock", icon: "🌿" },
      offer: { label: "Offer", icon: "🏷️" },
      wellness: { label: "Wellness", icon: "📰" },
      security: { label: "Security", icon: "🔒" }
    };

    list.innerHTML = items.slice(0, 10).map(item => {
      const meta = typeMeta[item.type] || { label: "Update", icon: "🔔" };
      return `
        <div class="history-row${item.read ? "" : " unread"}">
          <span class="history-icon" aria-hidden="true">${meta.icon}</span>
          <div class="history-info">
            <h5>${item.title}</h5>
            <p>${item.body || ""}</p>
            <p class="history-time">${formatDate(item.date)}</p>
          </div>
          <span class="history-tag">${meta.label}</span>
        </div>`;
    }).join("");
  }

  /* ---------- preference toggles ---------- */

  function initToggles() {
    PREF_KEYS.forEach(key => {
      const input = document.getElementById("pref-" + key);
      if (!input) return;
      input.addEventListener("change", () => {
        const prefs = loadPrefs();
        prefs[key] = input.checked;
        savePrefs(prefs);
        showToast();
      });
    });
  }

  function initHistoryActions() {
    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
      saveHistory([]);
      renderHistory();
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initToggles();
    initHistoryActions();
    render();
  });
})();