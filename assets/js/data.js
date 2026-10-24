/* Lume Moda — camada de dados.
   A vitrine e o painel só falam com `Data`. O driver (Supabase ou demonstração)
   é escolhido em Data.init() conforme o config.js. */
(function () {
  'use strict';

  var script = document.currentScript;
  var root = script && script.src ? script.src.replace(/assets\/js\/[^\/?#]*(\?.*)?$/, '') : '';
  var cfg = window.LOJA_CONFIG || {};
  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EG', 'EGG'];
  var NEW_DAYS = 21;
  var LOW_STOCK = 3;

  var DEFAULT_SETTINGS = {
    store_name: 'Minha Loja', tagline: '', whatsapp: '', instagram: '', address: '', hours: '',
    announcement: '', free_shipping_min: null, hero_title: '', hero_subtitle: '', hero_image: '', logo_url: ''
  };

  var Data = {
    root: root, mode: null, config: cfg, drivers: {}, imageOptions: { max: 1400, quality: 0.82 },
    NEW_DAYS: NEW_DAYS, LOW_STOCK: LOW_STOCK, DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };

  /* ------------------------------------------------------------ formatação */
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  Data.fmt = function (n) { return brl.format(Number(n) || 0).replace(/ /g, ' '); };

  Data.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* "1.299,90" | "89,9" | "89.90" | "R$ 120" -> número (ou NaN) */
  Data.parseMoney = function (str) {
    if (typeof str === 'number') return str;
    var s = String(str == null ? '' : str).replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) {
      s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (lc > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (ld > -1) {
      var after = s.length - ld - 1;
      if (after === 3 && s.indexOf('.') === ld) s = s.replace('.', '');      // 1.299 -> 1299
      else if (s.split('.').length > 2) s = s.replace(/\./g, '');
    }
    var n = parseFloat(s);
    return isNaN(n) ? NaN : Math.round(n * 100) / 100;
  };

  Data.url = function (u) {
    if (!u) return '';
    return /^(https?:|data:|blob:|\/\/)/i.test(u) ? u : root + u;
  };

  /* ------------------------------------------------------------- WhatsApp */
  Data.waNumber = function (raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) d = '55' + d;
    return d.length >= 12 ? d : '';
  };
  Data.waLink = function (raw, text) {
    var n = Data.waNumber(raw);
    if (!n) return '';
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  /* ------------------------------------------------------------ normalizar */
  Data.normSizes = function (sizes) {
    if (!Array.isArray(sizes)) return [];
    return sizes.map(function (s) {
      return { size: String((s && s.size) == null ? '' : s.size).trim(), qty: Math.max(0, parseInt(s && s.qty, 10) || 0) };
    }).filter(function (s) { return s.size; });
  };

  Data.normProduct = function (p) {
    p = p || {};
    var cmp = p.compare_at_price == null || p.compare_at_price === '' ? null : Number(p.compare_at_price);
    return {
      id: p.id, name: String(p.name || '').trim(), description: String(p.description || ''),
      price: Number(p.price) || 0, compare_at_price: cmp && cmp > Number(p.price) ? cmp : null,
      category: String(p.category || '').trim(),
      colors: Array.isArray(p.colors) ? p.colors.filter(Boolean) : [],
      images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
      sizes: Data.normSizes(p.sizes),
      featured: !!p.featured, active: p.active !== false,
      created_at: p.created_at || new Date().toISOString(), updated_at: p.updated_at || p.created_at || new Date().toISOString()
    };
  };

  Data.normSettings = function (s) {
    var o = {}, k;
    s = s || {};
    for (k in DEFAULT_SETTINGS) o[k] = s[k] == null ? DEFAULT_SETTINGS[k] : s[k];
    o.free_shipping_min = o.free_shipping_min == null || o.free_shipping_min === '' || Number(o.free_shipping_min) <= 0 ? null : Number(o.free_shipping_min);
    return o;
  };

  /* --------------------------------------------------------- estado/estoque */
  Data.stockTotal = function (p) { return (p.sizes || []).reduce(function (a, s) { return a + s.qty; }, 0); };
  Data.soldOut = function (p) { return Data.stockTotal(p) === 0; };
  Data.isLow = function (p) { var t = Data.stockTotal(p); return t > 0 && t <= LOW_STOCK; };
  Data.isNew = function (p) { return Date.now() - new Date(p.created_at).getTime() < NEW_DAYS * 864e5; };
  Data.discount = function (p) {
    return p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
  };

  Data.sizeCompare = function (a, b) {
    function rank(x) {
      x = String(x).trim().toUpperCase();
      var i = SIZE_ORDER.indexOf(x);
      if (i > -1) return [0, i];
      if (/^\d+([.,]\d+)?$/.test(x)) return [1, parseFloat(x.replace(',', '.'))];
      if (/^[UÚ]NICO$/.test(x)) return [3, 0];
      return [2, 0];
    }
    var ra = rank(a), rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || String(a).localeCompare(String(b));
  };

  /* ---------------------------------------------------------------- imagens */
  function toBlob(canvas, type, q) {
    return new Promise(function (res) { canvas.toBlob(function (b) { res(b); }, type, q); });
  }
  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Não consegui abrir essa foto.')); };
      img.src = url;
    });
  }
  /* Reduz a foto no aparelho antes do envio (WebP, com JPEG de reserva). */
  Data.compressImage = function (file, opts) {
    opts = opts || Data.imageOptions;
    if (!file || !/^image\//.test(file.type || '')) return Promise.reject(new Error('Esse arquivo não é uma imagem.'));
    return loadBitmap(file).then(function (bm) {
      var w = bm.width, h = bm.height, k = Math.min(1, opts.max / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      if (!opts.alpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }   // logo (alpha) mantém o fundo transparente
      ctx.drawImage(bm, 0, 0, cw, ch);
      if (bm.close) bm.close();
      return toBlob(c, 'image/webp', opts.quality).then(function (b) {
        if (b && b.type === 'image/webp') return b;
        return opts.alpha ? toBlob(c, 'image/png') : toBlob(c, 'image/jpeg', Math.min(0.92, opts.quality + 0.05));
      });
    });
  };

  /* ------------------------------------------------------------------ erros */
  Data.errorMessage = function (e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    if (/QUOTA/i.test(m)) return 'O navegador ficou sem espaço para fotos neste modo de demonstração.';
    if (/Could not find the (function|table)|schema cache|relation .* does not exist/i.test(m)) return 'O banco ainda não foi preparado: rode o supabase/schema.sql no SQL Editor do Supabase.';
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Sem conexão com a internet. Tente de novo.';
    if (/row-level security|permission denied|not authorized|JWT|Unauthorized/i.test(m)) return 'Sem permissão. Entre de novo no painel.';
    if (/too large|exceeded the maximum/i.test(m)) return 'A foto é grande demais.';
    return m || 'Algo deu errado. Tente de novo.';
  };

  /* --------------------------------------------------------------------- init */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Failed to fetch ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ?demo=1 força a demonstração mesmo com o Supabase configurado (vale na sessão do navegador); ?demo=0 volta ao normal.
     Na loja de um cliente real, ponha DEMO_OVERRIDE: false no config.js. */
  var FORCE_KEY = 'lume_force_demo';
  function demoForced() {
    if (cfg.DEMO_OVERRIDE === false) return false;
    var m = /[?&]demo=([01])(?:&|$)/.exec(location.search || '');
    try {
      if (m) { if (m[1] === '1') sessionStorage.setItem(FORCE_KEY, '1'); else sessionStorage.removeItem(FORCE_KEY); }
      return sessionStorage.getItem(FORCE_KEY) === '1';
    } catch (e) { return !!m && m[1] === '1'; }
  }

  /* A chave que vai no site precisa ser a pública. Recusa secret key e service_role: dão acesso total ao banco. */
  function keyProblem(key) {
    key = String(key || '').trim();
    if (/^sb_secret_/i.test(key)) return true;
    var p = key.split('.');
    if (p.length === 3) {
      try {
        var b64 = p[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        if (JSON.parse(atob(b64)).role === 'service_role') return true;
      } catch (e) { /* não é um JWT legível: segue */ }
    }
    return false;
  }

  var initPromise = null;
  Data.init = function () {
    if (initPromise) return initPromise;
    var hasKeys = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
    Data.demoForced = hasKeys && demoForced();
    var live = hasKeys && !Data.demoForced;
    var boot;
    if (live && keyProblem(cfg.SUPABASE_ANON_KEY)) {
      boot = Promise.reject(new Error('A chave do config.js é secreta (secret key ou service_role) e nunca pode ficar no site. Troque pela publishable key do Supabase.'));
    } else if (live && !/^https?:\/\/[^\s\/]+/i.test(cfg.SUPABASE_URL)) {
      boot = Promise.reject(new Error('A Project URL do config.js precisa começar com https://.'));
    } else {
      boot = live
        ? (window.supabase ? Promise.resolve() : loadScript(SUPABASE_JS)).then(function () { return Data.drivers.supabase(Data); })
        : Promise.resolve(Data.drivers.demo(Data));
    }
    initPromise = boot.then(function (d) {
      Data.mode = live ? 'supabase' : 'demo';
      if (d.imageOptions) Data.imageOptions = d.imageOptions;
      Object.keys(d.api).forEach(function (k) { Data[k] = d.api[k]; });
      return Data;
    });
    initPromise.catch(function () { initPromise = null; });
    return initPromise;
  };

  window.Data = Data;
})();
