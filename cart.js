document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'vanyaCart';

  /* ---------------------------------------------------------------
     Demo catalog for the "You May Also Like" strip. In production
     this would come from the product API; ids must stay unique.
  --------------------------------------------------------------- */
  const CATALOG = [
    { id: 'kordisure-30', name: 'KordiSure — 30 Capsules', price: 899, image: 'https://picsum.photos/seed/kordisure-bottle-30/400/300' },
    { id: 'kordisure-90', name: 'KordiSure — 90 Capsules (3-Month Pack)', price: 2399, image: 'https://picsum.photos/seed/kordisure-bottle-90/400/300' },
    { id: 'kordisure-gift', name: 'KordiSure Family Gift Set', price: 1799, image: 'https://picsum.photos/seed/kordisure-gift-set/400/300' },
    { id: 'kordisure-refill', name: 'KordiSure Travel Refill Pack', price: 549, image: 'https://picsum.photos/seed/kordisure-refill-pack/400/300' }
  ];

  const cartRoot = document.getElementById('cartRoot');
  const layoutTpl = document.getElementById('cartLayoutTemplate');
  const itemTpl = document.getElementById('cartItemTemplate');
  const emptyTpl = document.getElementById('cartEmptyTemplate');
  const suggestionsGrid = document.getElementById('suggestionsGrid');
  const suggestionTpl = document.getElementById('suggestionCardTemplate');

  /* ---------------------------------------------------------------
     Storage helpers — never let bad/corrupted localStorage data
     crash the page (CART-JS-25 / CART-NEG-07).
  --------------------------------------------------------------- */
  function loadCart() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidItem).map(normalizeItem);
    } catch (err) {
      return [];
    }
  }

  function isValidItem(item) {
    return item && typeof item === 'object'
      && typeof item.id === 'string' && item.id.length > 0
      && typeof item.name === 'string' && item.name.length > 0
      && Number.isFinite(Number(item.price)) && Number(item.price) >= 0;
  }

  function normalizeItem(item) {
    const qty = Math.max(1, Math.floor(Number(item.qty)) || 1);
    return {
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image: typeof item.image === 'string' ? item.image : '',
      qty
    };
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage unavailable/full — fail silently, keep working in-memory */
    }
  }

  let cart = loadCart();

  /* ---------------------------------------------------------------
     Formatting
  --------------------------------------------------------------- */
  function formatPrice(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /* ---------------------------------------------------------------
     Mutations
  --------------------------------------------------------------- */
  function addToCart(product, qty) {
    qty = Math.max(1, Math.floor(Number(qty)) || 1);
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty });
    }
    persistAndRender();
  }

  function setQty(id, qty) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    qty = Math.floor(Number(qty));
    if (!Number.isFinite(qty) || qty < 1) qty = 1; // reject invalid/negative/zero (CART-JS-10, CART-NEG-03/04)
    item.qty = Math.min(qty, 999); // guard against extreme values (CART-NEG-05)
    persistAndRender();
  }

  function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    persistAndRender();
  }

  function persistAndRender() {
    saveCart(cart);
    render();
  }

  /* ---------------------------------------------------------------
     Rendering
  --------------------------------------------------------------- */
  function totals() {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
    return { subtotal, itemCount };
  }

  function updateBadge() {
    const { itemCount } = totals();
    document.querySelectorAll('.cart-badge').forEach(el => { el.textContent = String(itemCount); });
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.setAttribute('aria-label', `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`);
  }

  function render() {
    updateBadge();
    cartRoot.innerHTML = '';

    if (cart.length === 0) {
      cartRoot.appendChild(emptyTpl.content.cloneNode(true));
      return;
    }

    const layout = layoutTpl.content.cloneNode(true);
    const itemsWrap = layout.querySelector('#cartItems');

    cart.forEach(item => {
      const node = itemTpl.content.cloneNode(true);
      const article = node.querySelector('.cart-item');
      article.dataset.id = item.id;

      const img = node.querySelector('.cart-item-img');
      img.src = item.image || 'https://picsum.photos/seed/kordisure-placeholder/200/200';
      img.alt = item.name;

      node.querySelector('.cart-item-name').textContent = item.name;
      node.querySelector('.cart-item-price').textContent = formatPrice(item.price) + ' each';
      node.querySelector('.cart-item-total').textContent = formatPrice(item.price * item.qty);

      const qtyInput = node.querySelector('.qty-input');
      qtyInput.value = item.qty;
      qtyInput.setAttribute('aria-label', `Quantity for ${item.name}`);

      node.querySelector('.qty-decrease').addEventListener('click', () => {
        if (item.qty <= 1) return; // stays at 1; use Remove to clear (CART-JS-09)
        setQty(item.id, item.qty - 1);
      });
      node.querySelector('.qty-increase').addEventListener('click', () => {
        setQty(item.id, item.qty + 1);
      });
      qtyInput.addEventListener('change', () => {
        setQty(item.id, qtyInput.value);
      });
      node.querySelector('.remove-btn').addEventListener('click', () => {
        removeFromCart(item.id);
      });

      itemsWrap.appendChild(node);
    });

    const { subtotal } = totals();
    layout.querySelector('#summarySubtotal').textContent = formatPrice(subtotal);
    layout.querySelector('#summaryTotal').textContent = formatPrice(subtotal);

    const checkoutBtn = layout.querySelector('#checkoutBtn');
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'orders.html';
    });

    cartRoot.appendChild(layout);
  }

  /* ---------------------------------------------------------------
     Suggested products — Add to Cart
  --------------------------------------------------------------- */
  function renderSuggestions() {
    CATALOG.forEach(product => {
      const node = suggestionTpl.content.cloneNode(true);
      node.querySelector('.suggestion-img').src = product.image;
      node.querySelector('.suggestion-img').alt = product.name;
      node.querySelector('.suggestion-name').textContent = product.name;
      node.querySelector('.suggestion-price').textContent = formatPrice(product.price);

      const btn = node.querySelector('.add-to-cart-btn');
      let busy = false;
      btn.addEventListener('click', () => {
        if (busy) return; // guards rapid repeat clicks (CART-NEG-01/02)
        busy = true;
        addToCart(product, 1);
        const original = btn.textContent;
        btn.textContent = 'Added ✓';
        setTimeout(() => { btn.textContent = original; busy = false; }, 900);
      });

      suggestionsGrid.appendChild(node);
    });
  }

  /* ---------------------------------------------------------------
     Keep cart in sync across tabs (CART-JS-22)
  --------------------------------------------------------------- */
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cart = loadCart();
      render();
    }
  });

  renderSuggestions();
  render();
});