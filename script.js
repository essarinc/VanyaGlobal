document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------------
     Helper: close any open dropdown/menu by removing 'open' + resetting
     aria-expanded on its toggle
  --------------------------------------------------------------- */
  function closeAll(except) {
    document.querySelectorAll('.mega-menu.open, .account-menu.open').forEach(el => {
      if (el === except) return;
      el.classList.remove('open');
      const btn = document.querySelector(`[aria-controls="${el.id}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------------------------------------------------------------
     Search bar toggle
  --------------------------------------------------------------- */

  /* ---------------------------------------------------------------
     KordiSure mega-menu (desktop dropdown)
  --------------------------------------------------------------- */
  const kordisureToggle = document.getElementById('kordisureToggle');
  const kordisureMenu = document.getElementById('kordisureMenu');
  kordisureToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = kordisureMenu.classList.contains('open');
    closeAll();
    kordisureMenu.classList.toggle('open', !isOpen);
    kordisureToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  /* ---------------------------------------------------------------
     Account dropdown
  --------------------------------------------------------------- */
  const accountToggle = document.getElementById('accountToggle');
  const accountMenu = document.getElementById('accountMenu');
  accountToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = accountMenu.classList.contains('open');
    closeAll();
    accountMenu.classList.toggle('open', !isOpen);
    accountToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  /* Close dropdowns on outside click / Escape */
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
  // prevent clicks inside menus from bubbling to the document closer
  [kordisureMenu, accountMenu].forEach(menu => {
    menu.addEventListener('click', (e) => e.stopPropagation());
  });

  /* ---------------------------------------------------------------
     Mobile slide-out nav
  --------------------------------------------------------------- */
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileScrim = document.getElementById('mobileScrim');
  const mobileNavClose = document.getElementById('mobileNavClose');

  function openMobileNav() {
    mobileNav.classList.add('open');
    mobileScrim.classList.add('open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    mobileNav.classList.remove('open');
    mobileScrim.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  hamburgerBtn.addEventListener('click', openMobileNav);
  mobileNavClose.addEventListener('click', closeMobileNav);
  mobileScrim.addEventListener('click', closeMobileNav);

  /* Nested accordion toggles inside mobile nav (KordiSure / Ingredients) */
  document.querySelectorAll('.mobile-sub-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.nextElementSibling;
      const isOpen = list.classList.contains('open');
      list.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* Collapse mobile nav automatically if resized up to desktop */
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) closeMobileNav();
  });

  /* ---------------------------------------------------------------
     Generic carousel controller: syncs dots + arrow buttons to a
     horizontally scrolling track using scroll-snap.
  --------------------------------------------------------------- */
  function initCarousel({ trackId, dotsId, prevId, nextId }) {
    const track = document.getElementById(trackId);
    if (!track) return;
    const dotsWrap = dotsId ? document.getElementById(dotsId) : null;
    const cards = Array.from(track.children);

    // Build dots
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          cards[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        });
        dotsWrap.appendChild(dot);
      });
    }

    function updateActiveDot() {
      if (!dotsWrap) return;
      const trackRect = track.getBoundingClientRect();
      let closestIdx = 0;
      let closestDist = Infinity;
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const dist = Math.abs(rect.left - trackRect.left);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      dotsWrap.querySelectorAll('button').forEach((d, i) => {
        d.classList.toggle('active', i === closestIdx);
      });
    }

    let scrollTimeout;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActiveDot, 80);
    }, { passive: true });

    // Arrow buttons (desktop)
    const prevBtn = prevId ? document.getElementById(prevId) : null;
    const nextBtn = nextId ? document.getElementById(nextId) : null;
    function scrollByCard(dir) {
      const cardWidth = cards[0].getBoundingClientRect().width + 16; // + gap
      track.scrollBy({ left: dir * cardWidth, behavior: 'smooth' });
    }
    if (prevBtn) prevBtn.addEventListener('click', () => scrollByCard(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollByCard(1));

    updateActiveDot();
  }

  initCarousel({ trackId: 'testiTrack', dotsId: 'testiDots' });

  /* ---------------------------------------------------------------
     Sticky header shadow on scroll
  --------------------------------------------------------------- */
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 4 ? '0 4px 16px rgba(0,0,0,.06)' : 'none';
  }, { passive: true });

  /* ==================================================================
     AUTH UI — reflects VanyaAuth session state across header, account
     dropdown, and mobile nav. See auth.js for the actual session logic.
     ================================================================== */
  function refreshAuthUI() {
    const auth = window.VanyaAuth;
    const loggedIn = auth ? auth.isLoggedIn() : false;
    const session = auth ? auth.getSession() : null;

    document.querySelectorAll('[data-auth="out"]').forEach(el => { el.hidden = loggedIn; });
    document.querySelectorAll('[data-auth="in"]').forEach(el => { el.hidden = !loggedIn; });

    const nameEl = document.getElementById('accountMenuName');
    if (nameEl) {
      // textContent only — never innerHTML — so a stored name/email can
      // never execute as markup (see LOG-F-084 – LOG-F-090).
      nameEl.textContent = loggedIn && session
        ? `Signed in as ${session.name}`
        : '';
    }
  }

  function handleLogoutClick(e) {
    e.preventDefault();
    if (!window.VanyaAuth) return;
    closeAll();
    closeMobileNav();
    window.VanyaAuth.logout({ button: e.currentTarget });
  }

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', handleLogoutClick);
    // Buttons already fire click on both Enter and Space natively, so no
    // extra keydown wiring is needed here (unlike the old <a href="#logout">).
  });

  document.addEventListener('vanya:authchange', refreshAuthUI);
  window.addEventListener('pageshow', refreshAuthUI); // covers bfcache restores via Back/Forward
  refreshAuthUI();

});
