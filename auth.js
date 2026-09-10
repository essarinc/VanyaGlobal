/* ==========================================================================
   VANYA GLOBAL — client-side auth/session helper (frontend prototype)
   --------------------------------------------------------------------------
   WHAT THIS IS: a small helper so the UI (menus, protected pages) can react
   to "does the browser think the user is logged in".

   WHAT THIS IS NOT: a security boundary. Anyone can open DevTools and set
   isLoggedIn = true here — that must NEVER be enough to reach real data.
   The Java backend has to independently verify every request using its own
   session (e.g. an HttpOnly cookie) and reject anything unauthenticated,
   regardless of what this script says or whether it's been tampered with,
   disabled, or deleted entirely. See LOG-F-074 through LOG-F-083.
   ========================================================================== */
(function (global) {
  'use strict';

  var AUTH_KEY = 'vanya_auth';          // localStorage key: { loggedIn, name, email, ts }
  var RETURN_PARAM = 'returnTo';
  var DEFAULT_REDIRECT = 'index.html';
  var LOGIN_PAGE = 'login.html';
  var PROTECTED_PAGES = ['profile.html', 'orders.html', 'order-history.html', 'addresses.html'];

  var isLoggingOut = false;

  function safeParseSession(raw) {
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.loggedIn === true) return data;
    } catch (e) {
      // malformed/tampered value — treat as logged out rather than throwing
    }
    return null;
  }

  function getSession() {
    try { return safeParseSession(localStorage.getItem(AUTH_KEY)); }
    catch (e) { return null; } // storage unavailable (private mode, quota, etc.)
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function notify(loggedIn) {
    document.dispatchEvent(new CustomEvent('vanya:authchange', { detail: { loggedIn: loggedIn } }));
  }

  // Demo-only "login" — in production this only happens after the backend
  // confirms credentials and sets its own session cookie.
  function setSession(user) {
    var safeUser = {
      loggedIn: true,
      name: (user && String(user.name || '').trim().slice(0, 80)) || 'Member',
      email: (user && String(user.email || '').trim().slice(0, 120)) || '',
      ts: Date.now()
    };
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser)); } catch (e) {}
    notify(true);
    return safeUser;
  }

  function clearClientState() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    // Only clear a client-readable UI hint cookie, never assume we can (or
    // should) reach into HttpOnly cookies — those are the server's job.
    try { document.cookie = 'vanya_ui_hint=; Max-Age=0; path=/; SameSite=Lax'; } catch (e) {}
  }

  // Only ever allow same-site, relative, known .html redirect targets.
  // Rejects absolute URLs, protocol-relative "//host" URLs, backslash
  // tricks, and any scheme (including javascript:).
  function sanitizeRedirect(target) {
    if (!target || typeof target !== 'string') return DEFAULT_REDIRECT;
    var t = target.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return DEFAULT_REDIRECT;
    if (t.indexOf('//') === 0 || t.indexOf('\\\\') === 0) return DEFAULT_REDIRECT;
    t = t.replace(/^\/+/, '');
    var isKnownHtml = /^[a-z0-9_-]+\.html(#[a-z0-9_-]*)?$/i.test(t);
    return isKnownHtml ? t : DEFAULT_REDIRECT;
  }

  function login(user, redirectTo) {
    setSession(user);
    global.location.href = sanitizeRedirect(redirectTo);
  }

  // Call at the very top of a protected page to bounce logged-out visitors
  // to login before any protected content is meaningfully usable.
  function guardProtectedPage() {
    var page = (global.location.pathname.split('/').pop() || '').toLowerCase();
    if (PROTECTED_PAGES.indexOf(page) === -1) return true;
    if (!isLoggedIn()) {
      global.location.replace(LOGIN_PAGE + '?' + RETURN_PARAM + '=' + encodeURIComponent(page));
      return false;
    }
    return true;
  }

  function logout(opts) {
    opts = opts || {};
    if (isLoggingOut) return Promise.resolve(); // rapid double-click / repeat Enter guard

    isLoggingOut = true;
    var btn = opts.button || null;
    var originalLabel = btn ? btn.textContent : null;
    if (btn) {
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.textContent = 'Logging out…';
    }

    function finish() {
      clearClientState();
      notify(false);
      isLoggingOut = false;
      if (btn) {
        btn.removeAttribute('aria-busy');
        btn.disabled = false;
        btn.style.pointerEvents = '';
        if (originalLabel) btn.textContent = originalLabel;
      }
      global.location.href = sanitizeRedirect(opts.redirectTo || DEFAULT_REDIRECT);
    }

    // This prototype has no live backend, so /api/logout will normally fail
    // to resolve (network error / 404) — that's expected here and handled
    // safely below via .catch(). In production this request must reach the
    // real backend, which is what actually invalidates the server session;
    // the client-side clearing below is only ever a UI convenience.
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 6000);

    return fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      signal: controller ? controller.signal : undefined
    })
      .catch(function () { /* offline / timeout / 5xx / malformed — fall through safely */ })
      .then(function () {
        clearTimeout(timer);
        finish();
      });
  }

  // localStorage changes fire a native 'storage' event in *other* open tabs
  // automatically — this is what keeps Tab B in sync when Tab A logs out.
  global.addEventListener('storage', function (e) {
    if (e.key !== AUTH_KEY) return;
    notify(isLoggedIn());
  });

  // Re-run the protected-page guard on every 'pageshow', not just on first
  // load. This is what stops a logged-out visitor from landing back on a
  // protected page's cached DOM via the Back/Forward button (bfcache) —
  // bfcache restores don't re-run page <script>s, but they DO re-fire
  // pageshow, and isLoggedIn() always re-reads localStorage rather than a
  // stale in-memory flag, so this catches it either way.
  global.addEventListener('pageshow', function () {
    guardProtectedPage();
  });

  global.VanyaAuth = {
    isLoggedIn: isLoggedIn,
    getSession: getSession,
    login: login,
    logout: logout,
    guardProtectedPage: guardProtectedPage,
    sanitizeRedirect: sanitizeRedirect
  };
})(window);