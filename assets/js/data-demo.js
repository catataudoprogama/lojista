/* Driver de demonstração: guarda tudo no navegador (localStorage).
   Serve para mostrar o site e o painel ao lojista antes de criar a conta no Supabase. */
Data.drivers.demo = function (Data) {
  'use strict';

  var K = { p: 'lume_demo_products_v1', s: 'lume_demo_settings_v1' };
  var mem = {};

  function get(k) {
    try {
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return mem[k] ? JSON.parse(mem[k]) : null;
    }
  }
  function set(k, v) {
    var j = JSON.stringify(v);
    try {
      localStorage.setItem(k, j);
      mem[k] = j;
    } catch (e) {
      if (e && /quota/i.test(e.name + ' ' + e.message)) throw new Error('QUOTA');
      mem[k] = j;
    }
  }

  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function seedProducts() {
    var seed = window.LUME_SEED || { products: [], settings: {} };
    var list = seed.products.map(function (p) {
      var c = {};
      Object.keys(p).forEach(function (k) { if (k !== 'daysAgo') c[k] = p[k]; });
      c.created_at = new Date(Date.now() - (p.daysAgo || 0) * 864e5).toISOString();
      c.updated_at = c.created_at;
      return Data.normProduct(c);
    });
    set(K.p, list);
    return list;
  }

  function load() { return get(K.p) || seedProducts(); }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var api = {
    listProducts: function (opts) {
      return Promise.resolve().then(function () {
        var l = load().map(Data.normProduct);
        if (!(opts && opts.includeInactive)) l = l.filter(function (p) { return p.active; });
        l.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        return clone(l);
      });
    },
    getProduct: function (id) {
      return Promise.resolve().then(function () {
        var p = load().filter(function (x) { return x.id === id; })[0];
        return p ? clone(Data.normProduct(p)) : null;
      });
    },
    saveProduct: function (p) {
      return Promise.resolve().then(function () {
        var list = load(), n = Data.normProduct(p), now = new Date().toISOString(), i;
        if (n.id) {
          i = list.map(function (x) { return x.id; }).indexOf(n.id);
          if (i > -1) { n.created_at = list[i].created_at; n.updated_at = now; list[i] = n; }
          else { n.created_at = n.created_at || now; list.push(n); }
        } else {
          n.id = uid(); n.created_at = now; n.updated_at = now; list.push(n);
        }
        set(K.p, list);
        return clone(n);
      });
    },
    deleteProduct: function (id) {
      return Promise.resolve().then(function () {
        set(K.p, load().filter(function (x) { return x.id !== id; }));
      });
    },
    uploadImage: function (blob) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { res(r.result); };
        r.onerror = function () { rej(new Error('Não consegui ler a foto.')); };
        r.readAsDataURL(blob);
      });
    },
    getSettings: function () {
      return Promise.resolve().then(function () {
        var s = get(K.s);
        if (!s) { s = Data.normSettings((window.LUME_SEED || {}).settings); set(K.s, s); }
        return Data.normSettings(s);
      });
    },
    saveSettings: function (s) {
      return Promise.resolve().then(function () {
        var n = Data.normSettings(s);
        set(K.s, n);
        return clone(n);
      });
    },
    session: function () { return Promise.resolve({ email: 'demo@lume.moda' }); },
    signIn: function () { return Promise.resolve({ email: 'demo@lume.moda' }); },
    signOut: function () { return Promise.resolve(); },
    resetDemo: function () {
      return Promise.resolve().then(function () {
        try { localStorage.removeItem(K.p); localStorage.removeItem(K.s); } catch (e) { /* ignore */ }
        mem = {};
        seedProducts();
        set(K.s, Data.normSettings((window.LUME_SEED || {}).settings));
      });
    }
  };

  return { imageOptions: { max: 900, quality: 0.75 }, api: api };
};
