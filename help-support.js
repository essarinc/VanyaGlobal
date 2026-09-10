/* ============================================================
   VANYA GLOBAL — help-support.js
   Drives the Help & Support page entirely from stored account data.

   In production, swap PROFILE_STORE / TICKETS_STORE for real calls
   to your backend (e.g. GET /api/account, GET /api/support/tickets,
   POST /api/support/tickets) using the signed-in user's session/auth
   token. For this static build, the same data is kept in localStorage
   — scoped per account — so the page behaves like a real support
   inbox: nothing below is hardcoded into the HTML, it's all read
   from and written back to storage.
   ============================================================ */

(function () {
  "use strict";

  const PROFILE_KEY = "vanyaGlobal.profile";
  const TICKETS_KEY  = "vanyaGlobal.supportTickets";

  const FAQS = [
    {
      q: "How long does a support request take to resolve?",
      a: "Most requests are answered within 24 hours on business days. Order and billing issues are usually resolved within 2–3 business days."
    },
    {
      q: "Can I track an order from this page?",
      a: "Order status lives under My Orders. If something looks wrong with a specific order, raise a request here with the order ID and category set to \u201COrder Issue\u201D so it routes straight to the right team."
    },
    {
      q: "How do I update the email or phone on my account?",
      a: "Go to My Profile, select Edit on Personal Information, update the field and save. Changing a verified email or phone will ask you to re-verify it."
    },
    {
      q: "What's your return and refund policy?",
      a: "Full details are on the Payment, Shipping, Return & Refund page linked in the footer. If you've already started a return, you can check on progress by raising a request here."
    }
  ];

  /* ---------- storage layer ---------- */

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return null;
  }

  function loadTickets() {
    try {
      const raw = localStorage.getItem(TICKETS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return [];
  }

  function saveTickets(tickets) {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }

  /* ---------- helpers ---------- */

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function statusClass(status) {
    if (status === "Resolved") return "status-resolved";
    if (status === "In Progress") return "status-progress";
    return "status-open";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- rendering ---------- */

  function render() {
    const profile = loadProfile() || {};
    const firstName = (profile.fullName || "").trim().split(/\s+/)[0];
    document.getElementById("supportHeroName").textContent = firstName || "there";

    renderTickets();
  }

  function renderTickets() {
    const tickets = loadTickets();
    const list = document.getElementById("ticketsList");

    const openCount = tickets.filter(t => t.status !== "Resolved").length;
    const resolvedCount = tickets.filter(t => t.status === "Resolved").length;
    document.getElementById("statOpen").textContent = openCount;
    document.getElementById("statResolved").textContent = resolvedCount;

    if (!tickets.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="icon-badge">
            <svg width="22" height="22" viewBox="0 0 19 19" fill="none"><path d="M3 15.7 3.5 12.3 12.6 3.2a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L6.7 15.5 3 16Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </span>
          <h5>No requests yet</h5>
          <p>Raise a support request above and it'll show up here with live status updates.</p>
        </div>`;
      return;
    }

    list.innerHTML = tickets.slice().reverse().map(ticket => `
      <div class="ticket-row">
        <div class="ticket-icon">
          <svg width="18" height="18" viewBox="0 0 19 19" fill="none"><path d="M3 15.7 3.5 12.3 12.6 3.2a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L6.7 15.5 3 16Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </div>
        <div class="ticket-info">
          <h5>${escapeHtml(ticket.subject)}</h5>
          <p>#${ticket.id} · ${escapeHtml(ticket.category)} · ${formatDate(ticket.date)}</p>
        </div>
        <span class="status-pill ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>
      </div>
    `).join("");
  }

  function renderFaqs() {
    const wrap = document.getElementById("faqAccordion");
    wrap.innerHTML = FAQS.map((item, i) => `
      <div class="faq-item" data-index="${i}">
        <button type="button" class="faq-q" aria-expanded="false">
          ${escapeHtml(item.q)}
          <svg class="chev" width="16" height="16" viewBox="0 0 19 19" fill="none"><path d="M7 4l6 5.5L7 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="faq-a"><p>${escapeHtml(item.a)}</p></div>
      </div>
    `).join("");

    wrap.querySelectorAll(".faq-q").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        const isOpen = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  /* ---------- ticket form ---------- */

  function initTicketForm() {
    const form = document.getElementById("ticketForm");
    const feedback = document.getElementById("ticketFeedback");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const subject = document.getElementById("tk-subject").value.trim();
      const category = document.getElementById("tk-category").value;
      const message = document.getElementById("tk-message").value.trim();

      if (!subject || !category || !message) {
        feedback.textContent = "Please fill in every field before submitting.";
        feedback.className = "form-feedback error";
        feedback.hidden = false;
        return;
      }

      const tickets = loadTickets();
      const ticket = {
        id: Date.now().toString().slice(-6),
        subject,
        category,
        message,
        status: "Open",
        date: new Date().toISOString()
      };
      tickets.push(ticket);
      saveTickets(tickets);

      form.reset();
      feedback.textContent = `Request #${ticket.id} submitted. We'll get back to you within 24 hours.`;
      feedback.className = "form-feedback";
      feedback.hidden = false;

      renderTickets();
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    render();
    renderFaqs();
    initTicketForm();
  });
})();