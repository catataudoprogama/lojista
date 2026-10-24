/* Lume Moda — painel do lojista: lista de peças, formulário com fotos e configurações da loja. */
(function () {
  'use strict';

  var D = window.Data;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = D.esc, fmt = D.fmt;

  var MAX_PHOTOS = 8;
  var COLOR_SUGGEST = ['Preto', 'Branco', 'Off-white', 'Cinza', 'Bege', 'Azul', 'Verde', 'Marrom', 'Vermelho', 'Rosa'];

  var S = {
    products: [], settings: null, tab: 'pecas', q: '', cat: '',
    form: null, dirty: false, sdraft: null, uid: 0
  };

  /* ---------------------------------------------------------------- utilidades */
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
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 3600);
  }

  function fail(e) {
    var m = D.errorMessage(e);
    toast(m, null, null, 5000);
    if (/Sem permiss/.test(m) && D.mode === 'supabase') setTimeout(showLogin, 1200);
  }

  function show(el, on) { el.hidden = !on; }
  function moneyStr(n) { return n == null ? '' : Number(n).toFixed(2).replace('.', ','); }
  function stockOf(p) { return D.stockTotal(p); }
  function fmtPhone(d) {
    d = String(d || '').replace(/\D/g, '');
    if (/^55\d{10,11}$/.test(d)) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function product(id) { for (var i = 0; i < S.products.length; i++) if (S.products[i].id === id) return S.products[i]; return null; }
  function replaceProduct(p) {
    var i = S.products.map(function (x) { return x.id; }).indexOf(p.id);
    if (i > -1) S.products[i] = p; else S.products.unshift(p);
  }

  /* ------------------------------------------------------------------ sessão */
  function showLogin() {
    show($('#app'), false); show($('#viewLogin'), true);
    $('#lErr').hidden = true;
    setTimeout(function () { $('#lEmail').focus(); }, 50);
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#lEmail').value.trim(), pass = $('#lPass').value, err = $('#lErr'), btn = $('#lBtn');
    if (!email || !pass) { err.hidden = false; err.textContent = 'Preencha o e-mail e a senha.'; return; }
    btn.disabled = true; btn.textContent = 'Entrando…'; err.hidden = true;
    D.signIn(email, pass).then(function (sess) { return sess.admin === false ? denied() : enter(); }).catch(function (ex) {
      err.hidden = false; err.textContent = D.errorMessage(ex);
    }).then(function () { btn.disabled = false; btn.textContent = 'Entrar'; });
  });

  /* Logou, mas o e-mail não está em `admins` no banco: sai e explica, em vez de abrir um painel que não consegue gravar. */
  function denied() {
    return D.signOut().then(function () {
      showLogin();
      var err = $('#lErr');
      err.hidden = false; err.textContent = 'Este e-mail não tem permissão de administrador desta loja.';
    });
  }

  $('#logout').addEventListener('click', function () {
    D.signOut().then(function () { $('#lPass').value = ''; showLogin(); });
  });

  function enter() {
    show($('#viewLogin'), false); show($('#app'), true);
    show($('#demoBanner'), D.mode === 'demo');
    show($('#demoOffAdmin'), !!D.demoForced);
    show($('#logout'), D.mode !== 'demo');
    return Promise.all([D.getSettings(), D.listProducts({ includeInactive: true })]).then(function (r) {
      S.settings = r[0]; S.products = r[1];
      $('#topBrand').textContent = S.settings.store_name;
      document.title = 'Painel — ' + S.settings.store_name;
      renderCatFilter(); renderList(); fillSettings();
      showTab('pecas');
    }).catch(function (e) { fail(e); });
  }

  /* -------------------------------------------------------------------- abas */
  function showTab(name) {
    S.tab = name;
    document.body.classList.toggle('is-editing', name === 'form');
    show($('#tabPecas'), name === 'pecas');
    show($('#tabForm'), name === 'form');
    show($('#tabLoja'), name === 'loja');
    $$('#tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name || (name === 'form' && b.getAttribute('data-tab') === 'pecas')));
    });
    window.scrollTo(0, 0);
  }
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (b) showTab(b.getAttribute('data-tab'));
  });

  /* ----------------------------------------------------------- lista de peças */
  function renderCatFilter() {
    var cats = [];
    S.products.forEach(function (p) { if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); });
    if (S.cat && cats.indexOf(S.cat) < 0) S.cat = '';
    $('#catList').innerHTML = '<option value="">Todas as categorias</option>' + cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (S.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    $('#catSuggest').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  }

  function stockLabel(p) {
    if (!p.sizes.length) return 'sem tamanhos';
    var parts = p.sizes.slice(0, 6).map(function (s) { return s.size + ' ' + s.qty; });
    return parts.join(' · ') + (p.sizes.length > 6 ? ' …' : '') + ' (' + stockOf(p) + ' un)';
  }

  function rowHtml(p) {
    var out = D.soldOut(p);
    return '<article class="prow' + (p.active ? '' : ' is-off') + '" data-id="' + esc(p.id) + '">' +
      (p.images[0] ? '<img class="prow__img" src="' + esc(D.url(p.images[0])) + '" alt="">' : '<div class="prow__img"></div>') +
      '<div class="prow__main"><button type="button" class="prow__name" data-act="edit">' + esc(p.name) + '</button>' +
      '<p class="prow__meta">' + (p.category ? esc(p.category) + ' · ' : '') + esc(stockLabel(p)) + '</p>' +
      '<div class="prow__tags">' + (out ? '<span class="tag tag--out">Esgotada</span>' : '') + (p.active ? '' : '<span class="tag tag--off">Oculta no site</span>') +
      (p.featured ? '<span class="tag">Destaque</span>' : '') + (p.compare_at_price ? '<span class="tag">-' + D.discount(p) + '%</span>' : '') + '</div></div>' +
      '<div class="prow__ctrl"><span class="money"><i>R$</i><input class="field" data-act="price" inputmode="decimal" value="' + esc(moneyStr(p.price)) + '" aria-label="Preço de ' + esc(p.name) + '"></span>' +
      '<div class="prow__sw"><label class="switch"><input type="checkbox" data-act="active"' + (p.active ? ' checked' : '') + '><span>Ativa</span></label>' +
      '<label class="switch"><input type="checkbox" data-act="soldout"' + (out ? ' checked' : '') + '><span>Esgotada</span></label></div></div>' +
      '<div class="menu"><button type="button" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-label="Mais ações de ' + esc(p.name) + '"><svg class="ic"><use href="#i-more"/></svg></button>' +
      '<div class="menu__pop" hidden><button type="button" data-act="edit">Editar</button><button type="button" data-act="dup">Duplicar</button><button type="button" class="danger" data-act="del">Excluir</button></div></div>' +
    '</article>';
  }

  function renderList() {
    var q = S.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var list = S.products.filter(function (p) {
      if (S.cat && p.category !== S.cat) return false;
      if (q && (p.name + ' ' + p.category).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) < 0) return false;
      return true;
    });
    var all = S.products.length, act = S.products.filter(function (p) { return p.active; }).length, out = S.products.filter(D.soldOut).length;
    $('#counts').textContent = all ? all + (all === 1 ? ' peça' : ' peças') + ' · ' + act + ' no site · ' + out + (out === 1 ? ' esgotada' : ' esgotadas') : '';
    if (!all) {
      $('#plist').innerHTML = '<div class="empty"><h3>Nenhuma peça ainda</h3><p>Cadastre a primeira peça com fotos, preço e tamanhos.</p><button type="button" class="btn btn--ink" data-act="new">Cadastrar peça</button></div>';
      return;
    }
    $('#plist').innerHTML = list.length ? list.map(rowHtml).join('') : '<div class="empty"><h3>Nada encontrado</h3><p>Tente outro nome ou categoria.</p></div>';
  }

  $('#qList').addEventListener('input', function (e) { S.q = e.target.value; renderList(); });
  $('#catList').addEventListener('change', function (e) { S.cat = e.target.value; renderList(); });
  $('#newBtn').addEventListener('click', function () { openForm(null); });

  function closeMenus() {
    $$('.menu__pop').forEach(function (m) { m.hidden = true; });
    $$('[data-act="menu"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });

  function quickSave(p, patch, msg, undoPatch) {
    var next = Object.assign({}, p, patch);
    return D.saveProduct(next).then(function (saved) {
      replaceProduct(saved); renderCatFilter(); renderList();
      if (msg) toast(msg, undoPatch ? 'Desfazer' : null, undoPatch ? function () {
        D.saveProduct(Object.assign({}, saved, undoPatch)).then(function (s2) { replaceProduct(s2); renderList(); }).catch(fail);
      } : null, undoPatch ? 6000 : 2800);
      return saved;
    }).catch(function (e) { fail(e); renderList(); });
  }

  $('#plist').addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), row = el.closest('.prow'), p = row && product(row.getAttribute('data-id'));
    if (act === 'new') { openForm(null); return; }
    if (!p) return;
    if (act === 'menu') {
      var pop = $('.menu__pop', row), wasHidden = pop.hidden;
      closeMenus();
      pop.hidden = !wasHidden; el.setAttribute('aria-expanded', String(wasHidden));
      return;
    }
    closeMenus();
    if (act === 'edit') openForm(p);
    else if (act === 'dup') openForm(p, true);
    else if (act === 'del') askDelete(p);
  });

  $('#plist').addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), row = el.closest('.prow'), p = row && product(row.getAttribute('data-id'));
    if (!p) return;

    if (act === 'active') {
      quickSave(p, { active: el.checked }, el.checked ? '“' + p.name + '” voltou para o site.' : '“' + p.name + '” escondida do site.');
    } else if (act === 'soldout') {
      if (el.checked) {
        var prev = p.sizes.map(function (s) { return { size: s.size, qty: s.qty }; });
        quickSave(p, { sizes: p.sizes.map(function (s) { return { size: s.size, qty: 0 }; }) }, '“' + p.name + '” marcada como esgotada.', { sizes: prev });
      } else {
        openForm(p, false, 'sizes');
        toast('Informe quantas unidades você tem de cada tamanho.');
      }
    } else if (act === 'price') {
      var v = D.parseMoney(el.value);
      if (isNaN(v) || v <= 0) { toast('Preço inválido. Use o formato 89,90.'); el.value = moneyStr(p.price); return; }
      if (v === p.price) { el.value = moneyStr(v); return; }
      var patch = { price: v }, extra = '';
      if (p.compare_at_price && v >= p.compare_at_price) { patch.compare_at_price = null; extra = ' O preço antigo foi removido.'; }
      quickSave(p, patch, 'Preço atualizado para ' + fmt(v) + '.' + extra).then(function () {
        var inp = $('.prow[data-id="' + p.id + '"] [data-act="price"]');
        if (inp) { inp.classList.add('saved'); setTimeout(function () { inp.classList.remove('saved'); }, 1400); }
      });
    }
  });
  $('#plist').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('[data-act="price"]')) e.target.blur();
  });

  /* ------------------------------------------------------------------ excluir */
  var delTarget = null;
  function askDelete(p) {
    delTarget = p;
    $('#confirmT').textContent = 'Excluir “' + p.name + '”?';
    $('#confirmP').textContent = 'A peça e as fotos dela saem da loja e não dá para desfazer. Se só quer tirar do site por um tempo, desligue “Ativa”.';
    $('#confirm').showModal();
  }
  $('#confirmNo').addEventListener('click', function () { $('#confirm').close(); delTarget = null; });
  $('#confirmYes').addEventListener('click', function () {
    var p = delTarget; $('#confirm').close(); delTarget = null;
    if (!p) return;
    D.deleteProduct(p.id).then(function () {
      S.products = S.products.filter(function (x) { return x.id !== p.id; });
      renderCatFilter(); renderList(); toast('“' + p.name + '” excluída.');
    }).catch(fail);
  });

  /* ------------------------------------------------------- formulário da peça */
  function newTile(url, status) { return { id: 't' + (++S.uid), url: url || '', status: status || 'ok', file: null, msg: '' }; }

  function openForm(p, asCopy, focus) {
    var base = p ? D.normProduct(p) : D.normProduct({ active: true });
    S.form = {
      id: asCopy ? undefined : (p ? p.id : undefined),
      created_at: asCopy || !p ? undefined : p.created_at,
      images: base.images.map(function (u) { return newTile(u, 'ok'); }),
      colors: base.colors.slice(),
      sizes: base.sizes.map(function (s) { return { size: s.size, qty: s.qty }; })
    };
    S.dirty = !!asCopy;
    $('#formTitle').textContent = asCopy ? 'Nova peça (cópia)' : (p ? 'Editar peça' : 'Nova peça');
    $('#fName').value = asCopy ? base.name + ' (cópia)' : base.name;
    $('#fPrice').value = p ? moneyStr(base.price) : '';
    $('#fCompare').value = moneyStr(base.compare_at_price);
    $('#fCat').value = base.category;
    $('#fDesc').value = base.description;
    $('#fActive').checked = base.active;
    $('#fFeatured').checked = base.featured;
    $('#fColor').value = '';
    $('#newSize').value = '';
    $('#formErr').hidden = true;
    $$('#pform [aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    $('#saveBtn').disabled = false; $('#saveBtn').textContent = 'Salvar peça';
    renderPhotos(); renderColors(); renderSizes(); priceHint();
    showTab('form');
    if (focus === 'sizes') setTimeout(function () { $('#sizesBox').scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }, 30);
  }

  function leaveForm() {
    if (S.dirty && !window.confirm('Descartar as alterações desta peça?')) return;
    S.dirty = false; S.form = null;
    showTab('pecas');
  }
  $('#backBtn').addEventListener('click', leaveForm);
  $('#cancelBtn').addEventListener('click', leaveForm);
  $('#pform').addEventListener('input', function () { S.dirty = true; });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  function priceHint() {
    var p = D.parseMoney($('#fPrice').value), c = D.parseMoney($('#fCompare').value), h = $('#priceHint');
    if (!isNaN(p) && !isNaN(c) && c > p) h.textContent = 'No site aparece com -' + Math.round((1 - p / c) * 100) + '%.';
    else if (!isNaN(c) && !isNaN(p) && c <= p) h.textContent = 'O preço antigo precisa ser maior que o preço atual.';
    else h.textContent = 'Preencha o preço antigo para mostrar o desconto no site.';
  }
  ['#fPrice', '#fCompare'].forEach(function (s) {
    $(s).addEventListener('input', priceHint);
    $(s).addEventListener('blur', function (e) {
      var v = D.parseMoney(e.target.value);
      if (!isNaN(v)) e.target.value = moneyStr(v);
    });
  });

  /* fotos */
  function renderPhotos() {
    var imgs = S.form.images, n = imgs.length;
    $('#photos').innerHTML = imgs.map(function (t, i) {
      if (t.status === 'up') return '<div class="ph is-up" data-tid="' + t.id + '"></div>';
      if (t.status === 'err') {
        return '<div class="ph is-err" data-tid="' + t.id + '"><span>' + esc(t.msg || 'Falhou') + '</span>' +
          (t.file ? '<button type="button" class="link-btn" data-act="retry">Tentar de novo</button>' : '') +
          '<button type="button" class="link-btn" data-act="rm">Remover</button></div>';
      }
      return '<div class="ph" data-tid="' + t.id + '"><img src="' + esc(D.url(t.url)) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0 ? '<span class="ph__badge">Capa</span>' : '') +
        '<button type="button" class="ph__rm" data-act="rm" aria-label="Remover foto ' + (i + 1) + '"><svg class="ic"><use href="#i-close"/></svg></button>' +
        '<div class="ph__bar"><button type="button" data-act="left" aria-label="Mover para a esquerda"' + (i === 0 ? ' disabled' : '') + '><svg class="ic"><use href="#i-left"/></svg></button>' +
        (i > 0 ? '<button type="button" class="ph__cover" data-act="cover">Capa</button>' : '<span></span>') +
        '<button type="button" data-act="right" aria-label="Mover para a direita"' + (i === n - 1 ? ' disabled' : '') + '><svg class="ic"><use href="#i-right"/></svg></button></div></div>';
    }).join('') + (n < MAX_PHOTOS ? '<button type="button" class="ph-add" data-act="add"><svg class="ic"><use href="#i-camera"/></svg><span>Adicionar fotos</span></button>' : '');
  }

  $('#photos').addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), tile = el.closest('[data-tid]'), imgs = S.form.images;
    if (act === 'add') { $('#fileInput').click(); return; }
    var i = tile ? imgs.map(function (t) { return t.id; }).indexOf(tile.getAttribute('data-tid')) : -1;
    if (i < 0) return;
    if (act === 'rm') imgs.splice(i, 1);
    else if (act === 'left' && i > 0) imgs.splice(i - 1, 0, imgs.splice(i, 1)[0]);
    else if (act === 'right' && i < imgs.length - 1) imgs.splice(i + 1, 0, imgs.splice(i, 1)[0]);
    else if (act === 'cover') imgs.unshift(imgs.splice(i, 1)[0]);
    else if (act === 'retry') { uploadTile(imgs[i]); renderPhotos(); return; }
    S.dirty = true; renderPhotos();
  });

  $('#fileInput').addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    var room = MAX_PHOTOS - S.form.images.length;
    if (files.length > room) toast('Máximo de ' + MAX_PHOTOS + ' fotos por peça.');
    files.slice(0, Math.max(0, room)).forEach(function (f) {
      var t = newTile('', 'up'); t.file = f;
      S.form.images.push(t); uploadTile(t);
    });
    S.dirty = true; renderPhotos();
  });

  function uploadTile(t) {
    t.status = 'up'; t.msg = '';
    D.compressImage(t.file).then(function (blob) { return D.uploadImage(blob); }).then(function (url) {
      t.url = url; t.status = 'ok'; t.file = null;
    }).catch(function (e) {
      t.status = 'err'; t.msg = D.errorMessage(e);
    }).then(function () { if (S.form && S.form.images.indexOf(t) > -1) renderPhotos(); });
  }

  /* cores */
  function renderColors() {
    var c = S.form.colors;
    $('#colorTags').innerHTML = c.map(function (x, i) {
      return '<span class="ctag">' + esc(x) + '<button type="button" data-i="' + i + '" aria-label="Remover cor ' + esc(x) + '"><svg class="ic"><use href="#i-close"/></svg></button></span>';
    }).join('');
    $('#colorSuggest').innerHTML = COLOR_SUGGEST.filter(function (x) {
      return !c.some(function (y) { return y.toLowerCase() === x.toLowerCase(); });
    }).map(function (x) { return '<button type="button" class="chip" data-add="' + esc(x) + '">+ ' + esc(x) + '</button>'; }).join('');
  }
  function addColor(v) {
    v = String(v || '').replace(/[,;]+/g, ' ').trim();
    if (!v) return;
    if (S.form.colors.length >= 12) { toast('Máximo de 12 cores.'); return; }
    if (!S.form.colors.some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) { S.form.colors.push(v); S.dirty = true; }
    renderColors();
  }
  $('#fColor').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(e.target.value); e.target.value = ''; }
    else if (e.key === 'Backspace' && !e.target.value && S.form.colors.length) { S.form.colors.pop(); S.dirty = true; renderColors(); }
  });
  $('#fColor').addEventListener('blur', function (e) { if (e.target.value.trim()) { addColor(e.target.value); e.target.value = ''; } });
  $('#colorBox').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) { S.form.colors.splice(Number(b.getAttribute('data-i')), 1); S.dirty = true; renderColors(); }
    else $('#fColor').focus();
  });
  $('#colorSuggest').addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (b) addColor(b.getAttribute('data-add'));
  });

  /* tamanhos e estoque */
  function renderSizes() {
    $('#sizeRows').innerHTML = S.form.sizes.map(function (s, i) {
      return '<div class="srow" data-i="' + i + '"><input class="field" data-f="label" value="' + esc(s.size) + '" maxlength="8" aria-label="Nome do tamanho">' +
        '<div class="step"><button type="button" data-f="minus" aria-label="Menos uma unidade"><svg class="ic"><use href="#i-minus"/></svg></button>' +
        '<input data-f="qty" inputmode="numeric" value="' + s.qty + '" aria-label="Unidades do tamanho ' + esc(s.size) + '">' +
        '<button type="button" data-f="plus" aria-label="Mais uma unidade"><svg class="ic"><use href="#i-plus"/></svg></button></div>' +
        '<button type="button" class="srow__rm" data-f="rm" aria-label="Remover tamanho ' + esc(s.size) + '"><svg class="ic"><use href="#i-close"/></svg></button></div>';
    }).join('');
    stockSummary();
  }
  function stockSummary() {
    var total = S.form.sizes.reduce(function (a, s) { return a + s.qty; }, 0), el = $('#stockSum');
    if (!S.form.sizes.length) { el.textContent = 'Escolha os tamanhos acima ou adicione um.'; el.className = 'stock'; return; }
    el.textContent = total ? 'Estoque total: ' + total + (total === 1 ? ' unidade' : ' unidades') : 'Estoque total: 0 — a peça vai aparecer como Esgotada no site.';
    el.className = 'stock' + (total ? '' : ' warn');
  }
  function addSizes(list) {
    list.forEach(function (z) {
      z = String(z).trim();
      if (!z) return;
      if (!S.form.sizes.some(function (s) { return s.size.toLowerCase() === z.toLowerCase(); })) S.form.sizes.push({ size: z, qty: 0 });
    });
    S.dirty = true; renderSizes();
  }
  $('#presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-preset]');
    if (b) addSizes(b.getAttribute('data-preset').split(','));
  });
  $('#addSize').addEventListener('click', function () { addSizes([$('#newSize').value]); $('#newSize').value = ''; $('#newSize').focus(); });
  $('#newSize').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addSizes([e.target.value]); e.target.value = ''; }
  });
  $('#sizeRows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]');
    if (!b) return;
    var row = b.closest('.srow'), i = Number(row.getAttribute('data-i')), s = S.form.sizes[i], f = b.getAttribute('data-f');
    if (f === 'rm') { S.form.sizes.splice(i, 1); S.dirty = true; renderSizes(); return; }
    if (f === 'plus') s.qty = Math.min(9999, s.qty + 1);
    else if (f === 'minus') s.qty = Math.max(0, s.qty - 1);
    else return;
    $('[data-f="qty"]', row).value = s.qty; S.dirty = true; stockSummary();
  });
  $('#sizeRows').addEventListener('input', function (e) {
    var t = e.target, row = t.closest('.srow'), s = row && S.form.sizes[Number(row.getAttribute('data-i'))];
    if (!s) return;
    if (t.getAttribute('data-f') === 'qty') { s.qty = Math.max(0, Math.min(9999, parseInt(t.value, 10) || 0)); stockSummary(); }
    else if (t.getAttribute('data-f') === 'label') s.size = t.value.trim();
  });
  $('#sizeRows').addEventListener('change', function (e) {
    if (e.target.getAttribute('data-f') === 'qty') {
      var s = S.form.sizes[Number(e.target.closest('.srow').getAttribute('data-i'))];
      e.target.value = s.qty;
    }
  });

  /* salvar peça */
  function formError(msg, el) {
    var e = $('#formErr');
    $$('#pform [aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    e.hidden = false; e.textContent = msg;
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    else e.scrollIntoView({ block: 'center' });
  }

  $('#pform').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = S.form;
    if (f.colors && $('#fColor').value.trim()) { addColor($('#fColor').value); $('#fColor').value = ''; }
    var name = $('#fName').value.trim(), price = D.parseMoney($('#fPrice').value), cmpRaw = $('#fCompare').value.trim(), cmp = cmpRaw ? D.parseMoney(cmpRaw) : null;

    if (!name) return formError('Dê um nome para a peça.', $('#fName'));
    if (isNaN(price) || price <= 0) return formError('Informe o preço da peça. Exemplo: 89,90.', $('#fPrice'));
    if (cmpRaw && (isNaN(cmp) || cmp <= price)) return formError('O preço antigo precisa ser maior que o preço atual. Deixe vazio se não há desconto.', $('#fCompare'));
    if (f.images.some(function (t) { return t.status === 'up'; })) return formError('Espere o envio das fotos terminar.');
    if (f.images.some(function (t) { return t.status === 'err'; })) return formError('Alguma foto não foi enviada. Tente de novo ou remova.');
    if (!f.images.length) return formError('Adicione pelo menos uma foto da peça.');
    if (!f.sizes.length) return formError('Adicione pelo menos um tamanho. Peça sem grade usa “Único”.', $('#newSize'));
    var seen = {};
    for (var i = 0; i < f.sizes.length; i++) {
      var k = f.sizes[i].size.toLowerCase();
      if (!k) return formError('Há um tamanho sem nome.');
      if (seen[k]) return formError('O tamanho “' + f.sizes[i].size + '” aparece duas vezes.');
      seen[k] = 1;
    }

    var p = {
      id: f.id, created_at: f.created_at, name: name, description: $('#fDesc').value.trim(), price: price, compare_at_price: cmp,
      category: $('#fCat').value.trim(), colors: f.colors, images: f.images.map(function (t) { return t.url; }),
      sizes: f.sizes, featured: $('#fFeatured').checked, active: $('#fActive').checked
    };
    var btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'Salvando…'; $('#formErr').hidden = true;
    D.saveProduct(p).then(function (saved) {
      replaceProduct(saved);
      S.dirty = false; S.form = null;
      renderCatFilter(); renderList(); showTab('pecas');
      toast('“' + saved.name + '” salva.');
    }).catch(function (ex) {
      btn.disabled = false; btn.textContent = 'Salvar peça';
      formError(D.errorMessage(ex));
      fail(ex);
    });
  });

  /* ------------------------------------------------------------ configurações */
  function pickerHtml(kind, url) {
    var wide = kind === 'hero';
    return (url ? '<img src="' + esc(D.url(url)) + '" alt="">' : '') +
      '<button type="button" class="btn btn--line" data-pick="' + kind + '">' + (url ? 'Trocar imagem' : 'Escolher imagem') + '</button>' +
      (url ? '<button type="button" class="link-btn" data-clear="' + kind + '">Remover</button>' : '') +
      '<input type="file" accept="image/*" hidden data-file="' + kind + '">';
  }
  function renderPickers() {
    $('#logoPick').innerHTML = pickerHtml('logo', S.sdraft.logo_url);
    $('#heroPick').innerHTML = pickerHtml('hero', S.sdraft.hero_image);
    $('#heroPick').classList.add('wide');
  }
  function fillSettings() {
    var s = S.settings;
    S.sdraft = { logo_url: s.logo_url, hero_image: s.hero_image };
    $('#sName').value = s.store_name; $('#sTag').value = s.tagline; $('#sWa').value = fmtPhone(s.whatsapp);
    $('#sIg').value = s.instagram; $('#sAddr').value = s.address; $('#sHours').value = s.hours; $('#sAnn').value = s.announcement;
    $('#sShip').value = moneyStr(s.free_shipping_min); $('#sHero').value = s.hero_title; $('#sHeroSub').value = s.hero_subtitle;
    $('#sErr').hidden = true;
    renderPickers();
  }

  $('#tabLoja').addEventListener('click', function (e) {
    var pick = e.target.closest('[data-pick]'), clr = e.target.closest('[data-clear]');
    if (pick) $('[data-file="' + pick.getAttribute('data-pick') + '"]', pick.parentNode).click();
    if (clr) { S.sdraft[clr.getAttribute('data-clear') === 'logo' ? 'logo_url' : 'hero_image'] = ''; renderPickers(); }
  });
  $('#tabLoja').addEventListener('change', function (e) {
    var inp = e.target.closest('[data-file]');
    if (!inp || !inp.files[0]) return;
    var kind = inp.getAttribute('data-file'), file = inp.files[0];
    var opts = kind === 'logo' ? Object.assign({}, D.imageOptions, { max: 600, alpha: true }) : Object.assign({}, D.imageOptions, { max: Math.max(D.imageOptions.max, 1600) });
    toast('Enviando imagem…', null, null, 8000);
    D.compressImage(file, opts).then(function (b) { return D.uploadImage(b); }).then(function (url) {
      S.sdraft[kind === 'logo' ? 'logo_url' : 'hero_image'] = url; renderPickers(); hideToast();
    }).catch(fail);
  });

  $('#sform').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#sErr'), name = $('#sName').value.trim(), waRaw = $('#sWa').value.trim(), shipRaw = $('#sShip').value.trim();
    function bad(msg, el) { err.hidden = false; err.textContent = msg; if (el) el.focus(); }
    if (!name) return bad('Informe o nome da loja.', $('#sName'));
    var wa = '';
    if (waRaw) {
      wa = D.waNumber(waRaw);
      if (!wa) return bad('Informe o WhatsApp com DDD, por exemplo (73) 99999-9999.', $('#sWa'));
    }
    var ship = null;
    if (shipRaw) {
      ship = D.parseMoney(shipRaw);
      if (isNaN(ship) || ship <= 0) return bad('Valor do frete grátis inválido. Deixe vazio para desligar.', $('#sShip'));
    }
    err.hidden = true;
    var next = Object.assign({}, S.settings, {
      store_name: name, tagline: $('#sTag').value.trim(), whatsapp: wa, instagram: $('#sIg').value.trim().replace(/^@/, ''),
      address: $('#sAddr').value.trim(), hours: $('#sHours').value.trim(), announcement: $('#sAnn').value.trim(), free_shipping_min: ship,
      hero_title: $('#sHero').value.trim(), hero_subtitle: $('#sHeroSub').value.trim(), hero_image: S.sdraft.hero_image, logo_url: S.sdraft.logo_url
    });
    var btn = $('#sBtn'); btn.disabled = true; btn.textContent = 'Salvando…';
    D.saveSettings(next).then(function (saved) {
      S.settings = saved; fillSettings();
      $('#topBrand').textContent = saved.store_name; document.title = 'Painel — ' + saved.store_name;
      toast('Configurações salvas.');
    }).catch(function (ex) { bad(D.errorMessage(ex)); fail(ex); })
      .then(function () { btn.disabled = false; btn.textContent = 'Salvar configurações'; });
  });

  /* demonstração */
  $('#resetDemo').addEventListener('click', function () {
    if (!window.confirm('Voltar para as peças de exemplo? O que você cadastrou neste navegador será apagado.')) return;
    D.resetDemo().then(function () { S.dirty = false; return enter(); }).then(function () { toast('Exemplos restaurados.'); }).catch(fail);
  });

  /* ------------------------------------------------------------------- início */
  D.init().then(function () { return D.session(); }).then(function (sess) {
    if (sess && sess.admin === false) return denied();
    if (sess) return enter();
    showLogin();
  }).catch(function (e) {
    show($('#viewLogin'), true);
    $('#lErr').hidden = false; $('#lErr').textContent = 'Não consegui conectar: ' + D.errorMessage(e);
  });
})();
