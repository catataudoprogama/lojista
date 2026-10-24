/* Lume Moda — vitrine, página da peça, sacola e pedido por WhatsApp. */
(function () {
  'use strict';

  var D = window.Data;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = D.esc, fmt = D.fmt;

  /* Textos do FAQ: adapte às regras reais da loja. */
  var FAQ = [
    ['Como faço um pedido?', 'Escolha as peças, monte a sacola e toque em Finalizar no WhatsApp. A mensagem já vai escrita para a loja, e o pagamento e a entrega são combinados na conversa.'],
    ['Como posso pagar?', 'Pix, cartão ou dinheiro. A forma de pagamento você escolhe na sacola e confirma com a loja no WhatsApp.'],
    ['Posso retirar na loja?', 'Pode. Na sacola, escolha Retirar na loja e combinamos o horário pelo WhatsApp.'],
    ['E se o tamanho não servir?', 'Chame a gente no WhatsApp para combinar a troca.'],
    ['Os tamanhos e o estoque estão atualizados?', 'A própria loja atualiza as peças e os tamanhos disponíveis. O que está esgotado aparece marcado.']
  ];

  var KEY = { cart: 'lume_cart_v1', favs: 'lume_favs_v1', co: 'lume_checkout_v1' };
  var ls = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var S = {
    products: [], cats: [], settings: D.normSettings(),
    f: { cat: '', size: '', sort: 'new', q: '', favs: false },
    cart: [], favs: [], co: { entrega: 'retirada', bairro: '', pagto: 'Pix', nome: '' },
    pdp: null, sheet: null
  };

  /* --------------------------------------------------------------- utilidades */
  function track(name, p) {
    p = p || {};
    try { if (window.dataLayer) window.dataLayer.push(Object.assign({ event: name }, p)); } catch (e) { /* ignore */ }
    try { if (window.gtag) window.gtag('event', name, p); } catch (e) { /* ignore */ }
    try {
      var m = { add_to_cart: 'AddToCart', view_item: 'ViewContent', begin_checkout: 'InitiateCheckout', whatsapp_click: 'Contact' };
      if (window.fbq && m[name]) window.fbq('track', m[name], p);
    } catch (e) { /* ignore */ }
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function product(id) { for (var i = 0; i < S.products.length; i++) if (S.products[i].id === id) return S.products[i]; return null; }
  function src(p, i) { return D.url(p.images[i || 0] || ''); }
  function sizeQty(p, size) { var s = p.sizes.filter(function (x) { return x.size === size; })[0]; return s ? s.qty : 0; }
  function inCart(pid, size) {
    return S.cart.reduce(function (a, l) { return a + (l.pid === pid && l.size === size ? l.qty : 0); }, 0);
  }
  function freeQty(p, size) { return Math.max(0, sizeQty(p, size) - inCart(p.id, size)); }
  function availSizes(p) { return p.sizes.filter(function (s) { return s.qty > 0; }); }
  function soloSize(p) { var a = availSizes(p); return a.length === 1 ? a[0].size : ''; }
  function isFav(id) { return S.favs.indexOf(id) > -1; }
  function pageLink(id) { return /^https?:/.test(location.href) ? location.href.split('#')[0] + '#p=' + id : ''; }

  /* ----------------------------------------------------------------- diálogos */
  function anyOpen() { return !!document.querySelector('dialog[open]'); }
  function openDlg(d) {
    if (!d.open) { d.classList.remove('closing'); d.showModal(); }
    document.documentElement.classList.add('lock');
  }
  function closeDlg(d) {
    if (!d.open || d.classList.contains('closing')) return;
    if (reduced) { d.close(); return; }
    d.classList.add('closing');
    var done = false;
    function fin() { if (done) return; done = true; d.classList.remove('closing'); if (d.open) d.close(); }
    d.addEventListener('animationend', function h(e) { if (e.target === d) { d.removeEventListener('animationend', h); fin(); } });
    setTimeout(fin, 320);
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(d); });
    d.addEventListener('click', function (e) { if (e.target === d) closeDlg(d); });
    d.addEventListener('close', function () {
      if (!anyOpen()) document.documentElement.classList.remove('lock');
      if (d.id === 'pdp') {
        S.pdp = null;
        if (/^#p=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
      }
      if (d.id === 'sizeSheet') S.sheet = null;
    });
  });

  /* -------------------------------------------------------------------- toast */
  var toastTimer;
  function hideToast() {
    var t = $('#toast');
    try { if (t.hidePopover && t.matches(':popover-open')) t.hidePopover(); } catch (e) { /* ignore */ }
    t.hidden = true;
  }
  function toast(msg, act, fn, ms) {
    var t = $('#toast'), b = $('#toastAct');
    $('#toastMsg').textContent = msg;
    if (act) { b.hidden = false; b.textContent = act; b.onclick = function () { hideToast(); if (fn) fn(); }; }
    else { b.hidden = true; b.onclick = null; }
    t.hidden = false;
    try { if (t.showPopover && !t.matches(':popover-open')) t.showPopover(); } catch (e) { /* ignore */ }
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 3800);
  }

  /* ----------------------------------------------------------------- configurações */
  function applySettings() {
    var s = S.settings, parts = String(s.store_name).split(' ');
    document.title = s.store_name + ' — ' + (s.tagline || 'loja de roupas');
    $('#brand').innerHTML = s.logo_url
      ? '<img src="' + esc(D.url(s.logo_url)) + '" alt="' + esc(s.store_name) + '">'
      : '<span class="brand__a">' + esc(parts[0]) + '</span>' + (parts.length > 1 ? '<span class="brand__b">' + esc(parts.slice(1).join(' ')) + '</span>' : '');
    $('#announce').hidden = !s.announcement;
    $('#announceText').textContent = s.announcement;

    $('#heroEyebrow').textContent = s.tagline; $('#heroEyebrow').hidden = !s.tagline;
    $('#heroTitle').textContent = s.hero_title || s.store_name;
    $('#heroSub').textContent = s.hero_subtitle; $('#heroSub').hidden = !s.hero_subtitle;

    var wa = D.waLink(s.whatsapp, 'Olá, ' + s.store_name + '! Vim pelo site e queria tirar uma dúvida.');
    $('#waFloat').hidden = !wa;
    if (wa) $('#waFloat').href = wa;

    $('#ftrName').textContent = s.store_name;
    $('#ftrTag').textContent = s.tagline;
    var rows = [];
    if (s.address) rows.push(['Endereço', esc(s.address)]);
    if (s.hours) rows.push(['Horário', esc(s.hours)]);
    if (s.instagram) {
      var h = s.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
      rows.push(['Instagram', '<a href="https://instagram.com/' + encodeURIComponent(h) + '" target="_blank" rel="noopener">@' + esc(h) + '</a>']);
    }
    if (wa) rows.push(['WhatsApp', '<a href="' + esc(wa) + '" target="_blank" rel="noopener">Chamar a loja</a>']);
    $('#ftrList').innerHTML = rows.map(function (r) { return '<li><span>' + r[0] + '</span><span>' + r[1] + '</span></li>'; }).join('');
    $('#ftrList').hidden = !rows.length;
    $('#ftrCopy').textContent = '© ' + new Date().getFullYear() + ' ' + s.store_name + '. Todos os direitos reservados.';
  }

  function renderHero() {
    var s = S.settings, art = $('#heroArt'), withImg = S.products.filter(function (p) { return p.images.length && !D.soldOut(p); });
    withImg.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    if (s.hero_image) {
      art.className = 'hero__art solo';
      art.innerHTML = '<div class="a"><img src="' + esc(D.url(s.hero_image)) + '" alt=""></div>';
    } else if (withImg.length) {
      art.className = 'hero__art' + (withImg.length < 2 ? ' solo' : '');
      art.innerHTML = '<div class="a"><img src="' + esc(src(withImg[0])) + '" alt=""></div>' +
        (withImg[1] ? '<div class="b"><img src="' + esc(src(withImg[1])) + '" alt=""></div>' : '');
    } else { art.innerHTML = ''; art.hidden = true; }
  }

  function renderFaq() {
    $('#faqList').innerHTML = FAQ.map(function (q) {
      return '<details><summary>' + esc(q[0]) + '<svg class="ic"><use href="#i-plus"/></svg></summary><p>' + esc(q[1]) + '</p></details>';
    }).join('');
  }

  /* ------------------------------------------------------------------- vitrine */
  function computeCats() {
    var seen = {}, out = [];
    S.products.forEach(function (p) { if (p.category && !seen[p.category]) { seen[p.category] = 1; out.push(p.category); } });
    S.cats = out;
  }

  function visible() {
    var f = S.f, q = norm(f.q).trim();
    var list = S.products.filter(function (p) {
      if (f.favs && !isFav(p.id)) return false;
      if (f.cat && p.category !== f.cat) return false;
      if (f.size && !p.sizes.some(function (s) { return s.size === f.size && s.qty > 0; })) return false;
      if (q && norm([p.name, p.category, p.colors.join(' '), p.description].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
    if (f.sort === 'asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (f.sort === 'desc') list.sort(function (a, b) { return b.price - a.price; });
    else list.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var ok = list.filter(function (p) { return !D.soldOut(p); }), out = list.filter(D.soldOut);
    return ok.concat(out);
  }

  function renderNav() {
    $('#nav').innerHTML = S.cats.slice(0, 5).map(function (c) {
      return '<button type="button" data-act="cat" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
  }

  function renderChips() {
    var f = S.f, html = '<button type="button" class="chip" data-act="cat" data-cat="" aria-pressed="' + (!f.cat && !f.favs) + '">Tudo</button>';
    S.cats.forEach(function (c) {
      html += '<button type="button" class="chip" data-act="cat" data-cat="' + esc(c) + '" aria-pressed="' + (f.cat === c && !f.favs) + '">' + esc(c) + '</button>';
    });
    if (S.favs.length || f.favs) html += '<button type="button" class="chip" data-act="favfilter" aria-pressed="' + f.favs + '">Favoritos (' + S.favs.length + ')</button>';
    $('#catChips').innerHTML = html;

    var sizes = {};
    S.products.forEach(function (p) {
      if (f.cat && p.category !== f.cat) return;
      p.sizes.forEach(function (s) { if (s.qty > 0) sizes[s.size] = 1; });
    });
    var arr = Object.keys(sizes).sort(D.sizeCompare);
    if (f.size && !sizes[f.size]) f.size = '';
    $('#sizeFilter').hidden = arr.length < 2;
    $('#sizeChips').innerHTML = arr.map(function (z) {
      return '<button type="button" class="chip" data-act="size" data-size="' + esc(z) + '" aria-pressed="' + (f.size === z) + '">' + esc(z) + '</button>';
    }).join('');
  }

  function badges(p) {
    var out = [];
    if (D.soldOut(p)) return '<span class="badge badge--out">Esgotado</span>';
    var d = D.discount(p);
    if (d) out.push('<span class="badge badge--sale">-' + d + '%</span>');
    if (D.isLow(p)) out.push('<span class="badge badge--low">Últimas unidades</span>');
    if (D.isNew(p)) out.push('<span class="badge">Novo</span>');
    return out.slice(0, 2).join('');
  }

  function priceHtml(p) {
    return '<span>' + fmt(p.price) + '</span>' + (p.compare_at_price ? '<s>' + fmt(p.compare_at_price) + '</s>' : '');
  }

  function cardHtml(p, i) {
    var out = D.soldOut(p), fav = isFav(p.id);
    return '<article class="card' + (out ? ' is-out' : '') + '" data-id="' + esc(p.id) + '" style="--i:' + Math.min(i || 0, 12) + '">' +
      '<div class="card__media">' +
        '<button type="button" class="card__open" data-act="open" aria-label="Ver ' + esc(p.name) + '">' +
          (p.images[0] ? '<img class="card__img" src="' + esc(src(p, 0)) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' : '') +
          (p.images[1] ? '<img class="card__img card__img--alt" src="' + esc(src(p, 1)) + '" alt="" loading="lazy" decoding="async">' : '') +
        '</button>' +
        '<div class="card__badges">' + badges(p) + '</div>' +
        '<button type="button" class="fav' + (fav ? ' is-on' : '') + '" data-act="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remover dos favoritos' : 'Favoritar') + ' ' + esc(p.name) + '"><svg class="ic"><use href="#i-heart"/></svg></button>' +
        (out ? '' : '<button type="button" class="quick" data-act="quick" aria-label="Adicionar ' + esc(p.name) + ' à sacola"><svg class="ic"><use href="#i-plus"/></svg><span>Adicionar</span></button>') +
      '</div>' +
      '<div class="card__info">' +
        '<h3 class="card__name"><button type="button" data-act="open">' + esc(p.name) + '</button></h3>' +
        '<p class="card__price">' + priceHtml(p) + '</p>' +
        (p.colors.length > 1 ? '<p class="card__meta">' + p.colors.length + ' cores</p>' : '') +
      '</div>' +
    '</article>';
  }

  function renderGrid() {
    var list = visible();
    $('#resultCount').textContent = list.length + (list.length === 1 ? ' peça' : ' peças');
    if (!list.length) {
      var filtered = S.f.cat || S.f.size || S.f.q || S.f.favs;
      $('#grid').innerHTML = '<div class="empty"><h3>' + (S.f.favs ? 'Nenhum favorito ainda' : 'Nada por aqui') + '</h3><p>' +
        (S.f.favs ? 'Toque no coração de uma peça para guardá-la aqui.' : filtered ? 'Nenhuma peça combina com esses filtros.' : 'Em breve teremos peças novas.') + '</p>' +
        (filtered ? '<button type="button" class="btn btn--line" data-act="clear-filters">Limpar filtros</button>' : '') + '</div>';
      return;
    }
    $('#grid').innerHTML = list.map(cardHtml).join('');
  }

  function refreshShop() { renderChips(); renderGrid(); }

  function renderSkeleton() {
    var h = ''; for (var i = 0; i < 8; i++) h += '<div class="skel"></div>';
    $('#grid').innerHTML = h;
  }

  /* ---------------------------------------------------------------- favoritos */
  function updateFavUi() {
    var n = S.favs.length;
    $('#favCount').hidden = !n; $('#favCount').textContent = n;
    $('#favBtn').setAttribute('aria-pressed', String(S.f.favs));
  }
  function toggleFav(id) {
    var i = S.favs.indexOf(id);
    if (i > -1) S.favs.splice(i, 1); else S.favs.push(id);
    ls.set(KEY.favs, S.favs);
    updateFavUi();
    if (S.f.favs) { if (!S.favs.length) S.f.favs = false; refreshShop(); updateFavUi(); return; }
    $$('.fav[data-id], [data-id] .fav').forEach(function (b) {
      var card = b.closest('[data-id]');
      if (!card || card.getAttribute('data-id') !== id) return;
      b.classList.toggle('is-on', isFav(id)); b.setAttribute('aria-pressed', String(isFav(id)));
    });
    renderChips();
  }

  /* ------------------------------------------------------------------- sacola */
  function cartLines() {
    var out = [];
    S.cart.forEach(function (l, idx) { var p = product(l.pid); if (p) out.push({ idx: idx, l: l, p: p }); });
    return out;
  }
  function cartCount() { return S.cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function subtotal() { return cartLines().reduce(function (a, x) { return a + x.p.price * x.l.qty; }, 0); }

  function reconcile() {
    var before = S.cart.length, changed = false;
    S.cart = S.cart.filter(function (l) {
      var p = product(l.pid);
      return p && p.sizes.some(function (s) { return s.size === l.size && s.qty > 0; });
    });
    var used = {};
    S.cart.forEach(function (l) {
      var p = product(l.pid), k = l.pid + '|' + l.size, room = sizeQty(p, l.size) - (used[k] || 0);
      if (l.qty > room) { l.qty = Math.max(0, room); changed = true; }
      used[k] = (used[k] || 0) + l.qty;
    });
    S.cart = S.cart.filter(function (l) { return l.qty > 0; });
    return before !== S.cart.length || changed;
  }

  function saveCart() { ls.set(KEY.cart, S.cart); updateBagUi(); }

  function addToCart(pid, size, color, qty) {
    var p = product(pid); qty = qty || 1;
    if (!p) return false;
    if (freeQty(p, size) < qty) { toast('Já pegamos todas as unidades desse tamanho. Veja outro tamanho.'); return false; }
    var line = S.cart.filter(function (l) { return l.pid === pid && l.size === size && l.color === (color || ''); })[0];
    if (line) line.qty += qty; else S.cart.push({ pid: pid, size: size, color: color || '', qty: qty });
    saveCart();
    track('add_to_cart', { currency: 'BRL', value: p.price * qty, items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: qty, item_variant: size }] });
    var c = $('#bagCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    return true;
  }

  function updateBagUi() {
    var n = cartCount();
    $('#bagCount').hidden = !n; $('#bagCount').textContent = n;
    $('#bagbar').hidden = !n;
    $('#bagbarCount').textContent = n + (n === 1 ? ' peça' : ' peças');
    $('#bagbarTotal').textContent = fmt(subtotal());
    document.body.classList.toggle('has-bagbar', n > 0);
    if ($('#bag').open) renderBag();
  }

  function renderBag() {
    var L = cartLines(), empty = !L.length, min = S.settings.free_shipping_min, sub = subtotal();
    $('#bagForm').hidden = empty; $('#bagFoot').hidden = empty;

    var ship = '';
    if (min && !empty) {
      var done = sub >= min, pct = Math.min(100, Math.round(sub / min * 100));
      ship = '<div class="ship' + (done ? ' is-done' : '') + '"><p>' + (done ? 'Frete grátis liberado para o seu pedido.' : 'Faltam <strong>' + fmt(min - sub) + '</strong> para o frete grátis.') +
        '</p><div class="ship__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div></div>';
    }
    $('#bagShip').innerHTML = ship;

    if (empty) {
      $('#bagLines').innerHTML = '<div class="bag-empty"><h3>Sua sacola está vazia</h3><p>Escolha uma peça e ela aparece aqui.</p><button type="button" class="btn btn--ink" data-act="shop">Ver as peças</button></div>';
      return;
    }
    $('#bagLines').innerHTML = L.map(function (x) {
      var p = x.p, l = x.l;
      return '<div class="line" data-idx="' + x.idx + '">' +
        '<div class="line__img">' + (p.images[0] ? '<img src="' + esc(src(p)) + '" alt="">' : '') + '</div>' +
        '<div><div class="line__top"><div><p class="line__name">' + esc(p.name) + '</p><p class="line__meta">Tam ' + esc(l.size) + (l.color ? ' · ' + esc(l.color) : '') + '</p></div>' +
        '<button type="button" class="line__rm" data-act="rm" aria-label="Remover ' + esc(p.name) + '"><svg class="ic"><use href="#i-trash"/></svg></button></div>' +
        '<div class="line__bot"><div class="stepper"><button type="button" data-act="qminus" aria-label="Diminuir"' + (l.qty <= 1 ? ' disabled' : '') + '><svg class="ic"><use href="#i-minus"/></svg></button>' +
        '<b aria-live="polite">' + l.qty + '</b><button type="button" data-act="qplus" aria-label="Aumentar"' + (freeQty(p, l.size) < 1 ? ' disabled' : '') + '><svg class="ic"><use href="#i-plus"/></svg></button></div>' +
        '<span class="line__price">' + fmt(p.price * l.qty) + '</span></div></div></div>';
    }).join('');
    $('#bagTotal').textContent = fmt(sub);
  }

  function openBag() {
    if (reconcile()) { saveCart(); toast('Atualizamos a sacola: algumas peças ficaram sem estoque.'); }
    renderBag();
    openDlg($('#bag'));
  }

  /* -------------------------------------------------------------------- pedido */
  function deliveryText() {
    var co = S.co;
    if (co.entrega !== 'entrega') return 'Retirada na loja';
    var free = S.settings.free_shipping_min && subtotal() >= S.settings.free_shipping_min;
    return 'Entrega — bairro ' + co.bairro.trim() + (free ? ' (frete grátis)' : ' (frete a combinar)');
  }

  function orderMessage() {
    var out = ['Olá, ' + S.settings.store_name + '! Quero fazer um pedido:', ''];
    cartLines().forEach(function (x) {
      out.push(x.l.qty + 'x ' + x.p.name + ' — Tam ' + x.l.size + (x.l.color ? ' — ' + x.l.color : '') + ' — ' + fmt(x.p.price * x.l.qty));
    });
    out.push('', 'Subtotal: ' + fmt(subtotal()), 'Entrega: ' + deliveryText(), 'Pagamento: ' + S.co.pagto, 'Nome: ' + S.co.nome.trim());
    return out.join('\n');
  }

  function showMessage(msg) {
    $('#msgWhy').textContent = D.mode === 'demo'
      ? 'Modo demonstração: o WhatsApp da loja ainda não foi definido (Painel > Loja). Esta é a mensagem que seria enviada.'
      : 'O WhatsApp da loja ainda não foi configurado. Copie a mensagem e envie para a loja.';
    $('#msgPre').textContent = msg;
    openDlg($('#msgModal'));
  }

  function sendWhatsApp(msg, meta) {
    var link = D.waLink(S.settings.whatsapp, msg);
    track('whatsapp_click', meta || {});
    if (!link) { showMessage(msg); return; }
    var w = null;
    try { w = window.open(link, '_blank'); if (w) w.opener = null; } catch (e) { w = null; }
    if (!w) { location.href = link; return; }
    toast('Abrimos o WhatsApp com o seu pedido. Se não abriu, toque de novo.', null, null, 5000);
  }

  function setErr(field, msg) {
    var e = $('#fErr');
    ['#fBairro', '#fNome'].forEach(function (s) { $(s).removeAttribute('aria-invalid'); });
    if (!msg) { e.hidden = true; return; }
    e.hidden = false; e.textContent = msg;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  function checkout() {
    var co = S.co;
    if (!cartLines().length) return;
    if (reconcile()) { saveCart(); toast('Algumas peças ficaram sem estoque e saíram da sacola. Confira antes de finalizar.'); return; }
    if (co.entrega === 'entrega' && !co.bairro.trim()) { setErr($('#fBairro'), 'Informe o seu bairro para a entrega.'); return; }
    if (!co.nome.trim()) { setErr($('#fNome'), 'Diga seu nome para a loja saber com quem falar.'); return; }
    setErr(null, '');
    var items = cartLines().map(function (x) { return { item_id: x.p.id, item_name: x.p.name, price: x.p.price, quantity: x.l.qty, item_variant: x.l.size }; });
    track('begin_checkout', { currency: 'BRL', value: subtotal(), items: items });
    sendWhatsApp(orderMessage(), { value: subtotal(), source: 'cart' });
  }

  /* ------------------------------------------------------------ escolha rápida */
  function sheetHtml() {
    var st = S.sheet, p = product(st.id);
    var colors = p.colors.length > 1 ? '<div><div class="sheet__lab"><span>Cor</span></div><div class="chips" role="group" aria-label="Cor">' +
      p.colors.map(function (c) { return '<button type="button" class="chip" data-act="sheet-color" data-color="' + esc(c) + '" aria-pressed="' + (st.color === c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>' : '';
    var hint = st.size && freeQty(p, st.size) > 0 && freeQty(p, st.size) <= D.LOW_STOCK ? 'Restam ' + freeQty(p, st.size) : '';
    return '<div class="sheet__hd"><img src="' + esc(src(p)) + '" alt=""><div><h3>' + esc(p.name) + '</h3><p class="card__price">' + priceHtml(p) + '</p></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Fechar"><svg class="ic"><use href="#i-close"/></svg></button></div>' + colors +
      '<div><div class="sheet__lab"><span>Tamanho</span><em>' + hint + '</em></div><div class="chips" role="group" aria-label="Tamanho">' +
      p.sizes.map(function (s) {
        var out = freeQty(p, s.size) < 1;
        return '<button type="button" class="chip" data-act="sheet-size" data-size="' + esc(s.size) + '" aria-pressed="' + (st.size === s.size) + '"' + (out ? ' disabled' : '') + '>' + esc(s.size) + '</button>';
      }).join('') + '</div></div>' +
      '<button type="button" class="btn btn--ink btn--block btn--lg" data-act="sheet-add"' + (st.size ? '' : ' disabled') + '>' + (st.size ? 'Adicionar à sacola' : 'Escolha um tamanho') + '</button>' +
      '<button type="button" class="link-btn" data-act="sheet-pdp">Ver detalhes da peça</button>';
  }
  function renderSheet() { $('#sheetBody').innerHTML = sheetHtml(); }

  function quickAdd(id) {
    var p = product(id);
    if (!p || D.soldOut(p)) return;
    var solo = soloSize(p), one = p.colors.length <= 1;
    if (solo && one && freeQty(p, solo) > 0) {
      if (addToCart(id, solo, p.colors[0] || '')) toast(p.name + ' na sacola.', 'Ver sacola', openBag);
      return;
    }
    S.sheet = { id: id, size: solo && freeQty(p, solo) > 0 ? solo : '', color: p.colors[0] || '' };
    renderSheet();
    openDlg($('#sizeSheet'));
  }

  /* ---------------------------------------------------------- página da peça */
  function galleryHtml(p) {
    var imgs = p.images.length ? p.images : [''];
    return '<div class="pdp__track" id="pdpTrack" tabindex="0" aria-label="Fotos da peça">' +
      imgs.map(function (u, i) { return '<img src="' + esc(D.url(u)) + '" alt="' + esc(p.name) + (imgs.length > 1 ? ' — foto ' + (i + 1) : '') + '"' + (i ? ' loading="lazy"' : '') + '>'; }).join('') + '</div>' +
      (imgs.length > 1
        ? '<button type="button" class="icon-btn pdp__arrow l" data-act="g-prev" aria-label="Foto anterior"><svg class="ic"><use href="#i-left"/></svg></button>' +
          '<button type="button" class="icon-btn pdp__arrow r" data-act="g-next" aria-label="Próxima foto"><svg class="ic"><use href="#i-right"/></svg></button>' +
          '<div class="pdp__dots">' + imgs.map(function (_, i) { return '<button type="button" data-act="g-dot" data-i="' + i + '" class="' + (i ? '' : 'is-on') + '" aria-label="Foto ' + (i + 1) + '"></button>'; }).join('') + '</div>'
        : '');
  }

  function infoHtml(p) {
    var st = S.pdp, out = D.soldOut(p), left = st.size ? freeQty(p, st.size) : 0;
    var hint = st.size && left > 0 && left <= D.LOW_STOCK ? 'Restam ' + left : '';
    var d = D.discount(p);
    var colors = p.colors.length ? '<fieldset class="opt-group"><legend><span>Cor: <b>' + esc(st.color) + '</b></span></legend><div class="chips" role="group">' +
      p.colors.map(function (c) { return '<button type="button" class="chip" data-act="pdp-color" data-color="' + esc(c) + '" aria-pressed="' + (st.color === c) + '">' + esc(c) + '</button>'; }).join('') + '</div></fieldset>' : '';
    var sizes = '<fieldset class="opt-group" id="pdpSizes"><legend><span>Tamanho</span><em>' + hint + '</em></legend><div class="chips" role="group">' +
      p.sizes.map(function (s) {
        var none = freeQty(p, s.size) < 1;
        return '<button type="button" class="chip" data-act="pdp-size" data-size="' + esc(s.size) + '" aria-pressed="' + (st.size === s.size) + '"' + (none ? ' disabled' : '') + '>' + esc(s.size) + '</button>';
      }).join('') + '</div></fieldset>';
    var help = D.waLink(S.settings.whatsapp, 'Olá, ' + S.settings.store_name + '! Estou em dúvida sobre o tamanho da peça "' + p.name + '". Pode me ajudar?');
    return (p.category ? '<p class="eyebrow">' + esc(p.category) + '</p>' : '') +
      '<h2 class="pdp__name">' + esc(p.name) + '</h2>' +
      '<p class="pdp__price"><strong>' + fmt(p.price) + '</strong>' + (p.compare_at_price ? '<s>' + fmt(p.compare_at_price) + '</s>' : '') + (d ? '<span class="badge badge--sale">-' + d + '%</span>' : '') + '</p>' +
      (p.description ? '<p class="pdp__desc">' + esc(p.description) + '</p>' : '') +
      (out ? '<div><span class="badge badge--out">Esgotado</span><p class="muted" style="margin-top:8px">Essa peça esgotou. Veja outras abaixo ou pergunte se vai voltar.</p></div>'
        : colors + sizes + '<p class="pdp__err" id="pdpErr" role="alert" hidden></p>' +
          '<div class="pdp__act"><button type="button" class="btn btn--ink btn--lg" data-act="pdp-add">Adicionar à sacola</button>' +
          '<button type="button" class="btn btn--wa btn--lg" data-act="pdp-wa"><svg class="ic"><use href="#i-wa"/></svg><span>Pedir pelo WhatsApp</span></button></div>') +
      '<details class="help"><summary>Dúvida no tamanho?<svg class="ic"><use href="#i-down"/></svg></summary><p>' +
        (help ? 'Chame a gente no WhatsApp e ajudamos você a escolher. <a href="' + esc(help) + '" target="_blank" rel="noopener">Falar com a loja</a>.' : 'Fale com a loja no WhatsApp e a gente ajuda você a escolher o tamanho.') + '</p></details>';
  }

  function relatedHtml(p) {
    var pool = S.products.filter(function (x) { return x.id !== p.id && !D.soldOut(x); });
    var same = pool.filter(function (x) { return x.category && x.category === p.category; });
    var rest = pool.filter(function (x) { return same.indexOf(x) < 0; });
    var list = same.concat(rest).slice(0, 4);
    if (!list.length) return '';
    return '<section class="pdp__rel"><h3>Combina com</h3><div class="grid">' + list.map(cardHtml).join('') + '</div></section>';
  }

  function renderPdp() {
    var p = product(S.pdp.id);
    $('#pdpBody').innerHTML = '<div class="pdp__top"><div class="pdp__gallery" id="pdpGallery">' + galleryHtml(p) + '</div><div class="pdp__info" id="pdpInfo">' + infoHtml(p) + '</div></div>' + relatedHtml(p);
    var tr = $('#pdpTrack');
    if (tr) {
      var raf = 0;
      tr.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var i = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth));
          $$('.pdp__dots button').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
        });
      }, { passive: true });
    }
  }
  function renderPdpInfo() { $('#pdpInfo').innerHTML = infoHtml(product(S.pdp.id)); }

  function openPdp(id) {
    var p = product(id);
    if (!p) return;
    S.pdp = { id: id, size: soloSize(p), color: p.colors[0] || '' };
    renderPdp();
    openDlg($('#pdp'));
    $('#pdp').scrollTop = 0;
    history.replaceState(null, '', '#p=' + id);
    track('view_item', { currency: 'BRL', value: p.price, items: [{ item_id: p.id, item_name: p.name, price: p.price }] });
  }

  function needSize() {
    var g = $('#pdpSizes'), e = $('#pdpErr');
    e.hidden = false; e.textContent = 'Escolha um tamanho para continuar.';
    g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
  }

  function pdpWhatsApp() {
    var st = S.pdp, p = product(st.id);
    if (!st.size) { needSize(); return; }
    var link = pageLink(p.id);
    var msg = 'Olá, ' + S.settings.store_name + '! Tenho interesse nesta peça:\n\n1x ' + p.name + ' — Tam ' + st.size + (st.color ? ' — ' + st.color : '') + ' — ' + fmt(p.price) + (link ? '\n\n' + link : '');
    sendWhatsApp(msg, { value: p.price, source: 'product', item_id: p.id });
  }

  /* ---------------------------------------------------------- filtros e busca */
  function setCat(c) {
    S.f.cat = c; S.f.favs = false; S.f.size = '';
    updateFavUi(); refreshShop();
  }
  function scrollToShop() { $('#colecao').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }

  function openSearch(open) {
    var bar = $('#searchbar'), btn = $('#searchBtn');
    bar.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) { $('#searchInput').focus(); }
    else if (S.f.q) { S.f.q = ''; $('#searchInput').value = ''; refreshShop(); }
  }

  /* -------------------------------------------------------------------- cliques */
  document.addEventListener('click', function (e) {
    var closer = e.target.closest('[data-close]');
    if (closer) { var dl = closer.closest('dialog'); if (dl) closeDlg(dl); return; }

    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), card = el.closest('[data-id]'), id = card && card.getAttribute('data-id');

    switch (act) {
      case 'open':
        if ($('#pdp').open) { openPdp(id); $('#pdp').scrollTop = 0; } else openPdp(id);
        break;
      case 'fav': toggleFav(id); break;
      case 'quick': quickAdd(id); break;
      case 'cat': setCat(el.getAttribute('data-cat') || ''); scrollToShop(); break;
      case 'size': S.f.size = S.f.size === el.getAttribute('data-size') ? '' : el.getAttribute('data-size'); refreshShop(); break;
      case 'favfilter': S.f.favs = !S.f.favs; if (S.f.favs) S.f.cat = ''; updateFavUi(); refreshShop(); break;
      case 'clear-filters': S.f = { cat: '', size: '', sort: S.f.sort, q: '', favs: false }; $('#searchInput').value = ''; updateFavUi(); refreshShop(); break;
      case 'shop': closeDlg($('#bag')); scrollToShop(); break;
      case 'retry': boot(); break;

      case 'sheet-size': S.sheet.size = el.getAttribute('data-size'); renderSheet(); break;
      case 'sheet-color': S.sheet.color = el.getAttribute('data-color'); renderSheet(); break;
      case 'sheet-add':
        if (addToCart(S.sheet.id, S.sheet.size, S.sheet.color)) {
          var sp = product(S.sheet.id);
          closeDlg($('#sizeSheet'));
          toast(sp.name + ' na sacola.', 'Ver sacola', openBag);
        } else renderSheet();
        break;
      case 'sheet-pdp': var sid = S.sheet.id; closeDlg($('#sizeSheet')); openPdp(sid); break;

      case 'pdp-size': S.pdp.size = el.getAttribute('data-size'); renderPdpInfo(); break;
      case 'pdp-color': S.pdp.color = el.getAttribute('data-color'); renderPdpInfo(); break;
      case 'pdp-add':
        if (!S.pdp.size) { needSize(); break; }
        if (addToCart(S.pdp.id, S.pdp.size, S.pdp.color)) { closeDlg($('#pdp')); setTimeout(openBag, reduced ? 0 : 120); }
        else renderPdpInfo();
        break;
      case 'pdp-wa': pdpWhatsApp(); break;
      case 'g-prev': case 'g-next':
        var tr = $('#pdpTrack'); tr.scrollBy({ left: (act === 'g-next' ? 1 : -1) * tr.clientWidth, behavior: reduced ? 'auto' : 'smooth' }); break;
      case 'g-dot': var t2 = $('#pdpTrack'); t2.scrollTo({ left: t2.clientWidth * Number(el.getAttribute('data-i')), behavior: reduced ? 'auto' : 'smooth' }); break;

      case 'qplus': case 'qminus':
        var row = el.closest('.line'), l = S.cart[Number(row.getAttribute('data-idx'))], p = l && product(l.pid);
        if (!l || !p) break;
        if (act === 'qplus') { if (freeQty(p, l.size) < 1) break; l.qty += 1; } else if (l.qty > 1) l.qty -= 1;
        saveCart();
        break;
      case 'rm':
        S.cart.splice(Number(el.closest('.line').getAttribute('data-idx')), 1);
        saveCart();
        break;
    }
  });

  $('#bagBtn').addEventListener('click', openBag);
  $('#bagbar').addEventListener('click', openBag);
  $('#checkoutBtn').addEventListener('click', checkout);
  $('#clearBag').addEventListener('click', function () { S.cart = []; saveCart(); });
  $('#favBtn').addEventListener('click', function () {
    if (!S.favs.length && !S.f.favs) { toast('Toque no coração de uma peça para guardá-la aqui.'); return; }
    S.f.favs = !S.f.favs; if (S.f.favs) S.f.cat = '';
    updateFavUi(); refreshShop(); if (S.f.favs) scrollToShop();
  });
  $('#searchBtn').addEventListener('click', function () { openSearch($('#searchbar').hidden); });
  $('#searchClose').addEventListener('click', function () { openSearch(false); });
  var qTimer;
  $('#searchInput').addEventListener('input', function (e) {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { S.f.q = e.target.value; refreshShop(); }, 120);
  });
  $('#searchInput').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') openSearch(false);
    if (e.key === 'Enter') { clearTimeout(qTimer); S.f.q = e.target.value; refreshShop(); scrollToShop(); e.target.blur(); }
  });
  $('#sortSel').addEventListener('change', function (e) { S.f.sort = e.target.value; renderGrid(); });
  $('#msgCopy').addEventListener('click', function () {
    var txt = $('#msgPre').textContent;
    function done() { $('#msgCopy').textContent = 'Copiado'; setTimeout(function () { $('#msgCopy').textContent = 'Copiar mensagem'; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done); else done();
  });
  $('#waFloat').addEventListener('click', function () { track('whatsapp_click', { source: 'float' }); });
  $('#toast').addEventListener('mouseenter', function () { clearTimeout(toastTimer); });
  $('#toast').addEventListener('mouseleave', function () { toastTimer = setTimeout(hideToast, 1800); });

  /* formulário da sacola */
  function syncCheckout() {
    $('#fBairro').hidden = S.co.entrega !== 'entrega';
    $$('input[name="entrega"]').forEach(function (r) { r.checked = r.value === S.co.entrega; });
    $$('input[name="pagto"]').forEach(function (r) { r.checked = r.value === S.co.pagto; });
    $('#fBairro').value = S.co.bairro; $('#fNome').value = S.co.nome;
  }
  $('#bagForm').addEventListener('input', function (e) {
    var t = e.target;
    if (t.name === 'entrega') { S.co.entrega = t.value; $('#fBairro').hidden = t.value !== 'entrega'; if (t.value === 'entrega') $('#fBairro').focus(); }
    else if (t.name === 'pagto') S.co.pagto = t.value;
    else if (t.id === 'fBairro') S.co.bairro = t.value;
    else if (t.id === 'fNome') S.co.nome = t.value;
    if (t.hasAttribute('aria-invalid') && t.value.trim()) setErr(null, '');
    ls.set(KEY.co, S.co);
  });

  /* topo fixo e links por hash */
  window.addEventListener('scroll', function () { $('#hdr').classList.toggle('is-stuck', window.scrollY > 8); }, { passive: true });
  window.addEventListener('hashchange', function () {
    var m = /^#p=(.+)$/.exec(location.hash);
    if (m) openPdp(decodeURIComponent(m[1]));
    else if ($('#pdp').open) closeDlg($('#pdp'));
  });
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.target.classList.add('is-broken');
  }, true);

  /* -------------------------------------------------------------------- início */
  function boot() {
    renderSkeleton();
    return D.init().then(function () {
      return Promise.all([D.getSettings(), D.listProducts()]);
    }).then(function (r) {
      S.settings = r[0]; S.products = r[1];
      S.cart = ls.get(KEY.cart, []).filter(function (l) { return l && l.pid && l.size && l.qty > 0; });
      S.favs = ls.get(KEY.favs, []).filter(function (id) { return !!product(id); });
      var co = ls.get(KEY.co, null); if (co) S.co = Object.assign(S.co, co);
      computeCats();
      showDemoStrip();
      applySettings(); renderHero(); renderNav(); renderFaq();
      if (reconcile()) ls.set(KEY.cart, S.cart);
      syncCheckout(); updateFavUi(); updateBagUi(); refreshShop();
      var m = /^#p=(.+)$/.exec(location.hash);
      if (m) openPdp(decodeURIComponent(m[1]));
      nudge();
    }).catch(function (err) {
      $('#grid').innerHTML = '<div class="empty"><h3>Não foi possível carregar as peças</h3><p>' + esc(D.errorMessage(err)) + '</p><button type="button" class="btn btn--ink" data-act="retry">Tentar de novo</button></div>';
    });
  }

  /* Faixa só do modo demonstração: atalho para o painel durante a apresentação. Some sozinha com o Supabase ligado. */
  function showDemoStrip() {
    var gone = false;
    try { gone = !!sessionStorage.getItem('lume_demo_strip_off'); } catch (e) { /* ignore */ }
    $('#demoStrip').hidden = D.mode !== 'demo' || gone;
    $('#demoOff').hidden = !D.demoForced;
  }
  $('#demoStripX').addEventListener('click', function () {
    try { sessionStorage.setItem('lume_demo_strip_off', '1'); } catch (e) { /* ignore */ }
    $('#demoStrip').hidden = true;
  });

  function nudge() {
    var seen = false;
    try { seen = !!sessionStorage.getItem('lume_nudged'); } catch (e) { /* ignore */ }
    if (seen || !S.cart.length) return;
    setTimeout(function () {
      if (!S.cart.length || anyOpen()) return;
      try { sessionStorage.setItem('lume_nudged', '1'); } catch (e) { /* ignore */ }
      var n = cartCount();
      toast('Você deixou ' + n + (n === 1 ? ' peça' : ' peças') + ' na sacola.', 'Ver sacola', openBag, 7000);
    }, 2800);
  }

  boot();
})();
